/**
 * 账单导入模块
 * 支持支付宝 CSV 和微信支付 Excel 格式
 * 自动清洗数据（剔除退款、内部转账）
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/database.js';
import { SourceType, TransactionType, CleanType } from '@prisma/client';

export const importRouter: Router = Router();

// ============================================
// Multer 文件上传配置
// ============================================

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ============================================
// 类型定义
// ============================================

interface CleanedTransaction {
  date: string;
  type: TransactionType;
  amount: number;
  category: string;
  merchant: string;
  description: string;
  paymentMethod: string;
  cleanType: CleanType | null;
  cleanReason: string | null;
}

// 账户间转账关键词
const INTERNAL_TRANSFER_KEYWORDS = [
  '余额宝', '余利宝', '转入到余利宝', '转入到余额宝',
  '转入余额宝', '转入余利宝', '支付宝转入到',
  '零钱通', '零钱', '我的银行卡', '银行卡转入',
  '转账-自己的', '账户余额',
];

// 充值提现关键词
const DEPOSIT_WITHDRAWAL_KEYWORDS = [
  '充值', '提现', '转入', '转出',
];

// ============================================
// 解析器
// ============================================

/**
 * 解析支付宝 CSV 文件（新版格式）
 */
function parseAlipayCSV(filePath: string): CleanedTransaction[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // 找到表头行
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('交易时间') && lines[i].includes('交易分类')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('无法识别支付宝账单格式');
  }

  const records: CleanedTransaction[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('-')) continue;

    const parts = splitCSVLine(line);
    if (parts.length < 10) continue;

    const transactionTime = parts[0]?.trim() || '';
    const category = parts[1]?.trim() || '';
    const counterparty = parts[2]?.trim() || '';
    const description = parts[4]?.trim() || '';
    const incomeExpense = parts[5]?.trim() || '';
    const amountStr = parts[6]?.trim() || '0';
    const paymentMethod = parts[7]?.trim() || '';
    const status = parts[8]?.trim() || '';

    if (!transactionTime || !amountStr) continue;

    const amount = parseFloat(amountStr) || 0;
    if (amount === 0) continue;

    // 判断清洗类型
    let cleanType: CleanType | null = null;
    let cleanReason: string | null = null;

    // 1. 退款
    if (status.includes('退款') || incomeExpense === '退款') {
      cleanType = CleanType.REFUND;
      cleanReason = `退款记录: ${description || counterparty}`;
    }
    // 2. 账户间转账
    else if (isInternalTransfer(description, counterparty, category)) {
      cleanType = CleanType.INTERNAL_TRANSFER;
      cleanReason = `账户间转账: ${description || counterparty}`;
    }
    // 3. 充值提现
    else if (isDepositWithdrawal(description, counterparty, category)) {
      cleanType = CleanType.DEPOSIT;
      cleanReason = `充值/提现: ${description || counterparty}`;
    }

    // 判断交易类型
    let type: TransactionType;
    if (incomeExpense === '收入') {
      type = TransactionType.INCOME;
    } else if (incomeExpense === '支出') {
      type = TransactionType.EXPENSE;
    } else {
      // 不计收支类跳过
      continue;
    }

    records.push({
      date: transactionTime,
      type,
      amount: Math.abs(amount),
      category,
      merchant: counterparty,
      description: `${description}${paymentMethod ? ` [${paymentMethod}]` : ''}`,
      paymentMethod,
      cleanType,
      cleanReason,
    });
  }

  return records;
}

/**
 * 解析微信支付 Excel 文件
 */
async function parseWechatExcel(filePath: string): Promise<CleanedTransaction[]> {
  const xlsx = require('xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  // 找到表头行
  let headerIndex = -1;
  const headers: Record<string, number> = {};

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.length > 0) {
      const firstCell = String(row[0] || '').trim();
      if (firstCell === '交易时间' || firstCell === '交易单号') {
        headerIndex = i;
        row.forEach((cell: any, idx: number) => {
          const header = String(cell || '').trim();
          if (header) headers[header] = idx;
        });
        break;
      }
    }
  }

  if (headerIndex === -1) {
    throw new Error('无法识别微信支付账单格式');
  }

  const records: CleanedTransaction[] = [];

  for (let i = headerIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const transactionTime = String(row[headers['交易时间']] || '');
    const tradeType = String(row[headers['交易类型']] || '');
    const counterparty = String(row[headers['交易对方']] || '');
    const description = String(row[headers['商品']] || row[headers['商品说明']] || '');
    const incomeExpense = String(row[headers['收/支']] || '');
    const amountStr = String(row[headers['金额']] || row[headers['支付金额']] || '0');
    const paymentMethod = String(row[headers['支付方式']] || '');
    const status = String(row[headers['交易状态']] || '');

    if (!transactionTime) continue;

    const amount = parseFloat(amountStr.replace(/[^\d.-]/g, '')) || 0;
    if (amount === 0) continue;

    // 判断清洗类型
    let cleanType: CleanType | null = null;
    let cleanReason: string | null = null;

    // 1. 退款
    if (status.includes('已退款') || status.includes('退款')) {
      cleanType = CleanType.REFUND;
      cleanReason = `退款记录: ${description || counterparty}`;
    }
    // 2. 转账
    else if (tradeType.includes('转账') || counterparty.includes('转账')) {
      cleanType = CleanType.INTERNAL_TRANSFER;
      cleanReason = `转账: ${counterparty || description}`;
    }
    // 3. 红包
    else if (tradeType.includes('红包') || tradeType.includes('收款')) {
      if (counterparty.includes('微信红包') || description.includes('红包')) {
        cleanType = CleanType.INTERNAL_TRANSFER;
        cleanReason = `红包收发: ${description || counterparty}`;
      }
    }

    // 判断交易类型
    let type: TransactionType;
    if (incomeExpense === '收入' || incomeExpense === '收到') {
      type = TransactionType.INCOME;
    } else if (incomeExpense === '支出' || incomeExpense === '支出') {
      type = TransactionType.EXPENSE;
    } else {
      continue;
    }

    records.push({
      date: transactionTime,
      type,
      amount: Math.abs(amount),
      category: tradeType,
      merchant: counterparty,
      description: `${description}${paymentMethod ? ` [${paymentMethod}]` : ''}`,
      paymentMethod,
      cleanType,
      cleanReason,
    });
  }

  return records;
}

/**
 * CSV 行解析
 */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * 判断是否为账户间转账
 */
function isInternalTransfer(description: string, counterparty: string, category: string): boolean {
  const text = `${description} ${counterparty} ${category}`.toLowerCase();
  for (const keyword of INTERNAL_TRANSFER_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) return true;
  }
  return false;
}

/**
 * 判断是否为充值提现
 */
function isDepositWithdrawal(description: string, counterparty: string, category: string): boolean {
  const text = `${description} ${counterparty} ${category}`.toLowerCase();
  for (const keyword of DEPOSIT_WITHDRAWAL_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) return true;
  }
  return false;
}

/**
 * 日期标准化
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';

  // 处理带时间的日期
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  // 其他格式尝试 Date.parse
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return dateStr;
}

// ============================================
// 内存存储导入会话
// ============================================

interface ImportSession {
  sessionId: string;
  transactions: CleanedTransaction[];
  createdAt: Date;
}

const importSessions = new Map<string, ImportSession>();

// ============================================
// Routes
// ============================================

/**
 * 上传并解析账单文件
 * POST /api/import/upload
 */
importRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: '请上传账单文件' });
    return;
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    let transactions: CleanedTransaction[] = [];

    if (ext === '.csv') {
      transactions = parseAlipayCSV(req.file.path);
    } else if (ext === '.xlsx' || ext === '.xls') {
      transactions = await parseWechatExcel(req.file.path);
    } else {
      res.status(400).json({ success: false, error: '仅支持 CSV/Excel 格式文件' });
      return;
    }

    if (transactions.length === 0) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, error: '未能解析账单内容，请确认文件格式正确' });
      return;
    }

    // 生成会话ID
    const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 保存会话
    importSessions.set(sessionId, {
      sessionId,
      transactions,
      createdAt: new Date(),
    });

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    // 统计
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const cleanedByRefund = transactions.filter(t => t.cleanType === CleanType.REFUND).length;
    const cleanedByTransfer = transactions.filter(t => t.cleanType === CleanType.INTERNAL_TRANSFER).length;
    const cleanedByDeposit = transactions.filter(t => t.cleanType === CleanType.DEPOSIT).length;

    // 时间范围
    const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());

    res.json({
      success: true,
      data: {
        sessionId,
        fileName: req.file.originalname,
        totalRecords: transactions.length,
        income,
        expense,
        stats: {
          total: transactions.length,
          income: transactions.filter(t => t.type === TransactionType.INCOME).length,
          expense: transactions.filter(t => t.type === TransactionType.EXPENSE).length,
          cleanedByRefund,
          cleanedByTransfer,
          cleanedByDeposit,
        },
        dateRange: {
          start: dates.length > 0 ? normalizeDate(dates[0].toISOString()) : '',
          end: dates.length > 0 ? normalizeDate(dates[dates.length - 1].toISOString()) : '',
        },
        preview: transactions.slice(0, 20),
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({ success: false, error: `解析失败：${error instanceof Error ? error.message : '未知错误'}` });
  }
});

/**
 * 预览导入数据
 * POST /api/import/preview
 */
importRouter.post('/preview', async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  const session = importSessions.get(sessionId);
  if (!session) {
    res.status(404).json({ success: false, error: '导入会话已过期，请重新上传' });
    return;
  }

  const income = session.transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const expense = session.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

  res.json({
    success: true,
    data: {
      sessionId,
      transactions: session.transactions,
      stats: {
        total: session.transactions.length,
        income,
        expense,
        cleanedByRefund: session.transactions.filter(t => t.cleanType === CleanType.REFUND).length,
        cleanedByTransfer: session.transactions.filter(t => t.cleanType === CleanType.INTERNAL_TRANSFER).length,
        cleanedByDeposit: session.transactions.filter(t => t.cleanType === CleanType.DEPOSIT).length,
      },
    },
  });
});

/**
 * 确认导入
 * POST /api/import/confirm
 */
importRouter.post('/confirm', async (req: Request, res: Response) => {
  const { sessionId, accountId, importCleaned = false } = req.body;

  const session = importSessions.get(sessionId);
  if (!session) {
    res.status(404).json({ success: false, error: '导入会话已过期，请重新上传' });
    return;
  }

  if (!accountId) {
    res.status(400).json({ success: false, error: '请指定导入账户' });
    return;
  }

  try {
    let importedCount = 0;
    let skippedCount = 0;

    for (const tx of session.transactions) {
      // 跳过已清洗的记录（如果用户选择不导入）
      if (tx.cleanType && !importCleaned) {
        skippedCount++;
        continue;
      }

      await prisma.transaction.create({
        data: {
          accountId,
          type: tx.type,
          amount: tx.amount,
          category: tx.category || null,
          merchant: tx.merchant || null,
          description: tx.description || null,
          transactionDate: new Date(tx.date),
          sourceType: SourceType.IMPORT_ALIPAY,
          isCleaned: tx.cleanType !== null,
          cleanType: tx.cleanType,
          importBatchId: sessionId,
        },
      });

      importedCount++;
    }

    // 删除会话
    importSessions.delete(sessionId);

    res.json({
      success: true,
      data: {
        importedCount,
        skippedCount,
      },
    });
  } catch (error) {
    console.error('Confirm error:', error);
    res.status(500).json({ success: false, error: `导入失败：${error instanceof Error ? error.message : '未知错误'}` });
  }
});

// 清理过期会话（1小时前）
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of importSessions.entries()) {
    if (now - session.createdAt.getTime() > 60 * 60 * 1000) {
      importSessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

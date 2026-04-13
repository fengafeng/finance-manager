/**
 * 账单导入模块
 * 支持支付宝、微信、银行账单的 CSV 格式解析与批量导入
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/database.js';
import { z } from 'zod';

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

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'application/octet-stream',
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) || ext === '.csv' || ext === '.txt') {
    cb(null, true);
  } else {
    cb(new Error('仅支持 CSV/TXT 格式文件'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ============================================
// 类型定义
// ============================================

interface ParsedTransaction {
  date: string;         // 交易日期
  amount: number;        // 金额（正数收入，负数支出）
  type: 'INCOME' | 'EXPENSE';
  merchant: string;     // 交易对方/商家
  description: string;   // 商品说明/备注
  status: 'success' | 'refund'; // 交易状态
  raw: Record<string, string>;   // 原始行数据
}

interface ImportSession {
  id: string;
  sourceType: 'ALIPAY' | 'WECHAT' | 'BANK';
  accountId: string;
  fileName: string;
  transactions: ParsedTransaction[];
  mapping: {
    dateField: string;
    amountField: string;
    merchantField: string;
    descriptionField: string;
  };
  createdAt: Date;
}

// 内存存储导入会话（生产环境建议用 Redis）
const importSessions = new Map<string, ImportSession>();

// ============================================
// 解析器
// ============================================

/**
 * 解析支付宝 CSV 账单
 * 支付宝账单格式（标准 CSV）：
 * 交易时间,交易状态,交易对方,商品说明,金额（元）,收/支,交易类型,资金状态
 */
function parseAlipayCSV(content: string): ParsedTransaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const results: ParsedTransaction[] = [];

  // 找到列索引
  const dateIdx = headers.findIndex(h => h.includes('时间'));
  const statusIdx = headers.findIndex(h => h.includes('状态'));
  const merchantIdx = headers.findIndex(h => h.includes('对方'));
  const descIdx = headers.findIndex(h => h.includes('说明'));
  const amountIdx = headers.findIndex(h => h.includes('金额'));
  const typeIdx = headers.findIndex(h => h === '收/支' || h.includes('收/支'));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 5) continue;

    const date = cols[dateIdx] || '';
    const status = cols[statusIdx] || '';
    const merchant = cols[merchantIdx] || '';
    const description = cols[descIdx] || '';
    const amountStr = cols[amountIdx] || '0';
    const typeStr = typeIdx >= 0 ? cols[typeIdx] : '';

    // 解析金额（去掉元符号和逗号）
    const amount = parseFloat(amountStr.replace(/[¥,，元]/g, '')) || 0;
    if (amount === 0) continue;

    // 判断收/支
    const isIncome = typeStr.includes('收') || (!typeStr.includes('支') && amount > 0);

    // 判断状态（支付宝状态：交易成功、退款）
    const isRefund = status.includes('退款') || status.includes('已退款');

    results.push({
      date: normalizeDate(date),
      amount: Math.abs(amount),
      type: isIncome && !isRefund ? 'INCOME' : 'EXPENSE',
      merchant: cleanString(merchant),
      description: cleanString(description),
      status: isRefund ? 'refund' : 'success',
      raw: Object.fromEntries(headers.map((h, idx) => [h, cols[idx] || ''])),
    });
  }

  return results;
}

/**
 * 解析微信支付 CSV 账单
 * 微信账单格式（标准 CSV）：
 * 交易时间,交易类型,交易对方,商品,收/支,金额（元）,支付方式,状态,备注
 */
function parseWeChatCSV(content: string): ParsedTransaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // 微信 CSV 可能包含 BOM，先去除
  const firstLine = lines[0].replace(/^\uFEFF/, '');
  const headers = parseCSVLine(firstLine);
  const results: ParsedTransaction[] = [];

  // 找到列索引
  const dateIdx = headers.findIndex(h => h.includes('时间'));
  const typeIdx = headers.findIndex(h => h.includes('类型'));
  const merchantIdx = headers.findIndex(h => h.includes('对方'));
  const descIdx = headers.findIndex(h => h.includes('商品'));
  const directionIdx = headers.findIndex(h => h.includes('收/支'));
  const amountIdx = headers.findIndex(h => h.includes('金额'));
  const statusIdx = headers.findIndex(h => h.includes('状态'));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 5) continue;

    const date = cols[dateIdx] || '';
    const transactionType = cols[typeIdx] || '';
    const merchant = cols[merchantIdx] || '';
    const description = cols[descIdx] || '';
    const direction = cols[directionIdx] || '';
    const amountStr = cols[amountIdx] || '0';
    const status = cols[statusIdx] || '';

    const amount = parseFloat(amountStr.replace(/[¥,，元]/g, '')) || 0;
    if (amount === 0) continue;

    // 判断收入/支出
    const isIncome = direction.includes('收入') || (!direction.includes('支出') && amount > 0);

    // 判断退款
    const isRefund = status.includes('已退款') || status.includes('退款');

    // 微信红包等特殊处理（保留给后续功能扩展）
    const _isTransfer = transactionType.includes('转账') || transactionType.includes('红包');

    results.push({
      date: normalizeDate(date),
      amount: Math.abs(amount),
      type: isIncome ? 'INCOME' : 'EXPENSE',
      merchant: cleanString(merchant || transactionType),
      description: cleanString(description),
      status: isRefund ? 'refund' : 'success',
      raw: Object.fromEntries(headers.map((h, idx) => [h, cols[idx] || ''])),
    });
  }

  return results;
}

/**
 * 解析银行 CSV 账单（通用格式）
 * 银行账单格式通常为：
 * 日期,描述,金额,余额,类型（收入/支出）
 */
function parseBankCSV(content: string): ParsedTransaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const results: ParsedTransaction[] = [];

  // 尝试自动识别列
  const dateIdx = headers.findIndex(h =>
    h.includes('日期') || h.includes('时间') || h.includes('Date') || h.includes('Time')
  );
  const descIdx = headers.findIndex(h =>
    h.includes('描述') || h.includes('说明') || h.includes('摘要') ||
    h.includes('Description') || h.includes('Remark') || h.includes('商户')
  );
  const amountIdx = headers.findIndex(h =>
    h.includes('金额') || h.includes('Amount')
  );
  // 余额列（保留给后续扩展）
  const _balanceIdx = headers.findIndex(h =>
    h.includes('余额') || h.includes('Balance')
  );

  if (dateIdx < 0 || amountIdx < 0) {
    throw new Error('无法识别银行账单格式，请确保包含日期和金额列');
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < Math.max(dateIdx, amountIdx) + 1) continue;

    const date = cols[dateIdx] || '';
    const description = descIdx >= 0 ? cols[descIdx] : '';
    const amountStr = cols[amountIdx] || '0';

    // 解析金额（可能带正负号）
    let amount = parseFloat(amountStr.replace(/[¥,，元]/g, '')) || 0;
    if (amount === 0) continue;

    const isIncome = amount > 0;
    amount = Math.abs(amount);

    results.push({
      date: normalizeDate(date),
      amount,
      type: isIncome ? 'INCOME' : 'EXPENSE',
      merchant: '',
      description: cleanString(description),
      status: 'success',
      raw: Object.fromEntries(headers.map((h, idx) => [h, cols[idx] || ''])),
    });
  }

  return results;
}

/**
 * 智能检测账单类型并解析
 */
function parseBillContent(content: string, sourceType: string): ParsedTransaction[] {
  // 检测 BOM
  const cleanContent = content.replace(/^\uFEFF/, '');

  switch (sourceType) {
    case 'ALIPAY':
      return parseAlipayCSV(cleanContent);
    case 'WECHAT':
      return parseWeChatCSV(cleanContent);
    case 'BANK':
      return parseBankCSV(cleanContent);
    default:
      // 智能检测格式
      if (cleanContent.includes('支付宝') || cleanContent.includes('交易时间') && cleanContent.includes('交易对方')) {
        return parseAlipayCSV(cleanContent);
      }
      if (cleanContent.includes('微信') || cleanContent.includes('交易类型') && cleanContent.includes('商品')) {
        return parseWeChatCSV(cleanContent);
      }
      return parseBankCSV(cleanContent);
  }
}

/**
 * 解析 CSV 行（处理引号包裹的字段）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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
 * 标准化日期格式为 YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';

  // 尝试多种日期格式
  const patterns = [
    // 2024-01-15
    /^(\d{4})-(\d{1,2})-(\d{1,2})/,
    // 2024/01/15
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    // 2024年01月15日
    /^(\d{4})年(\d{1,2})月(\d{1,2})日/,
    // 2024.01.15
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})/,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // 尝试 Date.parse
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return dateStr;
}

/**
 * 清理字符串
 */
function cleanString(str: string): string {
  if (!str) return '';
  return str.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// ============================================
// Validation Schemas（预留，未使用手动验证）
// ============================================

// const previewSchema = z.object({ ... });
// const confirmSchema = z.object({ ... });

// ============================================
// Routes
// ============================================

/**
 * 上传账单文件
 * POST /api/import/upload
 * Content-Type: multipart/form-data
 */
importRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: '请上传账单文件' });
    return;
  }

  const { sourceType, accountId } = req.body;

  if (!sourceType || !['ALIPAY', 'WECHAT', 'BANK'].includes(sourceType)) {
    res.status(400).json({ success: false, error: '请选择账单来源类型（ALIPAY/WECHAT/BANK）' });
    return;
  }

  if (!accountId) {
    res.status(400).json({ success: false, error: '请选择导入到的账户' });
    return;
  }

  try {
    // 读取文件内容
    const content = fs.readFileSync(req.file.path, 'utf-8');

    // 解析账单
    const transactions = parseBillContent(content, sourceType);

    if (transactions.length === 0) {
      // 删除临时文件
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: '未能解析账单内容，请确认文件格式正确',
        hint: '支付宝请导出「明细记录」，微信请导出「交易记录」',
      });
      return;
    }

    // 生成会话ID
    const sessionId = `import-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 存储会话
    importSessions.set(sessionId, {
      id: sessionId,
      sourceType: sourceType as 'ALIPAY' | 'WECHAT' | 'BANK',
      accountId,
      fileName: req.file.originalname,
      transactions,
      mapping: {
        dateField: 'date',
        amountField: 'amount',
        merchantField: 'merchant',
        descriptionField: 'description',
      },
      createdAt: new Date(),
    });

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    // 统计
    const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        sessionId,
        fileName: req.file.originalname,
        sourceType,
        accountId,
        totalCount: transactions.length,
        incomeCount: transactions.filter(t => t.type === 'INCOME').length,
        expenseCount: transactions.filter(t => t.type === 'EXPENSE').length,
        refundCount: transactions.filter(t => t.status === 'refund').length,
        incomeTotal: income,
        expenseTotal: expense,
        dateRange: {
          start: transactions[transactions.length - 1]?.date,
          end: transactions[0]?.date,
        },
        preview: transactions.slice(0, 10), // 只返回前10条预览
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    // 删除临时文件
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({
      success: false,
      error: `解析失败：${error instanceof Error ? error.message : '未知错误'}`,
    });
  }
});

/**
 * 预览完整交易列表
 * POST /api/import/preview
 */
importRouter.post('/preview', async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  const session = importSessions.get(sessionId);
  if (!session) {
    res.status(404).json({ success: false, error: '导入会话已过期，请重新上传' });
    return;
  }

  res.json({
    success: true,
    data: {
      sessionId,
      fileName: session.fileName,
      sourceType: session.sourceType,
      totalCount: session.transactions.length,
      transactions: session.transactions,
      accountId: session.accountId,
    },
  });
});

/**
 * 确认导入
 * POST /api/import/confirm
 */
importRouter.post('/confirm', async (req: Request, res: Response) => {
  const { sessionId, accountId, categoryMapping = {}, skipDuplicates = true } = req.body;

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
    // 获取现有交易用于去重检查
    let existingTransactions: Array<{ date: Date; amount: number; merchant: string }> = [];
    if (skipDuplicates) {
      const existing = await prisma.transaction.findMany({
        where: { accountId },
        select: { transactionDate: true, amount: true, merchant: true },
      });
      existingTransactions = existing.map(t => ({
        date: t.transactionDate,
        amount: Number(t.amount),
        merchant: t.merchant || '',
      }));
    }

    // 导入交易
    let successCount = 0;
    let skipCount = 0;
    const importBatchId = `batch-${Date.now()}`;

    for (const tx of session.transactions) {
      // 去重检查
      if (skipDuplicates) {
        const txDate = new Date(tx.date);
        const isDuplicate = existingTransactions.some(e =>
          Math.abs(e.amount - tx.amount) < 0.01 &&
          e.merchant === tx.merchant &&
          Math.abs(e.date.getTime() - txDate.getTime()) < 24 * 60 * 60 * 1000 // 1天内
        );
        if (isDuplicate) {
          skipCount++;
          continue;
        }
      }

      // 自动分类
      const category = categoryMapping[tx.merchant] || autoCategorize(tx.merchant, tx.type);

      await prisma.transaction.create({
        data: {
          accountId,
          type: tx.type,
          amount: tx.amount,
          category,
          merchant: tx.merchant || undefined,
          description: tx.description || undefined,
          transactionDate: new Date(tx.date),
          sourceType: session.sourceType === 'ALIPAY' ? 'IMPORT_ALIPAY' :
                      session.sourceType === 'WECHAT' ? 'IMPORT_WECHAT' : 'IMPORT_BANK',
          sourceRef: importBatchId,
          isCleaned: false,
          cleanType: tx.status === 'refund' ? 'REFUND' : 'NORMAL',
          importBatchId,
        },
      });

      successCount++;
    }

    // 记录导入历史
    await prisma.importRecord.create({
      data: {
        sourceType: session.sourceType === 'ALIPAY' ? 'IMPORT_ALIPAY' :
                    session.sourceType === 'WECHAT' ? 'IMPORT_WECHAT' : 'IMPORT_BANK',
        fileName: session.fileName,
        totalCount: session.transactions.length,
        successCount,
        skipCount,
        status: 'COMPLETED',
      },
    });

    // 清除会话
    importSessions.delete(sessionId);

    res.json({
      success: true,
      data: {
        importBatchId,
        totalCount: session.transactions.length,
        successCount,
        skipCount,
      },
    });
  } catch (error) {
    console.error('Confirm error:', error);
    res.status(500).json({
      success: false,
      error: `导入失败：${error instanceof Error ? error.message : '未知错误'}`,
    });
  }
});

/**
 * 获取导入历史
 * GET /api/import/history
 */
importRouter.get('/history', async (_req: Request, res: Response) => {
  const records = await prisma.importRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({
    success: true,
    data: records.map(r => ({
      ...r,
      successRate: r.totalCount > 0 ? Math.round((r.successCount / r.totalCount) * 100) : 0,
    })),
  });
});

/**
 * 下载导入模板
 * GET /api/import/template/:type
 */
importRouter.get('/template/:type', (req: Request, res: Response) => {
  const { type } = req.params;
  const typeStr = Array.isArray(type) ? type[0] : type;

  const templates: Record<string, { name: string; content: string }> = {
    ALIPAY: {
      name: '支付宝账单导入模板.csv',
      content: '交易时间,交易状态,交易对方,商品说明,金额（元）,收/支,交易类型,资金状态\n2024-01-15 10:30:00,交易成功,某某超市,购物消费,125.50,支出,商户消费,已支出\n2024-01-14 15:20:00,交易成功,公司名称,工资发放,8000.00,收入,工资,已收入',
    },
    WECHAT: {
      name: '微信账单导入模板.csv',
      content: '交易时间,交易类型,交易对方,商品,收/支,金额（元）,支付方式,状态,备注\n2024-01-15 10:30:00,商户消费,某某超市,购物,支出,125.50,零钱,交易成功,\n2024-01-14 15:20:00,转账,朋友名称,转账,支出,200.00,零钱,交易成功,',
    },
    BANK: {
      name: '银行账单导入模板.csv',
      content: '日期,描述,金额,余额\n2024-01-15,购物消费,-125.50,9874.50\n2024-01-14,工资收入,8000.00,10000.00',
    },
  };

  const template = templates[typeStr.toUpperCase()];
  if (!template) {
    res.status(404).json({ success: false, error: '不支持的模板类型' });
    return;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(template.name)}"`);
  res.send('\uFEFF' + template.content); // 添加 BOM 以支持 Excel 正确识别中文
});

/**
 * 自动分类（基于商家名称关键词）
 */
function autoCategorize(merchant: string, type: 'INCOME' | 'EXPENSE'): string {
  if (type === 'INCOME') {
    if (merchant.includes('工资') || merchant.includes('薪资')) return '工资';
    if (merchant.includes('奖金') || merchant.includes('年终奖')) return '奖金';
    if (merchant.includes('理财') || merchant.includes('利息')) return '投资收益';
    return '其他收入';
  }

  // 支出分类
  const merchantLower = merchant.toLowerCase();

  if (merchantLower.includes('餐饮') || merchantLower.includes('美食') ||
      merchantLower.includes('超市') || merchantLower.includes('便利店') ||
      merchantLower.includes('饿了么') || merchantLower.includes('美团')) {
    return '餐饮';
  }

  if (merchantLower.includes('交通') || merchantLower.includes('地铁') ||
      merchantLower.includes('公交') || merchantLower.includes('打车') ||
      merchantLower.includes('停车')) {
    return '交通';
  }

  if (merchantLower.includes('购物') || merchantLower.includes('京东') ||
      merchantLower.includes('淘宝') || merchantLower.includes('天猫') ||
      merchantLower.includes('拼多多')) {
    return '购物';
  }

  if (merchantLower.includes('娱乐') || merchantLower.includes('电影') ||
      merchantLower.includes('游戏') || merchantLower.includes('音乐')) {
    return '娱乐';
  }

  if (merchantLower.includes('医疗') || merchantLower.includes('药店') ||
      merchantLower.includes('医院')) {
    return '医疗';
  }

  if (merchantLower.includes('教育') || merchantLower.includes('培训') ||
      merchantLower.includes('课程')) {
    return '教育';
  }

  if (merchantLower.includes('房租') || merchantLower.includes('物业') ||
      merchantLower.includes('水电')) {
    return '居住';
  }

  if (merchantLower.includes('通讯') || merchantLower.includes('话费') ||
      merchantLower.includes('流量')) {
    return '通讯';
  }

  return '其他';
}

// 清理过期会话（1小时前的会话）
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of importSessions.entries()) {
    if (now - session.createdAt.getTime() > 60 * 60 * 1000) {
      importSessions.delete(id);
    }
  }
}, 10 * 60 * 1000); // 每10分钟清理一次

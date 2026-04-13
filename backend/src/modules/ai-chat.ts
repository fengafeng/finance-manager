/**
 * AI 智能助手路由
 * 支持 DeepSeek、OpenAI 兼容 API、腾讯云混元等多种 AI 模型
 *
 * 切换模型：修改 .env 中的 AI_PROVIDER
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAIAdapter, isAIEnabled } from '../lib/ai/index.js';
import { ChatMessage } from '../lib/ai/types.js';

const prisma = new PrismaClient();
const router: Router = Router();

// 系统提示词 - 财务助手角色
const SYSTEM_PROMPT = `你是一个专业的个人财务助手，帮助用户分析和管理他们的财务状况。

你的职责包括：
1. 回答关于账户余额、交易记录、基金持仓等问题
2. 分析消费趋势和收支情况
3. 提供财务建议和理财规划
4. 解读财务健康评分和资产配置

回答时请注意：
- 使用清晰、简洁的语言
- 如果涉及金额，使用人民币格式（如：¥1,234.56）
- 提供具体的数字和数据支持
- 必要时给出可行的建议

当前用户的数据将在每次查询时提供给你。`;

interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

// 辅助函数：安全转换 Decimal 或其他类型为数字
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

// 构建财务上下文
async function buildFinancialContext(): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // 获取账户信息
  const accounts = await prisma.account.findMany({
    where: { isAsset: true },
    select: { name: true, balance: true, type: true },
  });

  // 获取本月收支
  const thisMonthTransactions = await prisma.transaction.findMany({
    where: { transactionDate: { gte: monthStart } },
    select: { amount: true, type: true },
  });

  // 获取上月收支
  const lastMonthTransactions = await prisma.transaction.findMany({
    where: { transactionDate: { gte: lastMonthStart, lte: lastMonthEnd } },
    select: { amount: true, type: true },
  });

  // 获取基金持仓
  const funds = await prisma.fund.findMany({
    select: { name: true, code: true, shares: true, currentValue: true, profit: true },
  });

  // 获取贷款信息
  const loans = await prisma.loan.findMany({
    select: { name: true, remainingPrincipal: true, monthlyPayment: true },
  });

  // 计算汇总数据
  const totalAssets = accounts.reduce((sum, a) => sum + toNumber(a.balance), 0);
  const thisMonthIncome = thisMonthTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const thisMonthExpense = thisMonthTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const lastMonthIncome = lastMonthTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const lastMonthExpense = lastMonthTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const totalFundValue = funds.reduce((sum, f) => sum + toNumber(f.currentValue), 0);
  const totalFundProfit = funds.reduce((sum, f) => sum + toNumber(f.profit), 0);
  const totalLoanDebt = loans.reduce((sum, l) => sum + toNumber(l.remainingPrincipal), 0);

  // 构建上下文文本
  const context = `【当前财务概况】
当前日期：${now.toLocaleDateString('zh-CN')}
总资产：¥${totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
基金总值：¥${totalFundValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
基金收益：¥${totalFundProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
负债总额：¥${totalLoanDebt.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
净资产：¥${(totalAssets + totalFundValue - totalLoanDebt).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}

【本月收支】
收入：¥${thisMonthIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
支出：¥${thisMonthExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
结余：¥${(thisMonthIncome - thisMonthExpense).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}

【上月收支】
收入：¥${lastMonthIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
支出：¥${lastMonthExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
结余：¥${(lastMonthIncome - lastMonthExpense).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}

【账户列表】
${accounts.map((a) => `- ${a.name} (${a.type}): ¥${toNumber(a.balance).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`).join('\n')}

【基金持仓】
${funds.length > 0 ? funds.map((f) => `- ${f.name}(${f.code}): ${toNumber(f.shares).toFixed(2)}份，市值¥${toNumber(f.currentValue).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}，收益¥${toNumber(f.profit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`).join('\n') : '暂无基金持仓'}

【贷款情况】
${loans.length > 0 ? loans.map((l) => `- ${l.name}: 剩余¥${toNumber(l.remainingPrincipal).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}，月供¥${toNumber(l.monthlyPayment).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`).join('\n') : '暂无贷款'}
`;

  return context;
}

// AI 对话接口
router.post('/chat', async (req, res) => {
  // 检查 AI 是否启用
  if (!isAIEnabled()) {
    res.status(503).json({
      success: false,
      error: 'AI 功能未启用，请检查 .env 中的 AI_PROVIDER 配置',
      hint: '配置示例：AI_PROVIDER=deepseek, DEEPSEEK_API_KEY=sk-xxxxx',
    });
    return;
  }

  const { message, history = [] }: { message: string; history: ChatMessageInput[] } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ success: false, error: '消息不能为空' });
    return;
  }

  try {
    const adapter = getAIAdapter();
    const financialContext = await buildFinancialContext();

    // 构建消息列表（统一格式）
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `以下是用户的财务数据：\n\n${financialContext}` },
    ];

    // 添加历史消息（最多10条）
    for (const msg of history.slice(-10)) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // 添加当前消息
    messages.push({ role: 'user', content: message });

    const response = await adapter.chat(messages, {
      temperature: 0.7,
      topP: 0.9,
    });

    res.json({
      success: true,
      data: {
        reply: response.content,
        usage: response.usage,
        provider: adapter.getProviderInfo().provider,
        model: adapter.getProviderInfo().model,
      },
    });
  } catch (error: unknown) {
    console.error('AI chat error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    res.status(500).json({
      success: false,
      error: `AI服务暂时不可用：${message}`,
    });
  }
});

// ==================== 自然语言创建 ====================

// 自然语言解析系统提示词
const NATURAL_ADD_SYSTEM_PROMPT = `你是一个财务数据解析助手。用户会输入自然语言描述要创建的数据，你需要将其解析为结构化的JSON对象数组。

**你的任务是**：分析用户的自然语言输入，识别其中的每一条数据记录，并提取关键信息。

**重要**：用户可能一次输入多条记录，你需要识别所有记录并返回数组。例如：
- "中行1234余额100，建行5678余额200" → 应返回2条account记录
- "买了50元菜，转了1000" → 应返回1条transaction记录

## 支持创建的数据类型（module字段）

1. **account** - 账户
   解析字段：
   - name: string (必填) - 账户名称，通常是"银行名+卡号尾号"如"中行1234"
   - type: string - 账户类型，可选值：ALIPAY(支付宝)/WECHAT(微信)/BANK(银行)/CREDIT_CARD(信用卡)/CASH(现金)/HUABEI(花呗)/BAITIAO(白条)/DOUYIN_PAY(抖音月付)/OTHER
   - balance: number - 当前余额/已用额度（如"余额92.61元"→ 92.61）
   - cardNumber: string - 卡号（可选，存储尾号，如"1234"或完整卡号）
   - creditLimit: number - 信用额度（信用卡/花呗/白条可选）
   - billingDate: number - 出账日1-31（可选）
   - paymentDueDate: number - 还款日1-31（可选）

2. **transaction** - 交易记录
   解析字段：
   - type: string - 交易类型：INCOME/EXPENSE/TRANSFER/REFUND
   - amount: number (必填) - 金额
   - category: string - 分类名称（自动识别支出/收入分类）
   - description: string - 描述/备注
   - transactionDate: string - 交易日期（ISO格式如2024-01-15），用户说"今天"则用今天，"昨天"则用昨天
   - merchant: string - 商家/来源
   - accountId: string - 账户ID（用户会提到账户名，需要匹配现有账户）

3. **fund** - 投资产品（基金/理财/股票等）
   解析字段：
   - name: string (必填) - 产品名称
   - code: string - 产品代码（可选）
   - type: string - 产品类型：STOCK/BOND/MIXED/MONEY/QDII/WEALTH_MANAGEMENT/STOCK_PRODUCT/INDEX/PENSION/ANNUITY/UNIVERSAL/INSURANCE_CASH/OTHER
   - platform: string - 平台：ALIPAY/WECHAT/TENCENT/JD_FINANCE/BAIDU_WALLET/BANK_APP/FUND_COMPANY/STOCK_BROKER/OTHER
   - cost: number - 投资成本/买入金额（可选）
   - currentValue: number - 当前市值（可选）
   - purchaseDate: string - 买入日期（ISO格式，可选）

4. **loan** - 贷款
   解析字段：
   - name: string (必填) - 贷款名称
   - loanType: string - 贷款类型：MORTGAGE/CAR_LOAN/CREDIT_CARD/HUABEI/BAITIAO/DOUYIN_PAY/OTHER
   - principal: number - 初始本金/总额
   - remainingPrincipal: number - 剩余本金/已用额度
   - annualRate: number - 年化利率（百分比，如5.2表示5.2%）
   - startDate: string - 开始日期（ISO格式）
   - monthlyPayment: number - 月供金额（可选）

## 识别规则

1. 提到"添加账户"、"新建账户"、"开个账户"、"余额" → module: account
2. 提到"花呗"、"白条"、"信用卡"、"抖音月付" → account 且 type 分别为 HUABEI/BAITIAO/CREDIT_CARD/DOUYIN_PAY
3. 提到"银行卡"、"储蓄卡" → account 且 type: BANK
4. 提到"买了"、"定投"、"持有"、"基金"、"理财"、"养老险"、"年金险"、"万能险" → module: fund
5. 提到"交易"、"消费"、"收入"、"支出"、"转账" → module: transaction
6. 提到"房贷"、"车贷"、"贷款"、"借了" → module: loan

## 金额识别规则
- 中文数字如"一万"→ 10000，"五千"→ 5000
- "余额92.61元"、"余额0元"、"余额0.57元" → 提取数字作为 balance
- "尾号1234"、"卡号1234" → cardNumber: "1234"
- 日期：今天/昨天/前天 → 对应日期

## 银行卡识别技巧
- "中行" → name包含"中行"
- "建行" → name包含"建行"
- "农商银行" → name包含"农商银行"
- "工商银行" → name包含"工商银行"
- "招商银行" → name包含"招商银行"
- 卡号尾号如"1980948" → 组合为 "中行1980948"

## 输出格式

**重要**：返回JSON数组，每个元素是一条记录。请严格返回以下JSON格式，不要输出任何其他内容：
\`\`\`json
[
  {
    "module": "account|transaction|fund|loan",
    "confidence": 0.0-1.0,
    "parsed": {
      ...根据module类型填充对应字段...
    },
    "rawText": "这条记录对应的原始文本",
    "ambiguous": false
  }
]
\`\`\`

confidence表示解析置信度，低于0.6时请设置ambiguous: true。

**示例输入**：
"中行 6235736200001980948 余额92.61元，建行 6217001540029439286 余额0，农商银行 6230911099095368020 余额0.57元"

**期望输出**：
\`\`\`json
[
  {
    "module": "account",
    "confidence": 0.95,
    "parsed": {
      "name": "中行1980948",
      "type": "BANK",
      "balance": 92.61,
      "cardNumber": "1980948"
    },
    "rawText": "中行 6235736200001980948 余额92.61元",
    "ambiguous": false
  },
  {
    "module": "account",
    "confidence": 0.95,
    "parsed": {
      "name": "建行29286",
      "type": "BANK",
      "balance": 0,
      "cardNumber": "29286"
    },
    "rawText": "建行 6217001540029439286 余额0",
    "ambiguous": false
  },
  {
    "module": "account",
    "confidence": 0.95,
    "parsed": {
      "name": "农商银行68020",
      "type": "BANK",
      "balance": 0.57,
      "cardNumber": "68020"
    },
    "rawText": "农商银行 6230911099095368020 余额0.57元",
    "ambiguous": false
  }
]
\`\`\`

现在开始解析用户的输入：`;

// 自然语言创建接口
router.post('/natural-add', async (req, res) => {
  if (!isAIEnabled()) {
    res.status(503).json({
      success: false,
      error: 'AI 功能未启用，请检查 .env 中的 AI_PROVIDER 配置',
    });
    return;
  }

  const { text }: { text: string } = req.body;

  if (!text || typeof text !== 'string') {
    res.status(400).json({ success: false, error: '文本内容不能为空' });
    return;
  }

  try {
    const adapter = getAIAdapter();

    const messages: ChatMessage[] = [
      { role: 'system', content: NATURAL_ADD_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ];

    const response = await adapter.chat(messages, {
      temperature: 0.1, // 低温度确保稳定性
      topP: 0.8,
    });

    // 解析 AI 返回的 JSON（可能是数组或单个对象）
    let parsedData: any;
    let items: any[] = [];
    try {
      // 尝试从返回内容中提取 JSON
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        // 返回的是数组
        parsedData = JSON.parse(jsonMatch[0]);
        items = Array.isArray(parsedData) ? parsedData : [parsedData];
      } else {
        // 尝试单个对象
        const objMatch = response.content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          parsedData = JSON.parse(objMatch[0]);
          items = [parsedData];
        } else {
          throw new Error('无法解析返回内容');
        }
      }
    } catch (parseError) {
      res.status(500).json({
        success: false,
        error: 'AI 返回格式解析失败，请重试',
        raw: response.content,
      });
      return;
    }

    // 获取账户列表（用于交易匹配）
    const accounts = await prisma.account.findMany({
      select: { id: true, name: true, type: true },
    });

    // 为每个 item 构建消息
    const itemsWithMessage = items.map(item => ({
      ...item,
      accounts: item.module === 'transaction' ? accounts : [],
      message: buildConfirmationMessage(item),
    }));

    res.json({
      success: true,
      data: {
        items: itemsWithMessage,
        count: itemsWithMessage.length,
        accounts,
      },
    });
  } catch (error: unknown) {
    console.error('Natural add error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    res.status(500).json({
      success: false,
      error: `解析失败：${message}`,
    });
  }
});

// 自然语言确认创建接口
router.post('/natural-create', async (req, res) => {
  if (!isAIEnabled()) {
    res.status(503).json({
      success: false,
      error: 'AI 功能未启用',
    });
    return;
  }

  const { module, data }: { module: string; data: any } = req.body;

  try {
    let result: any;

    switch (module) {
      case 'account': {
        result = await prisma.account.create({
          data: {
            name: data.name,
            type: data.type || 'OTHER',
            balance: data.balance || 0,
            cardNumber: data.cardNumber,
            creditLimit: data.creditLimit,
            availableCredit: data.availableCredit,
            billingDate: data.billingDate,
            paymentDueDate: data.paymentDueDate,
            unpostedBalance: data.unpostedBalance || 0,
          },
        });
        // 同步到贷款
        await syncAccountToLoan(result.id, data);
        break;
      }
      case 'transaction': {
        result = await prisma.transaction.create({
          data: {
            accountId: data.accountId,
            type: data.type || 'EXPENSE',
            amount: data.amount,
            category: data.category,
            description: data.description,
            transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
            merchant: data.merchant,
            sourceType: 'MANUAL',
          },
        });
        break;
      }
      case 'fund': {
        result = await prisma.fund.create({
          data: {
            name: data.name,
            code: data.code || '',
            type: data.type || 'OTHER',
            platform: data.platform || 'OTHER',
            shares: data.shares || 0,
            costPerShare: data.costPerShare || 0,
            currentValue: data.currentValue || 0,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          },
        });
        break;
      }
      case 'loan': {
        result = await prisma.loan.create({
          data: {
            name: data.name,
            loanType: data.loanType || 'OTHER',
            principal: data.principal || 0,
            remainingPrincipal: data.remainingPrincipal || data.principal || 0,
            annualRate: data.annualRate ? data.annualRate / 100 : 0,
            startDate: data.startDate ? new Date(data.startDate) : new Date(),
            monthlyPayment: data.monthlyPayment,
          },
        });
        break;
      }
      default:
        res.status(400).json({ success: false, error: `不支持的模块: ${module}` });
        return;
    }

    res.json({
      success: true,
      data: result,
      message: `✅ ${getModuleName(module)}创建成功！`,
    });
  } catch (error: unknown) {
    console.error('Natural create error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    res.status(500).json({ success: false, error: `创建失败：${message}` });
  }
});

// 辅助函数：根据账户类型同步到贷款
async function syncAccountToLoan(accountId: string, data: any) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return;

  const creditTypes = ['CREDIT_CARD', 'HUABEI', 'BAITIAO', 'DOUYIN_PAY'];
  if (!creditTypes.includes(account.type)) return;

  const usedCredit = Math.abs(data.balance ?? account.balance);
  const creditLimit = data.creditLimit ?? account.creditLimit;
  const availableCredit = creditLimit ? Number(creditLimit) - usedCredit : null;

  const loanData: any = {
    name: data.name ?? account.name,
    loanType: account.type as any,
    principal: creditLimit ?? usedCredit,
    remainingPrincipal: usedCredit,
    annualRate: 0,
    startDate: account.createdAt,
    endDate: new Date('2099-12-31'),
    billingDate: data.billingDate ?? account.billingDate,
    paymentDueDate: data.paymentDueDate ?? account.paymentDueDate,
    creditLimit: creditLimit,
    availableCredit: availableCredit,
    linkedCreditAccountId: accountId,
  };

  const existing = await prisma.loan.findFirst({ where: { linkedCreditAccountId: accountId } });
  if (existing) {
    await prisma.loan.update({ where: { id: existing.id }, data: loanData });
  } else {
    await prisma.loan.create({ data: loanData });
  }
}

// 辅助函数：生成确认消息
function buildConfirmationMessage(parsed: any): string {
  const lines: string[] = [];

  switch (parsed.module) {
    case 'account':
      lines.push(`📋 账户：${parsed.parsed?.name || '未知'}`);
      if (parsed.parsed?.type) lines.push(`类型：${parsed.parsed.type}`);
      if (parsed.parsed?.balance) lines.push(`余额：¥${parsed.parsed.balance}`);
      if (parsed.parsed?.creditLimit) lines.push(`额度：¥${parsed.parsed.creditLimit}`);
      if (parsed.parsed?.cardNumber) lines.push(`卡号：尾号${parsed.parsed.cardNumber}`);
      break;
    case 'transaction':
      lines.push(`💰 交易：¥${parsed.parsed?.amount || 0}`);
      lines.push(`类型：${parsed.parsed?.type === 'INCOME' ? '收入' : parsed.parsed?.type === 'EXPENSE' ? '支出' : parsed.parsed?.type}`);
      if (parsed.parsed?.description) lines.push(`描述：${parsed.parsed.description}`);
      if (parsed.parsed?.transactionDate) lines.push(`日期：${parsed.parsed.transactionDate}`);
      break;
    case 'fund':
      lines.push(`📊 投资：${parsed.parsed?.name || '未知'}`);
      if (parsed.parsed?.type) lines.push(`类型：${parsed.parsed.type}`);
      if (parsed.parsed?.shares) lines.push(`份额：${parsed.parsed.shares}`);
      if (parsed.parsed?.currentValue) lines.push(`市值：¥${parsed.parsed.currentValue}`);
      break;
    case 'loan':
      lines.push(`🏦 贷款：${parsed.parsed?.name || '未知'}`);
      if (parsed.parsed?.loanType) lines.push(`类型：${parsed.parsed.loanType}`);
      if (parsed.parsed?.principal) lines.push(`本金：¥${parsed.parsed.principal}`);
      if (parsed.parsed?.annualRate) lines.push(`利率：${parsed.parsed.annualRate}%`);
      break;
  }

  return lines.join('\n');
}

function getModuleName(module: string): string {
  const map: Record<string, string> = {
    account: '账户',
    transaction: '交易',
    fund: '投资',
    loan: '贷款',
  };
  return map[module] || module;
}

// 快捷查询接口
router.post('/quick-query', async (req, res) => {
  if (!isAIEnabled()) {
    res.status(503).json({
      success: false,
      error: 'AI 功能未启用，请检查 .env 中的 AI_PROVIDER 配置',
    });
    return;
  }

  const { queryType }: { queryType: string } = req.body;

  const quickQueries: Record<string, string> = {
    balance: '我目前的总资产是多少？各账户余额分别是多少？',
    month_summary: '这个月的收支情况如何？和上个月相比有什么变化？',
    fund_status: '我的基金持仓情况如何？收益怎么样？',
    loan_status: '我目前的贷款情况如何？还需要还多少？',
    savings_rate: '我的储蓄率是多少？有什么建议？',
    expense_analysis: '分析一下我的消费情况，有什么可以优化的地方？',
  };

  const message = quickQueries[queryType] || '请介绍一下我的财务状况';

  try {
    const adapter = getAIAdapter();
    const financialContext = await buildFinancialContext();

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `以下是用户的财务数据：\n\n${financialContext}` },
      { role: 'user', content: message },
    ];

    const response = await adapter.chat(messages, {
      temperature: 0.5,
      topP: 0.8,
    });

    res.json({
      success: true,
      data: {
        queryType,
        reply: response.content,
        provider: adapter.getProviderInfo().provider,
        model: adapter.getProviderInfo().model,
      },
    });
  } catch (error: unknown) {
    console.error('Quick query error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    res.status(500).json({
      success: false,
      error: `查询失败：${message}`,
    });
  }
});

// 获取当前 AI 配置状态
router.get('/status', (_req, res) => {
  const adapter = getAIAdapter();
  const info = adapter.getProviderInfo();
  res.json({
    success: true,
    data: {
      enabled: adapter.isEnabled(),
      provider: info.provider,
      model: info.model,
      message: adapter.isEnabled()
        ? `当前使用 ${info.provider} (${info.model || 'default'})`
        : 'AI 功能未启用，请在 .env 中配置 AI_PROVIDER',
    },
  });
});

export const aiChatRouter: Router = router;

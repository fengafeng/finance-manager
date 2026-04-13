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

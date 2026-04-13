import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'

export const healthRouter: Router = Router()

// ============================================
// Helper Functions
// ============================================

// 计算储蓄率得分
async function calculateSavingsRate(): Promise<{ score: number; value: number; details: any }> {
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        transactionDate: { gte: threeMonthsAgo },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        transactionDate: { gte: threeMonthsAgo },
      },
      _sum: { amount: true },
    }),
  ])

  const totalIncome = Number(income._sum.amount || 0)
  const totalExpense = Number(expense._sum.amount || 0)
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0

  // 储蓄率 >= 30% 得满分，每降低1%扣2分
  let score = Math.max(0, Math.min(100, (savingsRate - 30) * 2 + 100))
  if (savingsRate < 0) score = 0

  return {
    score: Math.round(score),
    value: savingsRate,
    details: {
      totalIncome,
      totalExpense,
      monthlyAverage: {
        income: totalIncome / 3,
        expense: totalExpense / 3,
      },
    },
  }
}

// 计算应急金覆盖率得分
async function calculateEmergencyFund(): Promise<{ score: number; value: number; details: any }> {
  // 高流动性资产 = 现金账户 + 货币基金
  const cashAccounts = await prisma.account.findMany({
    where: {
      isArchived: false,
      isAsset: true,
      type: { in: ['CASH', 'ALIPAY', 'WECHAT', 'BANK'] },
    },
    select: { balance: true },
  })

  const moneyFunds = await prisma.fund.findMany({
    where: { type: 'MONEY' },
    select: { currentValue: true },
  })

  const liquidAssets = 
    cashAccounts.reduce((sum, a) => sum + Number(a.balance), 0) +
    moneyFunds.reduce((sum, f) => sum + Number(f.currentValue), 0)

  // 月均支出
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const expense = await prisma.transaction.aggregate({
    where: {
      type: 'EXPENSE',
      transactionDate: { gte: oneMonthAgo },
    },
    _sum: { amount: true },
  })

  const monthlyExpense = Number(expense._sum.amount || 0)
  const coverageMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : 0

  // 覆盖 >= 6个月得满分，每少1个月扣15分
  let score = Math.max(0, Math.min(100, (coverageMonths - 6) * 15 + 100))
  if (coverageMonths < 1) score = 0

  return {
    score: Math.round(score),
    value: coverageMonths,
    details: {
      liquidAssets,
      monthlyExpense,
    },
  }
}

// 计算负债收入比得分
async function calculateDebtRatio(): Promise<{ score: number; value: number; details: any }> {
  // 月还款总额
  const loans = await prisma.loan.findMany({
    select: { monthlyPayment: true, remainingPrincipal: true },
  })
  const monthlyRepayment = loans.reduce((sum, l) => sum + Number(l.monthlyPayment || 0), 0)

  // 月均收入
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const income = await prisma.transaction.aggregate({
    where: {
      type: 'INCOME',
      transactionDate: { gte: oneMonthAgo },
    },
    _sum: { amount: true },
  })

  const monthlyIncome = Number(income._sum.amount || 0)
  const debtRatio = monthlyIncome > 0 ? (monthlyRepayment / monthlyIncome) * 100 : 0

  // 负债比 <= 40% 得满分，每增加1%扣2分
  let score = Math.max(0, Math.min(100, 100 - (debtRatio - 40) * 2))
  if (debtRatio > 40) score = Math.max(0, 100 - (debtRatio - 40) * 2)

  return {
    score: Math.round(score),
    value: debtRatio,
    details: {
      monthlyRepayment,
      monthlyIncome,
      loanCount: loans.length,
    },
  }
}

// 计算预算执行率得分
async function calculateBudgetExecution(): Promise<{ score: number; value: number; details: any }> {
  // 简化版：假设预算为收入的80%
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        transactionDate: { gte: oneMonthAgo },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        transactionDate: { gte: oneMonthAgo },
      },
      _sum: { amount: true },
    }),
  ])

  const monthlyIncome = Number(income._sum.amount || 0)
  const monthlyExpense = Number(expense._sum.amount || 0)
  const budget = monthlyIncome * 0.8
  const executionRate = budget > 0 ? (monthlyExpense / budget) * 100 : 0

  // 执行率 80-100% 得满分，偏离越多扣分越多
  let score = 100
  if (executionRate < 80) {
    score = Math.max(0, 100 - (80 - executionRate) * 1.5)
  } else if (executionRate > 100) {
    score = Math.max(0, 100 - (executionRate - 100) * 2)
  }

  return {
    score: Math.round(score),
    value: executionRate,
    details: {
      budget,
      actual: monthlyExpense,
    },
  }
}

// 计算投资波动率得分（简化版）
async function calculateInvestmentVolatility(): Promise<{ score: number; value: number; details: any }> {
  // 简化版：基于基金收益率波动
  const funds = await prisma.fund.findMany({
    select: { profitRate: true, currentValue: true },
  })

  if (funds.length === 0) {
    return { score: 100, value: 0, details: { message: '暂无投资数据' } }
  }

  // 计算加权波动率（简化）
  const totalValue = funds.reduce((sum, f) => sum + Number(f.currentValue), 0)
  const weightedVolatility = funds.reduce((sum, f) => {
    const weight = Number(f.currentValue) / totalValue
    return sum + Math.abs(Number(f.profitRate)) * weight
  }, 0)

  // 波动率 <= 15% 得满分，每增加1%扣3分
  const score = Math.max(0, Math.min(100, 100 - (weightedVolatility - 15) * 3))

  return {
    score: Math.round(score),
    value: weightedVolatility,
    details: {
      fundCount: funds.length,
      totalValue,
    },
  }
}

// 生成综合健康报告
async function generateHealthReport() {
  const [savingsRate, emergencyFund, debtRatio, budgetExecution, investmentVolatility] = 
    await Promise.all([
      calculateSavingsRate(),
      calculateEmergencyFund(),
      calculateDebtRatio(),
      calculateBudgetExecution(),
      calculateInvestmentVolatility(),
    ])

  // 权重计算综合得分
  const weights = {
    savingsRate: 0.25,
    emergencyFund: 0.25,
    debtRatio: 0.20,
    budgetExecution: 0.15,
    investmentVolatility: 0.15,
  }

  const totalScore = 
    savingsRate.score * weights.savingsRate +
    emergencyFund.score * weights.emergencyFund +
    debtRatio.score * weights.debtRatio +
    budgetExecution.score * weights.budgetExecution +
    investmentVolatility.score * weights.investmentVolatility

  // 生成建议
  const suggestions: string[] = []
  
  if (savingsRate.score < 60) {
    suggestions.push('储蓄率偏低，建议控制非必要支出，目标储蓄率达到30%以上')
  }
  if (emergencyFund.score < 60) {
    suggestions.push('应急资金不足，建议储备至少6个月的生活费用')
  }
  if (debtRatio.score < 60) {
    suggestions.push('负债率偏高，建议优先偿还高息贷款，控制月还款在收入的40%以内')
  }
  if (budgetExecution.score < 60) {
    suggestions.push('预算执行情况不理想，建议设定明确的月度预算目标')
  }
  if (investmentVolatility.score < 60) {
    suggestions.push('投资组合波动较大，建议适当配置稳健型资产')
  }
  if (suggestions.length === 0) {
    suggestions.push('财务状况良好，继续保持！')
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    dimensionScores: {
      savingsRate: { ...savingsRate, weight: weights.savingsRate },
      emergencyFund: { ...emergencyFund, weight: weights.emergencyFund },
      debtRatio: { ...debtRatio, weight: weights.debtRatio },
      budgetExecution: { ...budgetExecution, weight: weights.budgetExecution },
      investmentVolatility: { ...investmentVolatility, weight: weights.investmentVolatility },
    },
    suggestions,
  }
}

// ============================================
// Routes
// ============================================

/**
 * 获取最新健康报告
 */
healthRouter.post('/latest', async (_req: Request, res: Response) => {
  const report = await prisma.healthReport.findFirst({
    orderBy: { reportDate: 'desc' },
  })

  if (report) {
    res.json({
      success: true,
      data: {
        ...report,
        totalScore: Number(report.totalScore),
        dimensionScores: report.dimensionScores ? JSON.parse(report.dimensionScores) : null,
        suggestions: report.suggestions ? JSON.parse(report.suggestions) : null,
      },
    })
  } else {
    // 如果没有报告，生成一个
    const newReport = await generateHealthReport()
    res.json({
      success: true,
      data: {
        reportDate: new Date(),
        ...newReport,
        isNew: true,
      },
    })
  }
})

/**
 * 手动生成健康报告
 */
healthRouter.post('/generate', async (_req: Request, res: Response) => {
  const report = await generateHealthReport()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const savedReport = await prisma.healthReport.upsert({
    where: { reportDate: today },
    create: {
      reportDate: today,
      totalScore: report.totalScore,
      dimensionScores: JSON.stringify(report.dimensionScores),
      suggestions: JSON.stringify(report.suggestions),
    },
    update: {
      totalScore: report.totalScore,
      dimensionScores: JSON.stringify(report.dimensionScores),
      suggestions: JSON.stringify(report.suggestions),
    },
  })

  res.json({
    success: true,
    data: {
      ...savedReport,
      totalScore: Number(savedReport.totalScore),
      dimensionScores: report.dimensionScores,
      suggestions: report.suggestions,
    },
  })
})

/**
 * 获取历史健康报告
 */
healthRouter.post('/history', async (req: Request, res: Response) => {
  const { limit = 12 } = req.body

  const reports = await prisma.healthReport.findMany({
    orderBy: { reportDate: 'desc' },
    take: limit,
  })

  res.json({
    success: true,
    data: reports.map(r => ({
      ...r,
      totalScore: Number(r.totalScore),
      dimensionScores: r.dimensionScores ? JSON.parse(r.dimensionScores) : null,
    })),
  })
})

import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const reportRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const dateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
})

// ============================================
// Routes
// ============================================

/**
 * 资产概览
 */
reportRouter.post('/overview', async (_req: Request, res: Response) => {
  // 账户汇总
  const accounts = await prisma.account.findMany({
    where: { isArchived: false },
    select: { balance: true, type: true },
  })

  const totalAssets = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

  // 基金汇总
  const funds = await prisma.fund.findMany({
    select: { currentValue: true, profit: true },
  })

  const totalFundValue = funds.reduce((sum, f) => sum + Number(f.currentValue), 0)
  const totalFundProfit = funds.reduce((sum, f) => sum + Number(f.profit), 0)

  // 本月收支
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [monthIncome, monthExpense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        transactionDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        transactionDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
  ])

  // 总资产趋势（最近6个月）
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const monthlyData = await prisma.$queryRaw<{ month: Date; income: bigint; expense: bigint }[]>`
    SELECT 
      DATE_TRUNC('month', transaction_date) as month,
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
    FROM transactions
    WHERE transaction_date >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', transaction_date)
    ORDER BY month
  `

  res.json({
    success: true,
    data: {
      totalAssets,
      totalFundValue,
      totalFundProfit,
      totalWealth: totalAssets + totalFundValue,
      accountCount: accounts.length,
      fundCount: funds.length,
      month: {
        income: Number(monthIncome._sum.amount || 0),
        expense: Number(monthExpense._sum.amount || 0),
        balance: Number(monthIncome._sum.amount || 0) - Number(monthExpense._sum.amount || 0),
      },
      monthlyTrend: monthlyData.map(d => ({
        month: d.month,
        income: Number(d.income),
        expense: Number(d.expense),
      })),
    },
  })
})

/**
 * 收支报表
 */
reportRouter.post('/income-expense', validate(dateRangeSchema), async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body

  const start = new Date(startDate)
  const end = new Date(endDate)

  // 按日期分组统计
  const dailyData = await prisma.$queryRaw<{ date: Date; income: bigint; expense: bigint }[]>`
    SELECT 
      DATE(transaction_date) as date,
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
    FROM transactions
    WHERE transaction_date >= ${start} AND transaction_date <= ${end}
    GROUP BY DATE(transaction_date)
    ORDER BY date
  `

  // 总计
  const [totalIncome, totalExpense] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: 'INCOME', transactionDate: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: 'EXPENSE', transactionDate: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ])

  res.json({
    success: true,
    data: {
      daily: dailyData.map(d => ({
        date: d.date,
        income: Number(d.income),
        expense: Number(d.expense),
      })),
      total: {
        income: Number(totalIncome._sum.amount || 0),
        expense: Number(totalExpense._sum.amount || 0),
        balance: Number(totalIncome._sum.amount || 0) - Number(totalExpense._sum.amount || 0),
      },
    },
  })
})

/**
 * 分类分析
 */
reportRouter.post('/category-analysis', validate(dateRangeSchema), async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body

  const start = new Date(startDate)
  const end = new Date(endDate)

  const categoryData = await prisma.transaction.groupBy({
    by: ['category', 'type'],
    where: {
      transactionDate: { gte: start, lte: end },
      category: { not: null },
    },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
  })

  res.json({
    success: true,
    data: categoryData.map(item => ({
      category: item.category,
      type: item.type,
      amount: Number(item._sum.amount || 0),
      count: item._count,
    })),
  })
})

/**
 * 基金收益报表
 */
reportRouter.post('/fund-performance', async (_req: Request, res: Response) => {
  const funds = await prisma.fund.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      shares: true,
      costPerShare: true,
      currentValue: true,
      profit: true,
      profitRate: true,
    },
    orderBy: { profitRate: 'desc' },
  })

  const totalValue = funds.reduce((sum, f) => sum + Number(f.currentValue), 0)
  const totalProfit = funds.reduce((sum, f) => sum + Number(f.profit), 0)
  const totalCost = totalValue - totalProfit

  res.json({
    success: true,
    data: {
      funds: funds.map(f => ({
        ...f,
        shares: Number(f.shares),
        costPerShare: Number(f.costPerShare),
        currentValue: Number(f.currentValue),
        profit: Number(f.profit),
        profitRate: Number(f.profitRate),
      })),
      summary: {
        totalValue,
        totalProfit,
        totalCost,
        profitRate: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
      },
    },
  })
})

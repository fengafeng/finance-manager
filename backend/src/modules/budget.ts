/**
 * 月度预算管理路由
 */

import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const budgetRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const createBudgetSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, '格式：2026-04'),
  expectedIncome: z.number().min(0).default(0),
  expectedExpense: z.number().min(0).default(0),
  actualIncome: z.number().min(0).optional(),
  actualExpense: z.number().min(0).optional(),
  remark: z.string().optional(),
})

// ============================================
// Helper Functions
// ============================================

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber()
  }
  return Number(value)
}

// ============================================
// Routes
// ============================================

/**
 * 获取指定月份的预算
 */
budgetRouter.post('/get', async (req: Request, res: Response) => {
  const { yearMonth } = req.body

  const budget = await prisma.budget.findUnique({
    where: { yearMonth },
  })

  res.json({
    success: true,
    data: budget ? {
      ...budget,
      expectedIncome: toNumber(budget.expectedIncome),
      expectedExpense: toNumber(budget.expectedExpense),
      actualIncome: budget.actualIncome ? toNumber(budget.actualIncome) : null,
      actualExpense: budget.actualExpense ? toNumber(budget.actualExpense) : null,
    } : null,
  })
})

/**
 * 获取最近的预算列表
 */
budgetRouter.post('/list', async (req: Request, res: Response) => {
  const { limit = 12 } = req.body

  const budgets = await prisma.budget.findMany({
    orderBy: { yearMonth: 'desc' },
    take: limit,
  })

  res.json({
    success: true,
    data: budgets.map(b => ({
      ...b,
      expectedIncome: toNumber(b.expectedIncome),
      expectedExpense: toNumber(b.expectedExpense),
      actualIncome: b.actualIncome ? toNumber(b.actualIncome) : null,
      actualExpense: b.actualExpense ? toNumber(b.actualExpense) : null,
    })),
  })
})

/**
 * 创建或更新月度预算
 */
budgetRouter.post('/upsert', validate(createBudgetSchema), async (req: Request, res: Response) => {
  const data = req.body

  const budget = await prisma.budget.upsert({
    where: { yearMonth: data.yearMonth },
    create: {
      yearMonth: data.yearMonth,
      expectedIncome: data.expectedIncome ?? 0,
      expectedExpense: data.expectedExpense ?? 0,
      actualIncome: data.actualIncome,
      actualExpense: data.actualExpense,
      remark: data.remark,
    },
    update: {
      expectedIncome: data.expectedIncome ?? 0,
      expectedExpense: data.expectedExpense ?? 0,
      actualIncome: data.actualIncome,
      actualExpense: data.actualExpense,
      remark: data.remark,
    },
  })

  res.json({
    success: true,
    data: {
      ...budget,
      expectedIncome: toNumber(budget.expectedIncome),
      expectedExpense: toNumber(budget.expectedExpense),
      actualIncome: budget.actualIncome ? toNumber(budget.actualIncome) : null,
      actualExpense: budget.actualExpense ? toNumber(budget.actualExpense) : null,
    },
  })
})

/**
 * 删除月度预算
 */
budgetRouter.post('/delete', async (req: Request, res: Response) => {
  const { yearMonth } = req.body

  await prisma.budget.delete({
    where: { yearMonth },
  })

  res.json({ success: true })
})

/**
 * 同步实际收支到预算（根据当月交易记录自动填入）
 */
budgetRouter.post('/sync-actual', async (req: Request, res: Response) => {
  const { yearMonth } = req.body

  // 解析年月
  const [year, month] = yearMonth.split('-').map(Number)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59)

  // 查询当月实际收支
  const [income, expense] = await Promise.all([
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

  const actualIncome = toNumber(income._sum.amount)
  const actualExpense = toNumber(expense._sum.amount)

  const budget = await prisma.budget.upsert({
    where: { yearMonth },
    create: {
      yearMonth,
      expectedIncome: 0,
      expectedExpense: 0,
      actualIncome,
      actualExpense,
    },
    update: {
      actualIncome,
      actualExpense,
    },
  })

  res.json({
    success: true,
    data: {
      ...budget,
      expectedIncome: toNumber(budget.expectedIncome),
      expectedExpense: toNumber(budget.expectedExpense),
      actualIncome: toNumber(budget.actualIncome),
      actualExpense: toNumber(budget.actualExpense),
    },
  })
})

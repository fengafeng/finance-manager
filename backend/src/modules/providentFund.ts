/**
 * 公积金账户管理路由
 */

import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const providentFundRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const createPFSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  accountNumber: z.string().optional(),
  balance: z.number().min(0),
  monthlyContribution: z.number().min(0).optional().default(0),
  personalContribution: z.number().min(0).optional(),
  employerContribution: z.number().min(0).optional(),
  interestRate: z.number().min(0).optional(),
  accountStatus: z.string().optional().default('ACTIVE'),
  includeNetWorth: z.boolean().optional().default(true),
  remark: z.string().optional(),
})

const updatePFSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  accountNumber: z.string().optional().nullable(),
  balance: z.number().min(0).optional(),
  monthlyContribution: z.number().min(0).optional(),
  personalContribution: z.number().min(0).optional().nullable(),
  employerContribution: z.number().min(0).optional().nullable(),
  interestRate: z.number().min(0).optional().nullable(),
  accountStatus: z.string().optional(),
  includeNetWorth: z.boolean().optional(),
  remark: z.string().optional().nullable(),
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
 * 获取公积金账户列表
 */
providentFundRouter.post('/list', async (_req: Request, res: Response) => {
  const funds = await prisma.providentFund.findMany({
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: funds.map(f => ({
      ...f,
      balance: toNumber(f.balance),
      monthlyContribution: toNumber(f.monthlyContribution),
      personalContribution: f.personalContribution ? toNumber(f.personalContribution) : null,
      employerContribution: f.employerContribution ? toNumber(f.employerContribution) : null,
      interestRate: f.interestRate ? toNumber(f.interestRate) : null,
    })),
  })
})

/**
 * 获取单个公积金账户
 */
providentFundRouter.post('/get', async (req: Request, res: Response) => {
  const { id } = req.body

  const fund = await prisma.providentFund.findUnique({
    where: { id },
  })

  if (!fund) {
    res.status(404).json({ success: false, error: '公积金账户未找到' })
    return
  }

  res.json({
    success: true,
    data: {
      ...fund,
      balance: toNumber(fund.balance),
      monthlyContribution: toNumber(fund.monthlyContribution),
      personalContribution: fund.personalContribution ? toNumber(fund.personalContribution) : null,
      employerContribution: fund.employerContribution ? toNumber(fund.employerContribution) : null,
      interestRate: fund.interestRate ? toNumber(fund.interestRate) : null,
    },
  })
})

/**
 * 创建公积金账户
 */
providentFundRouter.post('/create', validate(createPFSchema), async (req: Request, res: Response) => {
  const data = req.body

  const fund = await prisma.providentFund.create({
    data: {
      name: data.name,
      city: data.city,
      accountNumber: data.accountNumber,
      balance: data.balance ?? 0,
      monthlyContribution: data.monthlyContribution ?? 0,
      personalContribution: data.personalContribution,
      employerContribution: data.employerContribution,
      interestRate: data.interestRate,
      accountStatus: data.accountStatus ?? 'ACTIVE',
      includeNetWorth: data.includeNetWorth ?? true,
      remark: data.remark,
    },
  })

  res.json({
    success: true,
    data: {
      ...fund,
      balance: toNumber(fund.balance),
      monthlyContribution: toNumber(fund.monthlyContribution),
      personalContribution: fund.personalContribution ? toNumber(fund.personalContribution) : null,
      employerContribution: fund.employerContribution ? toNumber(fund.employerContribution) : null,
      interestRate: fund.interestRate ? toNumber(fund.interestRate) : null,
    },
  })
})

/**
 * 更新公积金账户
 */
providentFundRouter.post('/update', validate(updatePFSchema), async (req: Request, res: Response) => {
  const { id, ...data } = req.body

  const fund = await prisma.providentFund.update({
    where: { id },
    data: {
      ...data,
      lastUpdated: new Date(),
    },
  })

  res.json({
    success: true,
    data: {
      ...fund,
      balance: toNumber(fund.balance),
      monthlyContribution: toNumber(fund.monthlyContribution),
      personalContribution: fund.personalContribution ? toNumber(fund.personalContribution) : null,
      employerContribution: fund.employerContribution ? toNumber(fund.employerContribution) : null,
      interestRate: fund.interestRate ? toNumber(fund.interestRate) : null,
    },
  })
})

/**
 * 删除公积金账户
 */
providentFundRouter.post('/delete', async (req: Request, res: Response) => {
  const { id } = req.body

  await prisma.providentFund.delete({
    where: { id },
  })

  res.json({ success: true })
})

/**
 * 更新余额（快捷操作）
 */
providentFundRouter.post('/update-balance', async (req: Request, res: Response) => {
  const { id, balance } = req.body

  const fund = await prisma.providentFund.update({
    where: { id },
    data: {
      balance,
      lastUpdated: new Date(),
    },
  })

  res.json({
    success: true,
    data: {
      ...fund,
      balance: toNumber(fund.balance),
      monthlyContribution: toNumber(fund.monthlyContribution),
      personalContribution: fund.personalContribution ? toNumber(fund.personalContribution) : null,
      employerContribution: fund.employerContribution ? toNumber(fund.employerContribution) : null,
      interestRate: fund.interestRate ? toNumber(fund.interestRate) : null,
    },
  })
})

/**
 * 获取公积金汇总（纳入净资产计算）
 */
providentFundRouter.post('/summary', async (_req: Request, res: Response) => {
  const funds = await prisma.providentFund.findMany({
    where: { includeNetWorth: true },
  })

  const totalBalance = funds.reduce((sum, f) => sum + toNumber(f.balance), 0)
  const totalMonthly = funds.reduce((sum, f) => sum + toNumber(f.monthlyContribution), 0)

  // 按城市分组
  const byCity: Record<string, { balance: number; monthlyContribution: number; count: number }> = {}
  for (const f of funds) {
    if (!byCity[f.city]) byCity[f.city] = { balance: 0, monthlyContribution: 0, count: 0 }
    byCity[f.city].balance += toNumber(f.balance)
    byCity[f.city].monthlyContribution += toNumber(f.monthlyContribution)
    byCity[f.city].count++
  }

  res.json({
    success: true,
    data: {
      totalBalance,
      totalMonthlyContribution: totalMonthly,
      accountCount: funds.length,
      byCity,
    },
  })
})

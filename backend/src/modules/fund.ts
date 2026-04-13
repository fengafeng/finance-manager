import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const fundRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const createFundSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  type: z.enum(['STOCK', 'BOND', 'MIXED', 'MONEY', 'QDII', 'OTHER']).default('MIXED'),
  shares: z.number().positive().optional().default(0),
  costPerShare: z.number().positive().optional().default(0),
  currentValue: z.number().optional().default(0),
  purchaseDate: z.string().optional(),
  remark: z.string().optional(),
})

const updateFundSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['STOCK', 'BOND', 'MIXED', 'MONEY', 'QDII', 'OTHER']).optional(),
  shares: z.number().optional(),
  costPerShare: z.number().optional(),
  currentValue: z.number().optional(),
  profit: z.number().optional(),
  profitRate: z.number().optional(),
  remark: z.string().optional(),
})

const listFundsSchema = z.object({
  type: z.enum(['STOCK', 'BOND', 'MIXED', 'MONEY', 'QDII', 'OTHER']).optional(),
})

const getFundSchema = z.object({
  id: z.string().uuid(),
})

const deleteFundSchema = z.object({
  id: z.string().uuid(),
})

const createFundTransactionSchema = z.object({
  fundId: z.string().uuid(),
  type: z.enum(['BUY', 'SELL', 'DIVIDEND']),
  shares: z.number().positive(),
  price: z.number().positive(),
  transactionDate: z.string().optional(),
  remark: z.string().optional(),
})

// ============================================
// Routes
// ============================================

/**
 * 获取基金列表
 */
fundRouter.post('/list', validate(listFundsSchema), async (req: Request, res: Response) => {
  const { type } = req.body

  const where: Prisma.FundWhereInput = {}
  if (type) where.type = type

  const funds = await prisma.fund.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: funds,
  })
})

/**
 * 获取基金汇总
 */
fundRouter.post('/summary', async (_req: Request, res: Response) => {
  const funds = await prisma.fund.findMany({
    select: {
      currentValue: true,
      profit: true,
      type: true,
    },
  })

  const totalValue = funds.reduce((sum, f) => sum + Number(f.currentValue), 0)
  const totalProfit = funds.reduce((sum, f) => sum + Number(f.profit), 0)
  const totalCost = totalValue - totalProfit

  const byType = funds.reduce((acc, item) => {
    const type = item.type
    if (!acc[type]) {
      acc[type] = { value: 0, profit: 0 }
    }
    acc[type].value += Number(item.currentValue)
    acc[type].profit += Number(item.profit)
    return acc
  }, {} as Record<string, { value: number; profit: number }>)

  res.json({
    success: true,
    data: {
      totalValue,
      totalProfit,
      totalCost,
      profitRate: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
      fundCount: funds.length,
      byType,
    },
  })
})

/**
 * 创建基金
 */
fundRouter.post('/create', validate(createFundSchema), async (req: Request, res: Response) => {
  const data = req.body

  const fund = await prisma.fund.create({
    data: {
      code: data.code,
      name: data.name,
      type: data.type,
      shares: data.shares,
      costPerShare: data.costPerShare,
      currentValue: data.currentValue,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      remark: data.remark,
    },
  })

  res.json({
    success: true,
    data: fund,
  })
})

/**
 * 获取基金详情
 */
fundRouter.post('/get', validate(getFundSchema), async (req: Request, res: Response) => {
  const { id } = req.body

  const fund = await prisma.fund.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { transactionDate: 'desc' },
        take: 20,
      },
    },
  })

  if (!fund) {
    res.status(404).json({
      success: false,
      error: 'Fund not found',
    })
    return
  }

  res.json({
    success: true,
    data: fund,
  })
})

/**
 * 更新基金
 */
fundRouter.post('/update', validate(updateFundSchema), async (req: Request, res: Response) => {
  const { id, ...data } = req.body

  const fund = await prisma.fund.update({
    where: { id },
    data,
  })

  res.json({
    success: true,
    data: fund,
  })
})

/**
 * 删除基金
 */
fundRouter.post('/delete', validate(deleteFundSchema), async (req: Request, res: Response) => {
  const { id } = req.body

  await prisma.fund.delete({
    where: { id },
  })

  res.json({
    success: true,
  })
})

/**
 * 添加基金交易记录
 */
fundRouter.post('/transactions/create', validate(createFundTransactionSchema), async (req: Request, res: Response) => {
  const { fundId, type, shares, price, transactionDate, remark } = req.body

  const amount = shares * price

  const transaction = await prisma.fundTransaction.create({
    data: {
      fundId,
      type,
      shares,
      price,
      amount,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      remark,
    },
  })

  // 更新基金持仓信息
  const fund = await prisma.fund.findUnique({ where: { id: fundId } })
  if (fund) {
    let newShares = Number(fund.shares)
    let newCost = Number(fund.costPerShare) * Number(fund.shares)

    if (type === 'BUY') {
      newCost += amount
      newShares += shares
    } else if (type === 'SELL') {
      newShares -= shares
    }

    const newCostPerShare = newShares > 0 ? newCost / newShares : 0

    await prisma.fund.update({
      where: { id: fundId },
      data: {
        shares: newShares,
        costPerShare: newCostPerShare,
      },
    })
  }

  res.json({
    success: true,
    data: transaction,
  })
})

/**
 * 获取基金交易记录
 */
fundRouter.post('/transactions/list', async (req: Request, res: Response) => {
  const { fundId } = req.body

  const transactions = await prisma.fundTransaction.findMany({
    where: fundId ? { fundId } : undefined,
    include: {
      fund: { select: { code: true, name: true } },
    },
    orderBy: { transactionDate: 'desc' },
    take: 50,
  })

  res.json({
    success: true,
    data: transactions,
  })
})

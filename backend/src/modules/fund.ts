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
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  type: z.enum(['STOCK', 'BOND', 'MIXED', 'MONEY', 'QDII', 'INDEX', 'WEALTH_MANAGEMENT', 'STOCK_PRODUCT', 'PENSION', 'ANNUITY', 'UNIVERSAL', 'INSURANCE_CASH', 'OTHER']).default('MIXED'),
  platform: z.enum(['ALIPAY', 'WECHAT', 'TENCENT', 'JD_FINANCE', 'BAIDU_WALLET', 'BANK_APP', 'FUND_COMPANY', 'STOCK_BROKER', 'OTHER']).default('OTHER'),
  cost: z.number().optional().default(0),
  currentValue: z.number().optional().default(0),
  profit: z.number().optional().default(0),
  profitRate: z.number().optional().default(0),
  purchaseDate: z.string().optional(),
  remark: z.string().optional(),
})

const updateFundSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['STOCK', 'BOND', 'MIXED', 'MONEY', 'QDII', 'INDEX', 'WEALTH_MANAGEMENT', 'STOCK_PRODUCT', 'PENSION', 'ANNUITY', 'UNIVERSAL', 'INSURANCE_CASH', 'OTHER']).optional(),
  platform: z.enum(['ALIPAY', 'WECHAT', 'TENCENT', 'JD_FINANCE', 'BAIDU_WALLET', 'BANK_APP', 'FUND_COMPANY', 'STOCK_BROKER', 'OTHER']).optional(),
  cost: z.number().optional(),
  currentValue: z.number().optional(),
  profit: z.number().optional(),
  profitRate: z.number().optional(),
  remark: z.string().optional(),
})

const listFundsSchema = z.object({
  type: z.enum(['STOCK', 'BOND', 'MIXED', 'MONEY', 'QDII', 'INDEX', 'WEALTH_MANAGEMENT', 'STOCK_PRODUCT', 'PENSION', 'ANNUITY', 'UNIVERSAL', 'INSURANCE_CASH', 'OTHER']).optional(),
  platform: z.enum(['ALIPAY', 'WECHAT', 'TENCENT', 'JD_FINANCE', 'BAIDU_WALLET', 'BANK_APP', 'FUND_COMPANY', 'STOCK_BROKER', 'OTHER']).optional(),
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
// Helper Functions
// ============================================

function convertFund(fund: any) {
  return {
    ...fund,
    cost: Number(fund.cost),
    currentValue: Number(fund.currentValue),
    profit: Number(fund.profit),
    profitRate: Number(fund.profitRate),
  }
}

// ============================================
// Routes
// ============================================

/**
 * 获取基金/投资产品列表
 */
fundRouter.post('/list', validate(listFundsSchema), async (req: Request, res: Response) => {
  const { type, platform } = req.body

  const where: Prisma.FundWhereInput = {}
  if (type) where.type = type as any
  if (platform) where.platform = platform as any

  const funds = await prisma.fund.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: funds.map(f => convertFund(f)),
  })
})

/**
 * 获取投资产品汇总
 */
fundRouter.post('/summary', async (_req: Request, res: Response) => {
  const funds = await prisma.fund.findMany({
    select: {
      currentValue: true,
      profit: true,
      type: true,
      platform: true,
    },
  })

  const totalValue = funds.reduce((sum, f) => sum + Number(f.currentValue), 0)
  const totalProfit = funds.reduce((sum, f) => sum + Number(f.profit), 0)
  const totalCost = totalValue - totalProfit

  // 按产品类型分组
  const byType = funds.reduce((acc, item) => {
    const type = item.type
    if (!acc[type]) {
      acc[type] = { value: 0, profit: 0 }
    }
    acc[type].value += Number(item.currentValue)
    acc[type].profit += Number(item.profit)
    return acc
  }, {} as Record<string, { value: number; profit: number }>)

  // 按平台分组
  const byPlatform = funds.reduce((acc, item) => {
    const platform = item.platform
    if (!acc[platform]) {
      acc[platform] = { value: 0, profit: 0 }
    }
    acc[platform].value += Number(item.currentValue)
    acc[platform].profit += Number(item.profit)
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
      byPlatform,
    },
  })
})

/**
 * 创建投资产品
 */
fundRouter.post('/create', validate(createFundSchema), async (req: Request, res: Response) => {
  const data = req.body

  // 自动计算收益和收益率
  const cost = data.cost || 0
  const currentValue = data.currentValue || 0
  const profit = currentValue - cost
  const profitRate = cost > 0 ? (profit / cost) * 100 : 0

  const fund = await prisma.fund.create({
    data: {
      code: data.code,
      name: data.name,
      type: data.type,
      platform: data.platform,
      cost: cost,
      currentValue: currentValue,
      profit: profit,
      profitRate: profitRate,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      remark: data.remark,
    },
  })

  res.json({
    success: true,
    data: convertFund(fund),
  })
})

/**
 * 获取投资产品详情
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
    data: convertFund(fund),
  })
})

/**
 * 更新投资产品
 */
fundRouter.post('/update', validate(updateFundSchema), async (req: Request, res: Response) => {
  const { id, ...data } = req.body

  // 获取当前产品数据
  const currentFund = await prisma.fund.findUnique({ where: { id } })
  if (!currentFund) {
    res.status(404).json({ success: false, error: '投资产品不存在' })
    return
  }

  // 使用新值或保持原值
  const cost = data.cost ?? Number(currentFund.cost)
  const currentValue = data.currentValue ?? Number(currentFund.currentValue)

  // 自动计算收益和收益率
  const profit = currentValue - cost
  const profitRate = cost > 0 ? (profit / cost) * 100 : 0

  const fund = await prisma.fund.update({
    where: { id },
    data: {
      ...data,
      cost: cost,
      currentValue: currentValue,
      profit: profit,
      profitRate: profitRate,
    },
  })

  res.json({
    success: true,
    data: convertFund(fund),
  })
})

/**
 * 删除投资产品
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
 * 批量更新投资产品市值（方便定时刷新）
 */
fundRouter.post('/batch-update-value', async (req: Request, res: Response) => {
  const { updates } = req.body as { updates: Array<{ id: string; currentValue: number; profit: number; profitRate: number }> }

  if (!Array.isArray(updates)) {
    res.status(400).json({ success: false, error: 'updates must be an array' })
    return
  }

  await Promise.all(
    updates.map(({ id, currentValue, profit, profitRate }) =>
      prisma.fund.update({
        where: { id },
        data: { currentValue, profit, profitRate },
      })
    )
  )

  res.json({ success: true })
})

/**
 * 添加投资产品交易记录
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

  // 更新投资产品持仓信息
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
 * 获取投资产品交易记录
 */
fundRouter.post('/transactions/list', async (req: Request, res: Response) => {
  const { fundId } = req.body

  const transactions = await prisma.fundTransaction.findMany({
    where: fundId ? { fundId } : undefined,
    include: {
      fund: { select: { code: true, name: true, platform: true } },
    },
    orderBy: { transactionDate: 'desc' },
    take: 50,
  })

  res.json({
    success: true,
    data: transactions,
  })
})

import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const netWorthRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const createSnapshotSchema = z.object({
  snapshotDate: z.string(),
})

// ============================================
// Helper Functions
// ============================================

// 计算当前净资产
async function calculateCurrentNetWorth() {
  // 获取账户余额
  const accounts = await prisma.account.findMany({
    where: { isArchived: false, includeNetWorth: true },
    select: { balance: true, isAsset: true, type: true },
  })

  // 资产端
  const accountAssets = accounts
    .filter(a => a.isAsset)
    .reduce((sum, a) => sum + Number(a.balance), 0)

  // 负债端（信用卡/花呗/白条/抖音月付等信用账户，余额为已用额度）
  const liabilityTypes = ['CREDIT_CARD', 'HUABEI', 'BAITIAO', 'DOuyin_PAY']
  const accountLiabilities = accounts
    .filter(a => !a.isAsset || liabilityTypes.includes(a.type as string))
    .reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0)

  // 基金市值
  const funds = await prisma.fund.findMany({
    select: { currentValue: true },
  })
  const fundValue = funds.reduce((sum, f) => sum + Number(f.currentValue), 0)

  // 贷款剩余本金
  const loans = await prisma.loan.findMany({
    select: { remainingPrincipal: true },
  })
  const loanLiabilities = loans.reduce((sum, l) => sum + Number(l.remainingPrincipal), 0)

  const totalAssets = accountAssets + fundValue
  const totalLiabilities = accountLiabilities + loanLiabilities
  const netWorth = totalAssets - totalLiabilities

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    assetBreakdown: {
      accounts: accountAssets,
      funds: fundValue,
    },
    liabilityBreakdown: {
      creditCards: accountLiabilities,
      loans: loanLiabilities,
    },
  }
}

// ============================================
// Routes
// ============================================

/**
 * 获取净资产快照列表
 */
netWorthRouter.post('/snapshots', validate(dateRangeSchema), async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body

  const where: any = {}
  if (startDate || endDate) {
    where.snapshotDate = {}
    if (startDate) where.snapshotDate.gte = new Date(startDate)
    if (endDate) where.snapshotDate.lte = new Date(endDate)
  }

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where,
    orderBy: { snapshotDate: 'asc' },
  })

  res.json({
    success: true,
    data: snapshots.map(s => ({
      ...s,
      totalAssets: Number(s.totalAssets),
      totalLiabilities: Number(s.totalLiabilities),
      netWorth: Number(s.netWorth),
    })),
  })
})

/**
 * 获取最新净资产快照
 */
netWorthRouter.post('/latest', async (_req: Request, res: Response) => {
  const snapshot = await prisma.netWorthSnapshot.findFirst({
    orderBy: { snapshotDate: 'desc' },
  })

  // 如果今天还没有快照，计算当前净资产
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!snapshot || new Date(snapshot.snapshotDate).getTime() < today.getTime()) {
    const current = await calculateCurrentNetWorth()
    res.json({
      success: true,
      data: {
        snapshotDate: today,
        ...current,
        isLive: true,
      },
    })
  } else {
    res.json({
      success: true,
      data: {
        ...snapshot,
        totalAssets: Number(snapshot.totalAssets),
        totalLiabilities: Number(snapshot.totalLiabilities),
        netWorth: Number(snapshot.netWorth),
        isLive: false,
      },
    })
  }
})

/**
 * 获取资产构成明细
 */
netWorthRouter.post('/breakdown', async (_req: Request, res: Response) => {
  const current = await calculateCurrentNetWorth()

  // 获取账户按类型分组
  const accounts = await prisma.account.findMany({
    where: { isArchived: false, includeNetWorth: true },
    select: { balance: true, isAsset: true, type: true },
  })

  const accountsByType = accounts.reduce((acc, a) => {
    const type = a.type
    if (!acc[type]) acc[type] = 0
    acc[type] += Number(a.balance)
    return acc
  }, {} as Record<string, number>)

  // 获取基金按类型分组
  const funds = await prisma.fund.findMany({
    select: { currentValue: true, type: true },
  })

  const fundsByType = funds.reduce((acc, f) => {
    const type = f.type
    if (!acc[type]) acc[type] = 0
    acc[type] += Number(f.currentValue)
    return acc
  }, {} as Record<string, number>)

  // 获取贷款列表
  const loans = await prisma.loan.findMany({
    select: { name: true, remainingPrincipal: true, loanType: true },
  })

  res.json({
    success: true,
    data: {
      ...current,
      accountsByType,
      fundsByType,
      loans: loans.map(l => ({
        name: l.name,
        remainingPrincipal: Number(l.remainingPrincipal),
        type: l.loanType,
      })),
    },
  })
})

/**
 * 手动创建净资产快照
 */
netWorthRouter.post('/create-snapshot', validate(createSnapshotSchema), async (req: Request, res: Response) => {
  const { snapshotDate } = req.body
  const date = new Date(snapshotDate)

  // 计算当天净资产
  const current = await calculateCurrentNetWorth()

  // 创建或更新快照
  const snapshot = await prisma.netWorthSnapshot.upsert({
    where: { snapshotDate: date },
    create: {
      snapshotDate: date,
      totalAssets: current.totalAssets,
      totalLiabilities: current.totalLiabilities,
      netWorth: current.netWorth,
      assetBreakdown: JSON.stringify(current.assetBreakdown),
    },
    update: {
      totalAssets: current.totalAssets,
      totalLiabilities: current.totalLiabilities,
      netWorth: current.netWorth,
      assetBreakdown: JSON.stringify(current.assetBreakdown),
    },
  })

  res.json({
    success: true,
    data: {
      ...snapshot,
      totalAssets: Number(snapshot.totalAssets),
      totalLiabilities: Number(snapshot.totalLiabilities),
      netWorth: Number(snapshot.netWorth),
    },
  })
})

/**
 * 获取净资产趋势（最近N个月）
 */
netWorthRouter.post('/trend', async (req: Request, res: Response) => {
  const { months = 6 } = req.body

  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: {
      snapshotDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { snapshotDate: 'asc' },
  })

  // 如果快照数量不足，补充当前数据
  if (snapshots.length === 0) {
    const current = await calculateCurrentNetWorth()
    res.json({
      success: true,
      data: [{
        date: new Date(),
        ...current,
      }],
    })
  } else {
    res.json({
      success: true,
      data: snapshots.map(s => ({
        date: s.snapshotDate,
        totalAssets: Number(s.totalAssets),
        totalLiabilities: Number(s.totalLiabilities),
        netWorth: Number(s.netWorth),
      })),
    })
  }
})

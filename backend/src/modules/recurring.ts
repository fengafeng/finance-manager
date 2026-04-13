import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const recurringRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const createRecurringBillSchema = z.object({
  name: z.string().min(1),
  merchantPattern: z.string().optional(),
  amountPattern: z.string().optional(),
  cycleType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  cycleDay: z.number().int().optional(),
  reminderDays: z.number().int().optional().default(3),
})

const updateRecurringBillSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  merchantPattern: z.string().optional(),
  amountPattern: z.string().optional(),
  cycleType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  cycleDay: z.number().int().optional(),
  reminderDays: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

// ============================================
// Helper Functions
// ============================================

// 识别周期性交易
async function detectRecurringTransactions() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: { gte: sixMonthsAgo },
      type: 'EXPENSE',
    },
    orderBy: { transactionDate: 'asc' },
  })

  // 按商户分组
  const merchantGroups = new Map<string, typeof transactions>()

  for (const t of transactions) {
    if (!t.merchant) continue
    const key = t.merchant.toLowerCase().trim()
    if (!merchantGroups.has(key)) {
      merchantGroups.set(key, [])
    }
    merchantGroups.get(key)!.push(t)
  }

  const suggestions: Array<{
    merchant: string
    transactions: typeof transactions
    avgAmount: number
    avgInterval: number
    cycleType: string
  }> = []

  // 分析每个商户的交易模式
  for (const [merchant, txs] of merchantGroups) {
    if (txs.length < 3) continue

    // 计算金额方差
    const amounts = txs.map(t => Number(t.amount))
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length
    const stdDev = Math.sqrt(variance)
    const coefficient = avgAmount > 0 ? (stdDev / avgAmount) * 100 : 0

    // 金额波动 <= 10%
    if (coefficient > 10) continue

    // 计算间隔天数
    const intervals: number[] = []
    for (let i = 1; i < txs.length; i++) {
      const days = Math.floor(
        (new Date(txs[i].transactionDate).getTime() - new Date(txs[i - 1].transactionDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      )
      intervals.push(days)
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const intervalVariance = intervals.reduce((sum, a) => sum + Math.pow(a - avgInterval, 2), 0) / intervals.length
    const intervalStdDev = Math.sqrt(intervalVariance)

    // 间隔方差 <= 2 天
    if (intervalStdDev > 2) continue

    // 判断周期类型
    let cycleType = 'MONTHLY'
    if (avgInterval >= 28 && avgInterval <= 31) {
      cycleType = 'MONTHLY'
    } else if (avgInterval >= 6 && avgInterval <= 8) {
      cycleType = 'WEEKLY'
    } else if (avgInterval >= 350 && avgInterval <= 380) {
      cycleType = 'YEARLY'
    } else if (avgInterval >= 0 && avgInterval <= 2) {
      cycleType = 'DAILY'
    } else {
      continue // 不是标准周期
    }

    suggestions.push({
      merchant,
      transactions: txs,
      avgAmount: Math.round(avgAmount * 100) / 100,
      avgInterval: Math.round(avgInterval),
      cycleType,
    })
  }

  return suggestions
}

// 计算下次到期日期
function calculateNextDueDate(cycleType: string, cycleDay?: number): Date {
  const next = new Date()

  switch (cycleType) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      if (cycleDay) {
        next.setDate(cycleDay)
      }
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1)
      if (cycleDay) {
        next.setDate(cycleDay)
      }
      break
  }

  return next
}

// ============================================
// Routes
// ============================================

/**
 * 获取自动识别的候选账单
 */
recurringRouter.post('/suggestions', async (_req: Request, res: Response) => {
  const suggestions = await detectRecurringTransactions()

  res.json({
    success: true,
    data: suggestions.map(s => ({
      name: s.merchant,
      merchantPattern: s.merchant,
      amountPattern: `约 ${s.avgAmount} 元`,
      cycleType: s.cycleType,
      occurrences: s.transactions.length,
      lastDate: s.transactions[s.transactions.length - 1].transactionDate,
      avgAmount: s.avgAmount,
    })),
  })
})

/**
 * 确认候选账单
 */
recurringRouter.post('/confirm', async (req: Request, res: Response) => {
  const { name, merchantPattern, cycleType, cycleDay, reminderDays } = req.body

  const nextDueDate = calculateNextDueDate(cycleType, cycleDay)

  const bill = await prisma.recurringBill.create({
    data: {
      name,
      merchantPattern,
      cycleType,
      cycleDay,
      nextDueDate,
      reminderDays: reminderDays || 3,
    },
  })

  res.json({
    success: true,
    data: bill,
  })
})

/**
 * 获取已确认的定期账单列表
 */
recurringRouter.post('/list', async (req: Request, res: Response) => {
  const { includeInactive } = req.body

  const bills = await prisma.recurringBill.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: {
      transactions: {
        take: 5,
        orderBy: { transactionDate: 'desc' },
      },
    },
    orderBy: { nextDueDate: 'asc' },
  })

  // 计算哪些账单即将到期
  const now = new Date()
  const upcomingBills = bills.map(b => {
    const daysUntilDue = b.nextDueDate 
      ? Math.ceil((new Date(b.nextDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return {
      ...b,
      daysUntilDue,
      isUpcoming: daysUntilDue !== null && daysUntilDue <= (b.reminderDays || 3),
    }
  })

  res.json({
    success: true,
    data: upcomingBills,
  })
})

/**
 * 创建定期账单
 */
recurringRouter.post('/create', validate(createRecurringBillSchema), async (req: Request, res: Response) => {
  const data = req.body
  const nextDueDate = calculateNextDueDate(data.cycleType, data.cycleDay)

  const bill = await prisma.recurringBill.create({
    data: {
      name: data.name,
      merchantPattern: data.merchantPattern,
      amountPattern: data.amountPattern,
      cycleType: data.cycleType,
      cycleDay: data.cycleDay,
      nextDueDate,
      reminderDays: data.reminderDays || 3,
    },
  })

  res.json({
    success: true,
    data: bill,
  })
})

/**
 * 更新定期账单
 */
recurringRouter.post('/update', validate(updateRecurringBillSchema), async (req: Request, res: Response) => {
  const { id, ...data } = req.body

  const bill = await prisma.recurringBill.update({
    where: { id },
    data,
  })

  res.json({
    success: true,
    data: bill,
  })
})

/**
 * 删除定期账单
 */
recurringRouter.post('/delete', async (req: Request, res: Response) => {
  const { id } = req.body

  await prisma.recurringBill.delete({
    where: { id },
  })

  res.json({ success: true })
})

/**
 * 获取即将到期的账单提醒
 */
recurringRouter.post('/reminders', async (_req: Request, res: Response) => {
  const now = new Date()
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)

  const bills = await prisma.recurringBill.findMany({
    where: {
      isActive: true,
      nextDueDate: {
        gte: now,
        lte: threeDaysLater,
      },
    },
  })

  res.json({
    success: true,
    data: bills.map(b => {
      const daysUntilDue = Math.ceil(
        (new Date(b.nextDueDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        ...b,
        daysUntilDue,
      }
    }),
  })
})

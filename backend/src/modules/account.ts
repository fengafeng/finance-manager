import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const accountRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['ALIPAY', 'WECHAT', 'BANK', 'CREDIT_CARD', 'CASH', 'OTHER']).default('OTHER'),
  icon: z.string().optional(),
  color: z.string().optional(),
  balance: z.number().default(0),
  currency: z.string().default('CNY'),
  remark: z.string().optional(),
})

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['ALIPAY', 'WECHAT', 'BANK', 'CREDIT_CARD', 'CASH', 'OTHER']).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  remark: z.string().optional(),
  isArchived: z.boolean().optional(),
})

const listAccountsSchema = z.object({
  includeArchived: z.boolean().optional().default(false),
  type: z.enum(['ALIPAY', 'WECHAT', 'BANK', 'CREDIT_CARD', 'CASH', 'OTHER']).optional(),
})

const getAccountSchema = z.object({
  id: z.string().uuid(),
})

const deleteAccountSchema = z.object({
  id: z.string().uuid(),
})

// ============================================
// Routes
// ============================================

/**
 * 获取账户列表
 */
accountRouter.post('/list', validate(listAccountsSchema), async (req: Request, res: Response) => {
  const { includeArchived, type } = req.body

  const where: Prisma.AccountWhereInput = {}
  
  if (!includeArchived) {
    where.isArchived = false
  }
  
  if (type) {
    where.type = type
  }

  const accounts = await prisma.account.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: accounts,
  })
})

/**
 * 获取账户汇总
 */
accountRouter.post('/summary', async (_req: Request, res: Response) => {
  const accounts = await prisma.account.findMany({
    where: { isArchived: false },
    select: {
      type: true,
      balance: true,
    },
  })

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + Number(acc.balance),
    0
  )

  const byType = accounts.reduce((acc, item) => {
    const type = item.type
    if (!acc[type]) {
      acc[type] = 0
    }
    acc[type] += Number(item.balance)
    return acc
  }, {} as Record<string, number>)

  res.json({
    success: true,
    data: {
      totalBalance,
      accountCount: accounts.length,
      byType,
    },
  })
})

/**
 * 创建账户
 */
accountRouter.post('/create', validate(createAccountSchema), async (req: Request, res: Response) => {
  const data = req.body

  const account = await prisma.account.create({
    data: {
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
      balance: data.balance,
      currency: data.currency,
      remark: data.remark,
    },
  })

  res.json({
    success: true,
    data: account,
  })
})

/**
 * 获取账户详情
 */
accountRouter.post('/get', validate(getAccountSchema), async (req: Request, res: Response) => {
  const { id } = req.body

  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      transactions: {
        take: 10,
        orderBy: { transactionDate: 'desc' },
      },
    },
  })

  if (!account) {
    res.status(404).json({
      success: false,
      error: 'Account not found',
    })
    return
  }

  res.json({
    success: true,
    data: account,
  })
})

/**
 * 更新账户
 */
accountRouter.post('/update', validate(updateAccountSchema.extend({ id: z.string().uuid() })), async (req: Request, res: Response) => {
  const { id, ...data } = req.body

  const account = await prisma.account.update({
    where: { id },
    data,
  })

  res.json({
    success: true,
    data: account,
  })
})

/**
 * 删除账户
 */
accountRouter.post('/delete', validate(deleteAccountSchema), async (req: Request, res: Response) => {
  const { id } = req.body

  await prisma.account.delete({
    where: { id },
  })

  res.json({
    success: true,
  })
})

import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const transactionRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'REFUND']).default('EXPENSE'),
  amount: z.number().positive(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  merchant: z.string().optional(),
  description: z.string().optional(),
  transactionDate: z.string().optional(),
})

const updateTransactionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'REFUND']).optional(),
  amount: z.number().positive().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  transactionDate: z.string().optional(),
  isCleaned: z.boolean().optional(),
  cleanType: z.enum(['NORMAL', 'REFUND', 'INTERNAL_TRANSFER', 'WITHDRAWAL', 'DEPOSIT']).optional(),
})

const listTransactionsSchema = z.object({
  accountId: z.string().uuid().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'REFUND']).optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
})

const getTransactionSchema = z.object({
  id: z.string().uuid(),
})

const deleteTransactionSchema = z.object({
  id: z.string().uuid(),
})

const statisticsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.string().uuid().optional(),
})

// ============================================
// Routes
// ============================================

/**
 * 获取交易流水列表
 */
transactionRouter.post('/list', validate(listTransactionsSchema), async (req: Request, res: Response) => {
  const { accountId, type, category, startDate, endDate, page, pageSize } = req.body

  const where: Prisma.TransactionWhereInput = {}

  if (accountId) where.accountId = accountId
  if (type) where.type = type
  if (category) where.category = category
  if (startDate || endDate) {
    where.transactionDate = {}
    if (startDate) where.transactionDate.gte = new Date(startDate)
    if (endDate) where.transactionDate.lte = new Date(endDate)
  }

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true, type: true, icon: true },
        },
      },
      orderBy: { transactionDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  res.json({
    success: true,
    data: {
      items: transactions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

/**
 * 获取交易统计
 */
transactionRouter.post('/statistics', validate(statisticsSchema), async (req: Request, res: Response) => {
  const { startDate, endDate, accountId } = req.body

  const where: Prisma.TransactionWhereInput = {}
  if (accountId) where.accountId = accountId
  if (startDate || endDate) {
    where.transactionDate = {}
    if (startDate) where.transactionDate.gte = new Date(startDate)
    if (endDate) where.transactionDate.lte = new Date(endDate)
  }

  const [income, expense, byCategory] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...where, type: 'INCOME' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: 'EXPENSE' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ['category'],
      where: { ...where, type: 'EXPENSE', category: { not: null } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    }),
  ])

  res.json({
    success: true,
    data: {
      income: {
        total: Number(income._sum.amount || 0),
        count: income._count,
      },
      expense: {
        total: Number(expense._sum.amount || 0),
        count: expense._count,
      },
      balance: Number(income._sum.amount || 0) - Number(expense._sum.amount || 0),
      byCategory: byCategory.map(item => ({
        category: item.category,
        amount: Number(item._sum.amount || 0),
        count: item._count,
      })),
    },
  })
})

/**
 * 创建交易记录
 */
transactionRouter.post('/create', validate(createTransactionSchema), async (req: Request, res: Response) => {
  const data = req.body

  const transaction = await prisma.transaction.create({
    data: {
      accountId: data.accountId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      tags: data.tags || [],
      merchant: data.merchant,
      description: data.description,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
      sourceType: 'MANUAL',
    },
    include: {
      account: { select: { id: true, name: true, type: true } },
    },
  })

  res.json({
    success: true,
    data: transaction,
  })
})

/**
 * 获取交易详情
 */
transactionRouter.post('/get', validate(getTransactionSchema), async (req: Request, res: Response) => {
  const { id } = req.body

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      account: true,
    },
  })

  if (!transaction) {
    res.status(404).json({
      success: false,
      error: 'Transaction not found',
    })
    return
  }

  res.json({
    success: true,
    data: transaction,
  })
})

/**
 * 更新交易记录
 */
transactionRouter.post('/update', validate(updateTransactionSchema), async (req: Request, res: Response) => {
  const { id, ...data } = req.body

  const updateData: Prisma.TransactionUpdateInput = {}
  
  if (data.type) updateData.type = data.type
  if (data.amount) updateData.amount = data.amount
  if (data.category !== undefined) updateData.category = data.category
  if (data.tags) updateData.tags = data.tags
  if (data.merchant !== undefined) updateData.merchant = data.merchant
  if (data.description !== undefined) updateData.description = data.description
  if (data.transactionDate) updateData.transactionDate = new Date(data.transactionDate)
  if (data.isCleaned !== undefined) updateData.isCleaned = data.isCleaned
  if (data.cleanType) updateData.cleanType = data.cleanType

  const transaction = await prisma.transaction.update({
    where: { id },
    data: updateData,
  })

  res.json({
    success: true,
    data: transaction,
  })
})

/**
 * 删除交易记录
 */
transactionRouter.post('/delete', validate(deleteTransactionSchema), async (req: Request, res: Response) => {
  const { id } = req.body

  await prisma.transaction.delete({
    where: { id },
  })

  res.json({
    success: true,
  })
})

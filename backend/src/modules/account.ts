import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const accountRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

// 信用账户类型（需要同步到贷款管理的账户类型）
const CREDIT_ACCOUNT_TYPES = ['CREDIT_CARD', 'HUABEI', 'BAITIAO', 'DOUYIN_PAY']

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['ALIPAY', 'WECHAT', 'BANK', 'CREDIT_CARD', 'CASH', 'HUABEI', 'BAITIAO', 'DOUYIN_PAY', 'OTHER']).default('OTHER'),
  icon: z.string().optional(),
  color: z.string().optional(),
  balance: z.number().default(0),
  currency: z.string().default('CNY'),
  remark: z.string().optional(),
  // 卡号（银行卡/信用卡）
  cardNumber: z.string().optional(),
  // 信用账户扩展字段
  creditLimit: z.number().optional(),
  availableCredit: z.number().optional(),
  billingDate: z.number().int().min(1).max(31).optional(),
  paymentDueDate: z.number().int().min(1).max(31).optional(),
  unpostedBalance: z.number().optional(),
  installmentInfo: z.string().optional(),
  // 支付宝/微信扩展字段
  thirdPartyAccount: z.string().optional().nullable(),
  thirdPartyNickname: z.string().optional().nullable(),
})

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['ALIPAY', 'WECHAT', 'BANK', 'CREDIT_CARD', 'CASH', 'HUABEI', 'BAITIAO', 'DOUYIN_PAY', 'OTHER']).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  remark: z.string().optional(),
  isArchived: z.boolean().optional(),
  // 卡号
  cardNumber: z.string().optional().nullable(),
  // 信用账户扩展字段
  creditLimit: z.number().optional(),
  availableCredit: z.number().optional(),
  billingDate: z.number().int().min(1).max(31).optional().nullable(),
  paymentDueDate: z.number().int().min(1).max(31).optional().nullable(),
  unpostedBalance: z.number().optional(),
  installmentInfo: z.string().optional(),
  // 支付宝/微信扩展字段
  thirdPartyAccount: z.string().optional().nullable(),
  thirdPartyNickname: z.string().optional().nullable(),
})

const listAccountsSchema = z.object({
  includeArchived: z.boolean().optional().default(false),
  type: z.enum(['ALIPAY', 'WECHAT', 'BANK', 'CREDIT_CARD', 'CASH', 'HUABEI', 'BAITIAO', 'DOUYIN_PAY', 'OTHER']).optional(),
})

const getAccountSchema = z.object({
  id: z.string().uuid(),
})

const deleteAccountSchema = z.object({
  id: z.string().uuid(),
})

// ============================================
// Helper Functions
// ============================================

// 根据账户类型获取对应的贷款类型
function accountTypeToLoanType(accountType: string): string {
  const mapping: Record<string, string> = {
    CREDIT_CARD: 'CREDIT_CARD',
    HUABEI: 'HUABEI',
    BAITIAO: 'BAITIAO',
    DOUYIN_PAY: 'DOUYIN_PAY',
  }
  return mapping[accountType] || 'OTHER'
}

// 判断是否为信用账户类型
function isCreditAccountType(type: string): boolean {
  return CREDIT_ACCOUNT_TYPES.includes(type)
}

// 创建或更新关联的贷款记录
async function syncToLoan(accountId: string, data: any, isDelete = false) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account) return

  // 如果是信用账户类型且不是删除操作，同步到贷款表
  if (isCreditAccountType(account.type) && !isDelete) {
    // 计算已用额度 = 余额（信用卡/花呗等余额为已用额度）
    const usedCredit = Math.abs(data.balance ?? account.balance)
    const creditLimit = data.creditLimit ?? account.creditLimit
    const availableCredit = creditLimit ? Number(creditLimit) - usedCredit : null

    // 检查是否已有关联的贷款记录
    const existingLoan = await prisma.loan.findFirst({
      where: { linkedCreditAccountId: accountId },
    })

    const loanData = {
      name: data.name ?? account.name,
      loanType: accountTypeToLoanType(account.type) as any,
      principal: creditLimit ?? usedCredit,
      remainingPrincipal: usedCredit,
      annualRate: 0, // 信用卡/花呗默认无利率，按期还款免息
      startDate: account.createdAt,
      endDate: new Date('2099-12-31'), // 信用账户无固定结束日期
      billingDate: data.billingDate ?? account.billingDate,
      paymentDueDate: data.paymentDueDate ?? account.paymentDueDate,
      unpostedBalance: data.unpostedBalance ?? account.unpostedBalance ?? 0,
      installmentInfo: data.installmentInfo ?? account.installmentInfo,
      creditLimit: creditLimit,
      availableCredit: availableCredit,
      linkedCreditAccountId: accountId,
    }

    if (existingLoan) {
      // 更新已有贷款记录
      await prisma.loan.update({
        where: { id: existingLoan.id },
        data: loanData,
      })
    } else {
      // 创建新的贷款记录
      await prisma.loan.create({
        data: loanData,
      })
    }
  } else {
    // 如果不再是信用账户类型，删除关联的贷款记录
    await prisma.loan.deleteMany({
      where: { linkedCreditAccountId: accountId },
    })
  }
}

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
    data: accounts.map(acc => ({
      ...acc,
      balance: Number(acc.balance),
      creditLimit: acc.creditLimit ? Number(acc.creditLimit) : null,
      availableCredit: acc.availableCredit ? Number(acc.availableCredit) : null,
      unpostedBalance: acc.unpostedBalance ? Number(acc.unpostedBalance) : null,
    })),
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
      cardNumber: data.cardNumber,
      // 信用账户扩展字段
      creditLimit: data.creditLimit,
      availableCredit: data.availableCredit,
      billingDate: data.billingDate,
      paymentDueDate: data.paymentDueDate,
      unpostedBalance: data.unpostedBalance ?? 0,
      installmentInfo: data.installmentInfo,
      // 支付宝/微信扩展字段
      thirdPartyAccount: data.thirdPartyAccount,
      thirdPartyNickname: data.thirdPartyNickname,
    },
  })

  // 如果是信用账户，同步到贷款管理
  await syncToLoan(account.id, data)

  res.json({
    success: true,
    data: {
      ...account,
      balance: Number(account.balance),
      creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
      availableCredit: account.availableCredit ? Number(account.availableCredit) : null,
      unpostedBalance: account.unpostedBalance ? Number(account.unpostedBalance) : null,
    },
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
    data: {
      ...account,
      balance: Number(account.balance),
      creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
      availableCredit: account.availableCredit ? Number(account.availableCredit) : null,
      unpostedBalance: account.unpostedBalance ? Number(account.unpostedBalance) : null,
    },
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

  // 同步到贷款管理
  await syncToLoan(id, data)

  res.json({
    success: true,
    data: {
      ...account,
      balance: Number(account.balance),
      creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
      availableCredit: account.availableCredit ? Number(account.availableCredit) : null,
      unpostedBalance: account.unpostedBalance ? Number(account.unpostedBalance) : null,
    },
  })
})

/**
 * 删除账户
 */
accountRouter.post('/delete', validate(deleteAccountSchema), async (req: Request, res: Response) => {
  const { id } = req.body

  // 先同步删除关联的贷款记录
  await syncToLoan(id, {}, true)

  await prisma.account.delete({
    where: { id },
  })

  res.json({
    success: true,
  })
})

import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const loanRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const createLoanSchema = z.object({
  name: z.string().min(1),
  loanType: z.enum(['MORTGAGE', 'CAR_LOAN', 'CREDIT_CARD', 'OTHER']),
  principal: z.number().positive(),
  remainingPrincipal: z.number().positive(),
  annualRate: z.number().min(0).max(1),
  startDate: z.string(),
  endDate: z.string(),
  paymentDay: z.number().int().min(1).max(31).optional(),
  monthlyPayment: z.number().positive().optional(),
  linkedAccountId: z.string().uuid().optional().nullable(),
  autoTrackRepayment: z.boolean().optional().default(true),
})

const updateLoanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  remainingPrincipal: z.number().positive().optional(),
  annualRate: z.number().min(0).max(1).optional(),
  monthlyPayment: z.number().positive().optional(),
  linkedAccountId: z.string().uuid().optional().nullable(),
  autoTrackRepayment: z.boolean().optional(),
})

const prepaySimulateSchema = z.object({
  id: z.string().uuid(),
  prepayAmount: z.number().positive(),
  mode: z.enum(['shorten_term', 'reduce_payment']),
})

// ============================================
// Helper Functions
// ============================================

// 计算等额本息月供
function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months
  const monthlyRate = annualRate / 12
  return principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1)
}

// 计算还款计划
function calculatePaymentSchedule(
  principal: number,
  annualRate: number,
  months: number,
  monthlyPayment: number
): Array<{ month: number; payment: number; principal: number; interest: number; remaining: number }> {
  const schedule = []
  let remaining = principal
  const monthlyRate = annualRate / 12

  for (let i = 1; i <= months; i++) {
    const interest = remaining * monthlyRate
    const principalPaid = monthlyPayment - interest
    remaining = Math.max(0, remaining - principalPaid)

    schedule.push({
      month: i,
      payment: monthlyPayment,
      principal: principalPaid,
      interest,
      remaining,
    })
  }

  return schedule
}

// 计算提前还款
function calculatePrepayment(
  remainingPrincipal: number,
  annualRate: number,
  remainingMonths: number,
  prepayAmount: number,
  mode: 'shorten_term' | 'reduce_payment'
) {
  const newPrincipal = remainingPrincipal - prepayAmount
  const monthlyRate = annualRate / 12

  if (mode === 'shorten_term') {
    // 缩短年限，月供不变
    const currentPayment = calculateMonthlyPayment(remainingPrincipal, annualRate, remainingMonths)
    const newMonths = Math.ceil(
      -Math.log(1 - (newPrincipal * monthlyRate) / currentPayment) / Math.log(1 + monthlyRate)
    )
    const totalInterestSaved = (remainingMonths * currentPayment - remainingPrincipal) - 
      (newMonths * currentPayment - newPrincipal)

    return {
      newPrincipal,
      newMonths,
      newMonthlyPayment: currentPayment,
      monthsSaved: remainingMonths - newMonths,
      totalInterestSaved,
    }
  } else {
    // 减少月供，期限不变
    const newPayment = calculateMonthlyPayment(newPrincipal, annualRate, remainingMonths)
    const oldPayment = calculateMonthlyPayment(remainingPrincipal, annualRate, remainingMonths)
    const totalInterestSaved = (remainingMonths * oldPayment - remainingPrincipal) - 
      (remainingMonths * newPayment - newPrincipal)

    return {
      newPrincipal,
      newMonths: remainingMonths,
      newMonthlyPayment: newPayment,
      paymentReduction: oldPayment - newPayment,
      totalInterestSaved,
    }
  }
}

// ============================================
// Routes
// ============================================

/**
 * 获取贷款列表
 */
loanRouter.post('/list', async (_req: Request, res: Response) => {
  const loans = await prisma.loan.findMany({
    include: {
      linkedAccount: {
        select: { id: true, name: true, type: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: loans.map(l => ({
      ...l,
      principal: Number(l.principal),
      remainingPrincipal: Number(l.remainingPrincipal),
      annualRate: Number(l.annualRate),
      monthlyPayment: l.monthlyPayment ? Number(l.monthlyPayment) : null,
      progress: Number(l.principal) > 0 ? ((Number(l.principal) - Number(l.remainingPrincipal)) / Number(l.principal)) * 100 : 0,
    })),
  })
})

/**
 * 创建贷款
 */
loanRouter.post('/create', validate(createLoanSchema), async (req: Request, res: Response) => {
  const data = req.body

  // 计算月供（如果未提供）
  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)
  const months = Math.ceil((endDate.getFullYear() - startDate.getFullYear()) * 12 + 
    (endDate.getMonth() - startDate.getMonth()))

  const monthlyPayment = data.monthlyPayment || 
    calculateMonthlyPayment(data.principal, data.annualRate, months)

  const loan = await prisma.loan.create({
    data: {
      name: data.name,
      loanType: data.loanType,
      principal: data.principal,
      remainingPrincipal: data.remainingPrincipal || data.principal,
      annualRate: data.annualRate,
      startDate: startDate,
      endDate: endDate,
      paymentDay: data.paymentDay,
      monthlyPayment: monthlyPayment,
      linkedAccountId: data.linkedAccountId,
      autoTrackRepayment: data.autoTrackRepayment ?? true,
    },
    include: {
      linkedAccount: {
        select: { id: true, name: true },
      },
    },
  })

  res.json({
    success: true,
    data: {
      ...loan,
      principal: Number(loan.principal),
      remainingPrincipal: Number(loan.remainingPrincipal),
      annualRate: Number(loan.annualRate),
      monthlyPayment: Number(loan.monthlyPayment),
    },
  })
})

/**
 * 获取贷款详情
 */
loanRouter.post('/get', async (req: Request, res: Response) => {
  const { id } = req.body

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      linkedAccount: {
        select: { id: true, name: true, type: true },
      },
    },
  })

  if (!loan) {
    res.status(404).json({ success: false, error: 'Loan not found' })
    return
  }

  res.json({
    success: true,
    data: {
      ...loan,
      principal: Number(loan.principal),
      remainingPrincipal: Number(loan.remainingPrincipal),
      annualRate: Number(loan.annualRate),
      monthlyPayment: Number(loan.monthlyPayment),
    },
  })
})

/**
 * 更新贷款
 */
loanRouter.post('/update', validate(updateLoanSchema), async (req: Request, res: Response) => {
  const { id, ...data } = req.body

  const loan = await prisma.loan.update({
    where: { id },
    data,
    include: {
      linkedAccount: {
        select: { id: true, name: true },
      },
    },
  })

  res.json({
    success: true,
    data: {
      ...loan,
      principal: Number(loan.principal),
      remainingPrincipal: Number(loan.remainingPrincipal),
      annualRate: Number(loan.annualRate),
      monthlyPayment: Number(loan.monthlyPayment),
    },
  })
})

/**
 * 删除贷款
 */
loanRouter.post('/delete', async (req: Request, res: Response) => {
  const { id } = req.body

  await prisma.loan.delete({
    where: { id },
  })

  res.json({ success: true })
})

/**
 * 获取还款计划表
 */
loanRouter.post('/payment-schedule', async (req: Request, res: Response) => {
  const { id } = req.body

  const loan = await prisma.loan.findUnique({
    where: { id },
  })

  if (!loan) {
    res.status(404).json({ success: false, error: 'Loan not found' })
    return
  }

  const startDate = new Date(loan.startDate)
  const endDate = new Date(loan.endDate)
  const months = Math.ceil((endDate.getFullYear() - startDate.getFullYear()) * 12 + 
    (endDate.getMonth() - startDate.getMonth()))

  const schedule = calculatePaymentSchedule(
    Number(loan.remainingPrincipal),
    Number(loan.annualRate),
    months,
    Number(loan.monthlyPayment)
  )

  res.json({
    success: true,
    data: {
      loan: {
        ...loan,
        principal: Number(loan.principal),
        remainingPrincipal: Number(loan.remainingPrincipal),
        annualRate: Number(loan.annualRate),
        monthlyPayment: Number(loan.monthlyPayment),
      },
      schedule,
      totalInterest: schedule.reduce((sum, s) => sum + s.interest, 0),
      totalPayment: schedule.reduce((sum, s) => sum + s.payment, 0),
    },
  })
})

/**
 * 提前还款模拟
 */
loanRouter.post('/prepay-simulate', validate(prepaySimulateSchema), async (req: Request, res: Response) => {
  const { id, prepayAmount, mode } = req.body

  const loan = await prisma.loan.findUnique({
    where: { id },
  })

  if (!loan) {
    res.status(404).json({ success: false, error: 'Loan not found' })
    return
  }

  // 计算剩余期数
  const startDate = new Date(loan.startDate)
  const endDate = new Date(loan.endDate)
  const totalMonths = Math.ceil((endDate.getFullYear() - startDate.getFullYear()) * 12 + 
    (endDate.getMonth() - startDate.getMonth()))

  // 简化：假设已还款期数为总期数的一定比例
  const paidMonths = Math.floor(totalMonths * (1 - Number(loan.remainingPrincipal) / Number(loan.principal)))
  const remainingMonths = totalMonths - paidMonths

  const result = calculatePrepayment(
    Number(loan.remainingPrincipal),
    Number(loan.annualRate),
    remainingMonths,
    prepayAmount,
    mode
  )

  res.json({
    success: true,
    data: {
      original: {
        remainingPrincipal: Number(loan.remainingPrincipal),
        remainingMonths,
        monthlyPayment: Number(loan.monthlyPayment),
      },
      afterPrepay: result,
      prepayAmount,
      mode,
    },
  })
})

import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const automationRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const createRuleSchema = z.object({
  name: z.string().min(1),
  triggerType: z.enum(['merchant', 'category', 'amount', 'combination']),
  triggerConfig: z.record(z.any()),
  actionType: z.enum(['add_tag', 'set_category', 'send_notification', 'mark_review']),
  actionConfig: z.record(z.any()),
  priority: z.number().int().optional().default(0),
})

const updateRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  triggerType: z.enum(['merchant', 'category', 'amount', 'combination']).optional(),
  triggerConfig: z.record(z.any()).optional(),
  actionType: z.enum(['add_tag', 'set_category', 'send_notification', 'mark_review']).optional(),
  actionConfig: z.record(z.any()).optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

// ============================================
// Rule Engine
// ============================================

interface Transaction {
  id: string
  merchant?: string | null
  category?: string | null
  amount: number
  transactionDate: Date
}

interface Rule {
  id: string
  name: string
  triggerType: string
  triggerConfig: Record<string, any>
  actionType: string
  actionConfig: Record<string, any>
  priority: number
}

// 检查交易是否匹配规则条件
function matchesTrigger(transaction: Transaction, triggerType: string, triggerConfig: Record<string, any>): boolean {
  switch (triggerType) {
    case 'merchant':
      if (!transaction.merchant) return false
      const merchantMatch = triggerConfig.contains?.some((keyword: string) =>
        transaction.merchant!.toLowerCase().includes(keyword.toLowerCase())
      )
      return !!merchantMatch

    case 'category':
      return transaction.category === triggerConfig.equals

    case 'amount':
      const amount = transaction.amount
      if (triggerConfig.gt !== undefined && amount <= triggerConfig.gt) return false
      if (triggerConfig.lt !== undefined && amount >= triggerConfig.lt) return false
      if (triggerConfig.gte !== undefined && amount < triggerConfig.gte) return false
      if (triggerConfig.lte !== undefined && amount > triggerConfig.lte) return false
      if (triggerConfig.between !== undefined) {
        if (amount < triggerConfig.between[0] || amount > triggerConfig.between[1]) return false
      }
      return true

    case 'combination':
      const conditions = triggerConfig.conditions || []
      const logic = triggerConfig.logic || 'and'

      const results = conditions.map((cond: any) =>
        matchesTrigger(transaction, cond.field, { [cond.operator]: cond.value })
      )

      return logic === 'and' 
        ? results.every(Boolean) 
        : results.some(Boolean)

    default:
      return false
  }
}

// 执行规则动作
async function executeAction(
  transactionId: string,
  actionType: string,
  actionConfig: Record<string, any>
): Promise<void> {
  switch (actionType) {
    case 'add_tag':
      const tx = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { tags: true },
      })
      if (tx) {
        const newTags = [...new Set([...tx.tags, ...(actionConfig.tags || [])])]
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { tags: newTags },
        })
      }
      break

    case 'set_category':
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { category: actionConfig.category },
      })
      break

    case 'mark_review':
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { needsReview: true },
      })
      break

    case 'send_notification':
      // 这里只记录，实际通知由前端处理
      console.log(`[Notification] ${actionConfig.title}: ${actionConfig.body}`)
      break
  }
}

// 对交易应用所有匹配的规则
export async function applyRulesToTransaction(transactionId: string, transaction: Transaction): Promise<string[]> {
  const rules = await prisma.automationRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  })

  const matchedRules: string[] = []

  for (const rule of rules) {
    const ruleObj: Rule = {
      id: rule.id,
      name: rule.name,
      triggerType: rule.triggerType,
      triggerConfig: JSON.parse(rule.triggerConfig),
      actionType: rule.actionType,
      actionConfig: JSON.parse(rule.actionConfig),
      priority: rule.priority,
    }

    if (matchesTrigger(transaction, ruleObj.triggerType, ruleObj.triggerConfig)) {
      await executeAction(transactionId, ruleObj.actionType, ruleObj.actionConfig)
      matchedRules.push(rule.name)
    }
  }

  return matchedRules
}

// ============================================
// Routes
// ============================================

/**
 * 获取规则列表
 */
automationRouter.post('/list', async (_req: Request, res: Response) => {
  const rules = await prisma.automationRule.findMany({
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  res.json({
    success: true,
    data: rules.map(r => ({
      ...r,
      triggerConfig: JSON.parse(r.triggerConfig),
      actionConfig: JSON.parse(r.actionConfig),
    })),
  })
})

/**
 * 创建规则
 */
automationRouter.post('/create', validate(createRuleSchema), async (req: Request, res: Response) => {
  const data = req.body

  const rule = await prisma.automationRule.create({
    data: {
      name: data.name,
      triggerType: data.triggerType,
      triggerConfig: JSON.stringify(data.triggerConfig),
      actionType: data.actionType,
      actionConfig: JSON.stringify(data.actionConfig),
      priority: data.priority || 0,
    },
  })

  res.json({
    success: true,
    data: {
      ...rule,
      triggerConfig: JSON.parse(rule.triggerConfig),
      actionConfig: JSON.parse(rule.actionConfig),
    },
  })
})

/**
 * 更新规则
 */
automationRouter.post('/update', validate(updateRuleSchema), async (req: Request, res: Response) => {
  const { id, ...data } = req.body

  const updateData: any = {}
  if (data.name) updateData.name = data.name
  if (data.triggerType) updateData.triggerType = data.triggerType
  if (data.triggerConfig) updateData.triggerConfig = JSON.stringify(data.triggerConfig)
  if (data.actionType) updateData.actionType = data.actionType
  if (data.actionConfig) updateData.actionConfig = JSON.stringify(data.actionConfig)
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  const rule = await prisma.automationRule.update({
    where: { id },
    data: updateData,
  })

  res.json({
    success: true,
    data: {
      ...rule,
      triggerConfig: JSON.parse(rule.triggerConfig),
      actionConfig: JSON.parse(rule.actionConfig),
    },
  })
})

/**
 * 删除规则
 */
automationRouter.post('/delete', async (req: Request, res: Response) => {
  const { id } = req.body

  await prisma.automationRule.delete({
    where: { id },
  })

  res.json({ success: true })
})

/**
 * 切换规则状态
 */
automationRouter.post('/toggle', async (req: Request, res: Response) => {
  const { id } = req.body

  const rule = await prisma.automationRule.findUnique({
    where: { id },
  })

  if (!rule) {
    res.status(404).json({ success: false, error: 'Rule not found' })
    return
  }

  const updated = await prisma.automationRule.update({
    where: { id },
    data: { isActive: !rule.isActive },
  })

  res.json({
    success: true,
    data: {
      ...updated,
      triggerConfig: JSON.parse(updated.triggerConfig),
      actionConfig: JSON.parse(updated.actionConfig),
    },
  })
})

/**
 * 测试规则（对指定交易运行规则，但不保存结果）
 */
automationRouter.post('/test', async (req: Request, res: Response) => {
  const { ruleId, transactionId } = req.body

  const [rule, transaction] = await Promise.all([
    prisma.automationRule.findUnique({ where: { id: ruleId } }),
    prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { account: true },
    }),
  ])

  if (!rule || !transaction) {
    res.status(404).json({ success: false, error: 'Rule or transaction not found' })
    return
  }

  const tx: Transaction = {
    id: transaction.id,
    merchant: transaction.merchant,
    category: transaction.category,
    amount: Number(transaction.amount),
    transactionDate: transaction.transactionDate,
  }

  const ruleObj: Rule = {
    id: rule.id,
    name: rule.name,
    triggerType: rule.triggerType,
    triggerConfig: JSON.parse(rule.triggerConfig),
    actionType: rule.actionType,
    actionConfig: JSON.parse(rule.actionConfig),
    priority: rule.priority,
  }

  const matches = matchesTrigger(tx, ruleObj.triggerType, ruleObj.triggerConfig)

  res.json({
    success: true,
    data: {
      matches,
      transaction: tx,
      rule: ruleObj,
    },
  })
})

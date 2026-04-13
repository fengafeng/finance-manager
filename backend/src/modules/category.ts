import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const categoryRouter: Router = Router()

// ============================================
// Validation Schemas
// ============================================

const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['INCOME', 'EXPENSE']).default('EXPENSE'),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
})

const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
})

const listCategoriesSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
})

const deleteCategorySchema = z.object({
  id: z.string().uuid(),
})

// ============================================
// Routes
// ============================================

/**
 * 获取分类列表（树形结构）
 */
categoryRouter.post('/list', validate(listCategoriesSchema), async (req: Request, res: Response) => {
  const { type } = req.body

  const where: Prisma.CategoryWhereInput = {}
  if (type) where.type = type

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      children: true,
    },
  })

  // 只返回顶级分类（parentId 为 null）
  const rootCategories = categories.filter(c => !c.parentId)

  res.json({
    success: true,
    data: rootCategories,
  })
})

/**
 * 获取所有分类（扁平列表）
 */
categoryRouter.post('/all', validate(listCategoriesSchema), async (req: Request, res: Response) => {
  const { type } = req.body

  const where: Prisma.CategoryWhereInput = {}
  if (type) where.type = type

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  res.json({
    success: true,
    data: categories,
  })
})

/**
 * 创建分类
 */
categoryRouter.post('/create', validate(createCategorySchema), async (req: Request, res: Response) => {
  const data = req.body

  const category = await prisma.category.create({
    data: {
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    },
    include: {
      parent: true,
    },
  })

  res.json({
    success: true,
    data: category,
  })
})

/**
 * 更新分类
 */
categoryRouter.post('/update', validate(updateCategorySchema), async (req: Request, res: Response) => {
  const { id, ...data } = req.body

  const category = await prisma.category.update({
    where: { id },
    data,
    include: {
      parent: true,
    },
  })

  res.json({
    success: true,
    data: category,
  })
})

/**
 * 删除分类
 */
categoryRouter.post('/delete', validate(deleteCategorySchema), async (req: Request, res: Response) => {
  const { id } = req.body

  // 检查是否有子分类
  const children = await prisma.category.count({
    where: { parentId: id },
  })

  if (children > 0) {
    res.status(400).json({
      success: false,
      error: 'Cannot delete category with children',
    })
    return
  }

  await prisma.category.delete({
    where: { id },
  })

  res.json({
    success: true,
  })
})

/**
 * 初始化默认分类
 */
categoryRouter.post('/init-defaults', async (_req: Request, res: Response) => {
  const expenseCategories = [
    { name: '餐饮', icon: 'utensils', color: '#ef4444' },
    { name: '交通', icon: 'car', color: '#f97316' },
    { name: '购物', icon: 'shopping-bag', color: '#eab308' },
    { name: '娱乐', icon: 'gamepad', color: '#22c55e' },
    { name: '居住', icon: 'home', color: '#3b82f6' },
    { name: '通讯', icon: 'phone', color: '#8b5cf6' },
    { name: '医疗', icon: 'heart', color: '#ec4899' },
    { name: '教育', icon: 'book', color: '#06b6d4' },
    { name: '其他', icon: 'more-horizontal', color: '#6b7280' },
  ]

  const incomeCategories = [
    { name: '工资', icon: 'briefcase', color: '#22c55e' },
    { name: '奖金', icon: 'gift', color: '#eab308' },
    { name: '投资收益', icon: 'trending-up', color: '#3b82f6' },
    { name: '其他收入', icon: 'plus-circle', color: '#8b5cf6' },
  ]

  const existing = await prisma.category.count()
  if (existing > 0) {
    res.json({
      success: true,
      message: 'Categories already exist',
    })
    return
  }

  await prisma.category.createMany({
    data: [
      ...expenseCategories.map((c, i) => ({
        name: c.name,
        type: 'EXPENSE' as const,
        icon: c.icon,
        color: c.color,
        sortOrder: i,
      })),
      ...incomeCategories.map((c, i) => ({
        name: c.name,
        type: 'INCOME' as const,
        icon: c.icon,
        color: c.color,
        sortOrder: i,
      })),
    ],
  })

  res.json({
    success: true,
    message: 'Default categories created',
  })
})

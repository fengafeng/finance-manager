/**
 * 导入配置模块
 * 管理支付宝、微信、银行账户的导入配置
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { z } from 'zod';
import { validate } from '../middleware/validation';

export const importConfigRouter: Router = Router();

// ============================================
// Validation Schemas
// ============================================

const createImportConfigSchema = z.object({
  name: z.string().min(1).max(100),
  sourceType: z.enum(['IMPORT_ALIPAY', 'IMPORT_WECHAT', 'IMPORT_BANK']),
  linkedAccountId: z.string().uuid().optional().nullable(),
  thirdPartyAccount: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  defaultCategory: z.string().optional().nullable(),
  autoTag: z.boolean().optional().default(false),
  skipInternal: z.boolean().optional().default(true),
  mergeSimilar: z.boolean().optional().default(false),
  remark: z.string().optional().nullable(),
});

const updateImportConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  sourceType: z.enum(['IMPORT_ALIPAY', 'IMPORT_WECHAT', 'IMPORT_BANK']).optional(),
  linkedAccountId: z.string().uuid().optional().nullable(),
  thirdPartyAccount: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  defaultCategory: z.string().optional().nullable(),
  autoTag: z.boolean().optional(),
  skipInternal: z.boolean().optional(),
  mergeSimilar: z.boolean().optional(),
  isActive: z.boolean().optional(),
  remark: z.string().optional().nullable(),
});

const deleteImportConfigSchema = z.object({
  id: z.string().uuid(),
});

// ============================================
// Helper Functions
// ============================================

// 获取来源类型的中文标签
function getSourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    IMPORT_ALIPAY: '支付宝',
    IMPORT_WECHAT: '微信支付',
    IMPORT_BANK: '银行',
  };
  return labels[type] || type;
}

// ============================================
// Routes
// ============================================

/**
 * 获取导入配置列表
 * GET /api/import-config/list
 */
importConfigRouter.get('/list', async (_req: Request, res: Response) => {
  const configs = await prisma.importConfig.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      linkedAccount: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: configs.map(config => ({
      ...config,
      sourceTypeLabel: getSourceTypeLabel(config.sourceType),
    })),
  });
});

/**
 * 获取导入配置汇总
 * GET /api/import-config/summary
 */
importConfigRouter.get('/summary', async (_req: Request, res: Response) => {
  const configs = await prisma.importConfig.findMany({
    where: { isActive: true },
  });

  const summary = {
    alipay: { configCount: 0, lastImportAt: null as string | null },
    wechat: { configCount: 0, lastImportAt: null as string | null },
    bank: { configCount: 0, lastImportAt: null as string | null },
  };

  for (const config of configs) {
    if (config.sourceType === 'IMPORT_ALIPAY') {
      summary.alipay.configCount++;
      if (!summary.alipay.lastImportAt && config.lastImportAt) {
        summary.alipay.lastImportAt = config.lastImportAt.toISOString();
      }
    } else if (config.sourceType === 'IMPORT_WECHAT') {
      summary.wechat.configCount++;
      if (!summary.wechat.lastImportAt && config.lastImportAt) {
        summary.wechat.lastImportAt = config.lastImportAt.toISOString();
      }
    } else if (config.sourceType === 'IMPORT_BANK') {
      summary.bank.configCount++;
      if (!summary.bank.lastImportAt && config.lastImportAt) {
        summary.bank.lastImportAt = config.lastImportAt.toISOString();
      }
    }
  }

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * 获取单个导入配置
 * GET /api/import-config/get/:id
 */
importConfigRouter.get('/get/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const config = await prisma.importConfig.findUnique({
    where: { id },
    include: {
      linkedAccount: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  if (!config) {
    res.status(404).json({
      success: false,
      error: '配置不存在',
    });
    return;
  }

  res.json({
    success: true,
    data: {
      ...config,
      sourceTypeLabel: getSourceTypeLabel(config.sourceType),
    },
  });
});

/**
 * 创建导入配置
 * POST /api/import-config/create
 */
importConfigRouter.post('/create', validate(createImportConfigSchema), async (req: Request, res: Response) => {
  const data = req.body;

  // 验证关联账户存在且类型匹配
  if (data.linkedAccountId) {
    const account = await prisma.account.findUnique({
      where: { id: data.linkedAccountId },
    });

    if (!account) {
      res.status(400).json({
        success: false,
        error: '关联的账户不存在',
      });
      return;
    }

    // 检查类型匹配
    const validCombinations: Record<string, string[]> = {
      IMPORT_ALIPAY: ['ALIPAY'],
      IMPORT_WECHAT: ['WECHAT'],
      IMPORT_BANK: ['BANK', 'CREDIT_CARD'],
    };

    if (!validCombinations[data.sourceType]?.includes(account.type)) {
      res.status(400).json({
        success: false,
        error: `${getSourceTypeLabel(data.sourceType)}导入配置只能关联对应的账户类型`,
      });
      return;
    }
  }

  const config = await prisma.importConfig.create({
    data: {
      name: data.name,
      sourceType: data.sourceType,
      linkedAccountId: data.linkedAccountId,
      thirdPartyAccount: data.thirdPartyAccount,
      nickname: data.nickname,
      defaultCategory: data.defaultCategory,
      autoTag: data.autoTag ?? false,
      skipInternal: data.skipInternal ?? true,
      mergeSimilar: data.mergeSimilar ?? false,
      remark: data.remark,
    },
    include: {
      linkedAccount: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      ...config,
      sourceTypeLabel: getSourceTypeLabel(config.sourceType),
    },
  });
});

/**
 * 更新导入配置
 * POST /api/import-config/update
 */
importConfigRouter.post('/update', validate(updateImportConfigSchema), async (req: Request, res: Response) => {
  const { id, ...data } = req.body;

  const config = await prisma.importConfig.update({
    where: { id },
    data: {
      name: data.name,
      sourceType: data.sourceType,
      linkedAccountId: data.linkedAccountId,
      thirdPartyAccount: data.thirdPartyAccount,
      nickname: data.nickname,
      defaultCategory: data.defaultCategory,
      autoTag: data.autoTag,
      skipInternal: data.skipInternal,
      mergeSimilar: data.mergeSimilar,
      isActive: data.isActive,
      remark: data.remark,
    },
    include: {
      linkedAccount: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      ...config,
      sourceTypeLabel: getSourceTypeLabel(config.sourceType),
    },
  });
});

/**
 * 删除导入配置
 * POST /api/import-config/delete
 */
importConfigRouter.post('/delete', validate(deleteImportConfigSchema), async (req: Request, res: Response) => {
  const { id } = req.body;

  await prisma.importConfig.delete({
    where: { id },
  });

  res.json({
    success: true,
  });
});

/**
 * 获取可导入的信息类型
 * GET /api/import-config/importable-types
 */
importConfigRouter.get('/importable-types', async (_req: Request, res: Response) => {
  const importableTypes = [
    {
      type: 'ALIPAY_BILL_SUMMARY',
      label: '支付宝年度账单汇总',
      description: '支付宝年度账单，包含全年收支总览、消费分析等',
      supportedFormats: ['CSV', 'PDF', 'HTML'],
      example: '支付宝-年度账单-2025.html',
    },
    {
      type: 'ALIPAY_MONTHLY_STATS',
      label: '支付宝月度统计',
      description: '支付宝每月收支统计、月度趋势分析',
      supportedFormats: ['CSV'],
      example: '支付宝月度统计.csv',
    },
    {
      type: 'ALIPAY_MERCHANT_STATS',
      label: '支付宝商家消费分析',
      description: '支付宝商家消费明细和分类统计',
      supportedFormats: ['CSV'],
      example: '商家消费明细.csv',
    },
    {
      type: 'WECHAT_YEAR_SUMMARY',
      label: '微信年度账单',
      description: '微信支付年度账单，包含消费分布、年支出统计',
      supportedFormats: ['CSV', 'PDF'],
      example: '微信支付-年度账单-2025.html',
    },
    {
      type: 'WECHAT_MONTHLY_STATS',
      label: '微信月度统计',
      description: '微信每月收支统计、月度趋势分析',
      supportedFormats: ['CSV'],
      example: '微信月度统计.csv',
    },
    {
      type: 'WECHAT_MERCHANT_STATS',
      label: '微信商家消费分析',
      description: '微信商家消费明细和分类统计',
      supportedFormats: ['CSV'],
      example: '微信商家消费.csv',
    },
    {
      type: 'BANK_STATEMENT',
      label: '银行对账单',
      description: '银行账户交易流水、对账单',
      supportedFormats: ['CSV', 'PDF', 'Excel'],
      example: '银行对账单.csv',
    },
    {
      type: 'CREDIT_CARD_BILL',
      label: '信用卡账单',
      description: '信用卡电子账单，包含消费明细、还款信息',
      supportedFormats: ['CSV', 'PDF', 'HTML'],
      example: '信用卡账单.pdf',
    },
  ];

  res.json({
    success: true,
    data: importableTypes,
  });
});

/**
 * 更新导入记录
 * POST /api/import-config/update-last-import
 * 在导入完成后调用，更新配置的最后导入信息
 */
importConfigRouter.post('/update-last-import', async (req: Request, res: Response) => {
  const { configId, importCount } = req.body;

  if (!configId) {
    res.status(400).json({
      success: false,
      error: '缺少配置ID',
    });
    return;
  }

  const config = await prisma.importConfig.update({
    where: { id: configId },
    data: {
      lastImportAt: new Date(),
      lastImportCount: importCount ?? null,
    },
  });

  res.json({
    success: true,
    data: config,
  });
});

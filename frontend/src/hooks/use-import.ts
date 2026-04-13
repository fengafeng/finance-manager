import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Account } from '@/types';

// 导入来源类型
export type ImportSourceType = 'ALIPAY' | 'WECHAT' | 'BANK';

// 解析后的单条交易
export interface ParsedTransaction {
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  merchant: string;
  description: string;
  status: 'success' | 'refund';
  raw: Record<string, string>;
}

// 上传结果
export interface UploadResult {
  sessionId: string;
  fileName: string;
  sourceType: ImportSourceType;
  accountId: string;
  totalCount: number;
  incomeCount: number;
  expenseCount: number;
  refundCount: number;
  incomeTotal: number;
  expenseTotal: number;
  dateRange: { start: string; end: string };
  preview: ParsedTransaction[];
}

// 导入历史记录
export interface ImportRecord {
  id: string;
  sourceType: string;
  fileName: string;
  totalCount: number;
  successCount: number;
  skipCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  successRate: number;
}

// 上传账单
export function useImportUpload() {
  return useMutation({
    mutationFn: async ({
      file,
      sourceType,
      accountId,
    }: {
      file: File;
      sourceType: ImportSourceType;
      accountId: string;
    }): Promise<UploadResult> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', sourceType);
      formData.append('accountId', accountId);

      const { data } = await apiClient.post<{ success: boolean; data: UploadResult }>(
        '/import/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return data.data;
    },
  });
}

// 预览完整列表
export function useImportPreview(sessionId: string) {
  return useQuery({
    queryKey: ['import', 'preview', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          sessionId: string;
          fileName: string;
          sourceType: string;
          totalCount: number;
          transactions: ParsedTransaction[];
          accountId: string;
        };
      }>('/import/preview', { sessionId });
      return data.data;
    },
    enabled: !!sessionId,
  });
}

// 确认导入
export function useImportConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      accountId,
      categoryMapping,
      skipDuplicates = true,
    }: {
      sessionId: string;
      accountId: string;
      categoryMapping?: Record<string, string>;
      skipDuplicates?: boolean;
    }) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          importBatchId: string;
          totalCount: number;
          successCount: number;
          skipCount: number;
        };
      }>('/import/confirm', {
        sessionId,
        accountId,
        categoryMapping,
        skipDuplicates,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['import', 'history'] });
    },
  });
}

// 导入历史
export function useImportHistory() {
  return useQuery({
    queryKey: ['import', 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: ImportRecord[] }>(
        '/import/history'
      );
      return data.data;
    },
  });
}

// 账户选项（排除已归档）
export function useImportAccounts() {
  return useQuery({
    queryKey: ['import', 'accounts'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Account[] }>(
        '/accounts/list',
        { includeArchived: false }
      );
      return data.data;
    },
  });
}

// 下载模板
export function downloadTemplate(type: ImportSourceType) {
  const baseUrl = '/api';
  const link = document.createElement('a');
  link.href = `${baseUrl}/import/template/${type}`;
  link.download = `${type === 'ALIPAY' ? '支付宝' : type === 'WECHAT' ? '微信' : '银行'}账单导入模板.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

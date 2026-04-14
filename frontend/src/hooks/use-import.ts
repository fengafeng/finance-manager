import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type ImportSourceType = 'ALIPAY' | 'WECHAT' | 'BANK';

export type CleanedTransaction = {
  date: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  merchant: string;
  description: string;
  paymentMethod: string;
  cleanType: 'REFUND' | 'INTERNAL_TRANSFER' | 'DEPOSIT' | null;
  cleanReason: string | null;
};

export type ImportStats = {
  total: number;
  income: number;
  expense: number;
  cleanedByRefund: number;
  cleanedByTransfer: number;
  cleanedByDeposit: number;
};

export type UploadResult = {
  sessionId: string;
  fileName: string;
  totalRecords: number;
  income: number;
  expense: number;
  stats: ImportStats;
  dateRange: { start: string; end: string };
  preview: CleanedTransaction[];
};

export type PreviewResult = {
  sessionId: string;
  transactions: CleanedTransaction[];
  stats: ImportStats;
};

export function useImportUpload() {
  return useMutation({
    mutationFn: async ({ file, accountId }: { file: File; accountId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (accountId) {
        formData.append('accountId', accountId);
      }
      // 注意：不要手动设置 Content-Type，让 axios 自动添加 boundary
      const response = await apiClient.post('/import/upload', formData);
      return response.data;
    },
  });
}

export function useImportPreview(sessionId: string) {
  return useQuery({
    queryKey: ['import-preview', sessionId],
    queryFn: async () => {
      const response = await apiClient.post('/import/preview', { sessionId });
      return response.data;
    },
    enabled: !!sessionId,
  });
}

export function useImportConfirm() {
  return useMutation({
    mutationFn: async ({ sessionId, accountId, importCleaned }: {
      sessionId: string;
      accountId: string;
      importCleaned?: boolean;
    }) => {
      const response = await apiClient.post('/import/confirm', {
        sessionId,
        accountId,
        importCleaned,
      });
      return response.data;
    },
  });
}

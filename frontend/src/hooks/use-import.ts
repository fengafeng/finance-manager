import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type ImportSourceType = 'ALIPAY' | 'WECHAT' | 'BANK' | 'OTHER';
export type ParsedTransaction = {
  id?: number;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category?: string;
  account?: string;
  parsed?: boolean;
};

export function useImportUpload() {
  return useMutation({
    mutationFn: async ({ file, sourceType, accountId }: { file: File; sourceType: ImportSourceType; accountId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', sourceType);
      if (accountId) {
        formData.append('accountId', accountId);
      }
      const response = await apiClient.post('/import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
    mutationFn: async ({ sessionId, accountId, categoryMapping, skipDuplicates }: { 
      sessionId: string; 
      accountId: string; 
      categoryMapping?: Record<string, string>;
      skipDuplicates?: boolean;
    }) => {
      const response = await apiClient.post('/import/confirm', {
        sessionId,
        accountId,
        categoryMapping,
        skipDuplicates,
      });
      return response.data;
    },
  });
}

export function useImportHistory() {
  return useQuery({
    queryKey: ['import-history'],
    queryFn: async () => {
      const response = await apiClient.get('/import/history');
      return response.data || [];
    },
  });
}

export function downloadTemplate(sourceType: ImportSourceType) {
  window.open(`/api/import/template/${sourceType}`, '_blank');
}

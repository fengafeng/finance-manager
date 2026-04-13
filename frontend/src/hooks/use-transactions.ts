import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Transaction, TransactionStatistics, TransactionType } from '@/types';

interface TransactionListParams {
  accountId?: string;
  type?: TransactionType;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// 获取交易列表
export function useTransactions(params: TransactionListParams = {}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          items: Transaction[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      }>('/transactions/list', params);
      return data.data;
    },
  });
}

// 获取交易统计
export function useTransactionStatistics(params: { startDate?: string; endDate?: string; accountId?: string } = {}) {
  return useQuery({
    queryKey: ['transactions', 'statistics', params],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: TransactionStatistics }>(
        '/transactions/statistics',
        params
      );
      return data.data;
    },
  });
}

// 获取交易详情
export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Transaction }>('/transactions/get', { id });
      return data.data;
    },
    enabled: !!id,
  });
}

// 创建交易
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: Partial<Transaction>) => {
      const { data } = await apiClient.post<{ success: boolean; data: Transaction }>('/transactions/create', transaction);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// 更新交易
export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data } = await apiClient.post<{ success: boolean; data: Transaction }>('/transactions/update', { id, ...updates });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// 删除交易
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post('/transactions/delete', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

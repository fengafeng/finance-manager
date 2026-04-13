import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Fund, FundSummary, FundType } from '@/types';

// 获取基金列表
export function useFunds(type?: FundType) {
  return useQuery({
    queryKey: ['funds', { type }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Fund[] }>('/funds/list', { type });
      return data.data;
    },
  });
}

// 获取基金汇总
export function useFundSummary() {
  return useQuery({
    queryKey: ['funds', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: FundSummary }>('/funds/summary');
      return data.data;
    },
  });
}

// 获取基金详情
export function useFund(id: string) {
  return useQuery({
    queryKey: ['funds', id],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Fund & { transactions: unknown[] } }>('/funds/get', { id });
      return data.data;
    },
    enabled: !!id,
  });
}

// 创建基金
export function useCreateFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fund: Partial<Fund>) => {
      const { data } = await apiClient.post<{ success: boolean; data: Fund }>('/funds/create', fund);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] });
    },
  });
}

// 更新基金
export function useUpdateFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Fund> & { id: string }) => {
      const { data } = await apiClient.post<{ success: boolean; data: Fund }>('/funds/update', { id, ...updates });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] });
    },
  });
}

// 删除基金
export function useDeleteFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post('/funds/delete', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] });
    },
  });
}

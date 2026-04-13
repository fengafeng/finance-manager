import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Budget } from '@/types';

interface UpsertBudgetData {
  yearMonth: string;
  expectedIncome?: number;
  expectedExpense?: number;
  actualIncome?: number | null;
  actualExpense?: number | null;
  remark?: string;
}

// 获取预算列表
export function useBudgets(limit = 12) {
  return useQuery({
    queryKey: ['budgets', limit],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Budget[] }>('/budgets/list', { limit });
      return data.data;
    },
  });
}

// 获取指定月份预算
export function useBudget(yearMonth: string) {
  return useQuery({
    queryKey: ['budgets', yearMonth],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Budget | null }>('/budgets/get', { yearMonth });
      return data.data;
    },
    enabled: !!yearMonth,
  });
}

// 创建或更新预算
export function useUpsertBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (budgetData: UpsertBudgetData) => {
      const { data } = await apiClient.post<{ success: boolean; data: Budget }>('/budgets/upsert', budgetData);
      return data.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', variables.yearMonth] });
    },
  });
}

// 删除预算
export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (yearMonth: string) => {
      await apiClient.post('/budgets/delete', { yearMonth });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

// 同步实际收支
export function useSyncActualBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (yearMonth: string) => {
      const { data } = await apiClient.post<{ success: boolean; data: Budget }>('/budgets/sync-actual', { yearMonth });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

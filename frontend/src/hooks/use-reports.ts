import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { OverviewData } from '@/types';

// 获取资产概览
export function useOverview() {
  return useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: OverviewData }>('/reports/overview');
      return data.data;
    },
  });
}

// 获取收支报表
export function useIncomeExpenseReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', 'income-expense', { startDate, endDate }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: {
        daily: Array<{ date: string; income: number; expense: number }>;
        total: { income: number; expense: number; balance: number };
      } }>('/reports/income-expense', { startDate, endDate });
      return data.data;
    },
    enabled: !!startDate && !!endDate,
  });
}

// 获取分类分析
export function useCategoryAnalysis(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', 'category-analysis', { startDate, endDate }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Array<{
        category: string | null;
        type: string;
        amount: number;
        count: number;
      }> }>('/reports/category-analysis', { startDate, endDate });
      return data.data;
    },
    enabled: !!startDate && !!endDate,
  });
}

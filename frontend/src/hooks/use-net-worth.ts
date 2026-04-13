import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { NetWorthSnapshot, NetWorthBreakdown } from '@/types';

// 获取净资产快照列表
export function useNetWorthSnapshots(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['net-worth', 'snapshots', { startDate, endDate }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: NetWorthSnapshot[] }>(
        '/net-worth/snapshots',
        { startDate, endDate }
      );
      return data.data;
    },
  });
}

// 获取最新净资产
export function useLatestNetWorth() {
  return useQuery({
    queryKey: ['net-worth', 'latest'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: NetWorthSnapshot & { isLive?: boolean } }>(
        '/net-worth/latest'
      );
      return data.data;
    },
  });
}

// 获取资产构成明细
export function useNetWorthBreakdown() {
  return useQuery({
    queryKey: ['net-worth', 'breakdown'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: NetWorthBreakdown }>(
        '/net-worth/breakdown'
      );
      return data.data;
    },
  });
}

// 创建净资产快照
export function useCreateNetWorthSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotDate?: string) => {
      const { data } = await apiClient.post<{ success: boolean; data: NetWorthSnapshot }>(
        '/net-worth/create-snapshot',
        { snapshotDate: snapshotDate || new Date().toISOString().split('T')[0] }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
    },
  });
}

// 获取净资产趋势
export function useNetWorthTrend(months: number = 6) {
  return useQuery({
    queryKey: ['net-worth', 'trend', { months }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Array<{
        date: string;
        totalAssets: number;
        totalLiabilities: number;
        netWorth: number;
      }> }>('/net-worth/trend', { months });
      return data.data;
    },
  });
}

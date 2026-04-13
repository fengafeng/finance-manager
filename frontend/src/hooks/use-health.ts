import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { HealthReport } from '@/types';

// 获取最新健康报告
export function useLatestHealthReport() {
  return useQuery({
    queryKey: ['health', 'latest'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: HealthReport & { isNew?: boolean } }>(
        '/health/latest'
      );
      return data.data;
    },
  });
}

// 生成健康报告
export function useGenerateHealthReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: HealthReport }>(
        '/health/generate'
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });
}

// 获取历史健康报告
export function useHealthHistory(limit: number = 12) {
  return useQuery({
    queryKey: ['health', 'history', { limit }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: HealthReport[] }>(
        '/health/history',
        { limit }
      );
      return data.data;
    },
  });
}

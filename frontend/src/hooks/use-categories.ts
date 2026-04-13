import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Category, TransactionType } from '@/types';

// 获取分类列表（树形）
export function useCategories(type?: TransactionType) {
  return useQuery({
    queryKey: ['categories', { type }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Category[] }>('/categories/list', { type });
      return data.data;
    },
  });
}

// 获取所有分类（扁平）
export function useAllCategories(type?: TransactionType) {
  return useQuery({
    queryKey: ['categories', 'all', { type }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Category[] }>('/categories/all', { type });
      return data.data;
    },
  });
}

// 创建分类
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: Partial<Category>) => {
      const { data } = await apiClient.post<{ success: boolean; data: Category }>('/categories/create', category);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// 初始化默认分类
export function useInitDefaultCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; message: string }>('/categories/init-defaults');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

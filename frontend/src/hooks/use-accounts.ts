import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Account, AccountSummary, AccountType } from '@/types';

// 获取账户列表
export function useAccounts(includeArchived = false, type?: AccountType) {
  return useQuery({
    queryKey: ['accounts', { includeArchived, type }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Account[] }>('/accounts/list', {
        includeArchived,
        type,
      });
      return data.data;
    },
  });
}

// 获取账户汇总
export function useAccountSummary() {
  return useQuery({
    queryKey: ['accounts', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: AccountSummary }>('/accounts/summary');
      return data.data;
    },
  });
}

// 获取账户详情
export function useAccount(id: string) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Account }>('/accounts/get', { id });
      return data.data;
    },
    enabled: !!id,
  });
}

// 创建账户
export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: Partial<Account>) => {
      const { data } = await apiClient.post<{ success: boolean; data: Account }>('/accounts/create', account);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// 更新账户
export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Account> & { id: string }) => {
      const { data } = await apiClient.post<{ success: boolean; data: Account }>('/accounts/update', { id, ...updates });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// 删除账户
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post('/accounts/delete', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

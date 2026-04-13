import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProvidentFund, ProvidentFundSummary } from '@/types';

interface CreatePFData {
  name: string;
  city: string;
  accountNumber?: string;
  balance: number;
  monthlyContribution?: number;
  personalContribution?: number;
  employerContribution?: number;
  interestRate?: number;
  accountStatus?: string;
  includeNetWorth?: boolean;
  remark?: string;
}

interface UpdatePFData {
  id: string;
  name?: string;
  city?: string;
  accountNumber?: string | null;
  balance?: number;
  monthlyContribution?: number;
  personalContribution?: number | null;
  employerContribution?: number | null;
  interestRate?: number | null;
  accountStatus?: string;
  includeNetWorth?: boolean;
  remark?: string | null;
}

// 获取公积金账户列表
export function useProvidentFunds() {
  return useQuery({
    queryKey: ['provident-funds'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: ProvidentFund[] }>('/provident-funds/list');
      return data.data;
    },
  });
}

// 获取单个公积金账户
export function useProvidentFund(id: string) {
  return useQuery({
    queryKey: ['provident-funds', id],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: ProvidentFund }>('/provident-funds/get', { id });
      return data.data;
    },
    enabled: !!id,
  });
}

// 创建公积金账户
export function useCreateProvidentFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pfData: CreatePFData) => {
      const { data } = await apiClient.post<{ success: boolean; data: ProvidentFund }>('/provident-funds/create', pfData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provident-funds'] });
    },
  });
}

// 更新公积金账户
export function useUpdateProvidentFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pfData: UpdatePFData) => {
      const { data } = await apiClient.post<{ success: boolean; data: ProvidentFund }>('/provident-funds/update', pfData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provident-funds'] });
    },
  });
}

// 删除公积金账户
export function useDeleteProvidentFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post('/provident-funds/delete', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provident-funds'] });
    },
  });
}

// 更新余额
export function useUpdatePFBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const { data } = await apiClient.post<{ success: boolean; data: ProvidentFund }>('/provident-funds/update-balance', { id, balance });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provident-funds'] });
    },
  });
}

// 获取汇总
export function useProvidentFundSummary() {
  return useQuery({
    queryKey: ['provident-funds', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: ProvidentFundSummary }>('/provident-funds/summary');
      return data.data;
    },
  });
}

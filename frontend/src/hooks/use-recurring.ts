import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { RecurringBill, CycleType } from '@/types';

interface CreateRecurringBillData {
  name: string;
  merchantPattern?: string;
  amountPattern?: string;
  cycleType: CycleType;
  cycleDay?: number;
  reminderDays?: number;
}

// 获取自动识别的候选账单
export function useRecurringSuggestions() {
  return useQuery({
    queryKey: ['recurring', 'suggestions'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Array<{
        name: string;
        merchantPattern: string;
        amountPattern: string;
        cycleType: string;
        occurrences: number;
        lastDate: string;
        avgAmount: number;
      }> }>('/recurring/suggestions');
      return data.data;
    },
  });
}

// 确认候选账单
export function useConfirmRecurringBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (billData: CreateRecurringBillData) => {
      const { data } = await apiClient.post<{ success: boolean; data: RecurringBill }>(
        '/recurring/confirm',
        billData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

// 获取定期账单列表
export function useRecurringBills(includeInactive = false) {
  return useQuery({
    queryKey: ['recurring', 'list', { includeInactive }],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: RecurringBill[] }>(
        '/recurring/list',
        { includeInactive }
      );
      return data.data;
    },
  });
}

// 创建定期账单
export function useCreateRecurringBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (billData: CreateRecurringBillData) => {
      const { data } = await apiClient.post<{ success: boolean; data: RecurringBill }>(
        '/recurring/create',
        billData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

// 更新定期账单
export function useUpdateRecurringBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RecurringBill> & { id: string }) => {
      const { data: result } = await apiClient.post<{ success: boolean; data: RecurringBill }>(
        '/recurring/update',
        { id, ...data }
      );
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

// 删除定期账单
export function useDeleteRecurringBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post('/recurring/delete', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

// 获取即将到期的账单提醒
export function useRecurringReminders() {
  return useQuery({
    queryKey: ['recurring', 'reminders'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: RecurringBill[] }>(
        '/recurring/reminders'
      );
      return data.data;
    },
  });
}

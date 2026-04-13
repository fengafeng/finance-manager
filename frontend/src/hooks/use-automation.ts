import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AutomationRule } from '@/types';

type TriggerType = 'merchant' | 'category' | 'amount' | 'combination';
type ActionType = 'add_tag' | 'set_category' | 'send_notification' | 'mark_review';

interface CreateRuleData {
  name: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  actionType: ActionType;
  actionConfig: Record<string, any>;
  priority?: number;
}

// 获取规则列表
export function useAutomationRules() {
  return useQuery({
    queryKey: ['automation', 'rules'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: AutomationRule[] }>(
        '/automation/list'
      );
      return data.data;
    },
  });
}

// 创建规则
export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ruleData: CreateRuleData) => {
      const { data } = await apiClient.post<{ success: boolean; data: AutomationRule }>(
        '/automation/create',
        ruleData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

// 更新规则
export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AutomationRule> & { id: string }) => {
      const { data: result } = await apiClient.post<{ success: boolean; data: AutomationRule }>(
        '/automation/update',
        { id, ...data }
      );
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

// 删除规则
export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post('/automation/delete', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

// 切换规则状态
export function useToggleAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<{ success: boolean; data: AutomationRule }>(
        '/automation/toggle',
        { id }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

// 测试规则
export function useTestAutomationRule() {
  return useMutation({
    mutationFn: async ({ ruleId, transactionId }: { ruleId: string; transactionId: string }) => {
      const { data } = await apiClient.post<{ success: boolean; data: {
        matches: boolean;
        transaction: any;
        rule: AutomationRule;
      } }>('/automation/test', { ruleId, transactionId });
      return data.data;
    },
  });
}

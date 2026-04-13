import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// 单条解析结果类型
export interface NaturalAddItem {
  module: 'account' | 'transaction' | 'fund' | 'loan';
  confidence: number;
  parsed: Record<string, any>;
  rawText: string;
  ambiguous: boolean;
  accounts?: Array<{ id: string; name: string; type: string }>;
  message: string;
}

// 解析结果返回类型
export interface NaturalAddResult {
  items: NaturalAddItem[];
  count: number;
  accounts: Array<{ id: string; name: string; type: string }>;
}

// 自然语言解析
export function useNaturalAdd() {
  return useMutation({
    mutationFn: async (text: string): Promise<NaturalAddResult> => {
      const { data } = await apiClient.post<{ success: boolean; data: NaturalAddResult }>(
        '/ai-chat/natural-add',
        { text }
      );
      return data.data;
    },
  });
}

// 自然语言确认创建
export function useNaturalCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ module, data }: { module: string; data: any }) => {
      const { data: result } = await apiClient.post<{ success: boolean; data: any; message: string }>(
        '/ai-chat/natural-create',
        { module, data }
      );
      return result;
    },
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// 账户选项（用于交易创建时选择账户）
export function useAccountOptions() {
  const { data } = useQuery({
    queryKey: ['accounts', 'options'],
    queryFn: async () => {
      const res = await apiClient.post<{ success: boolean; data: any[] }>('/accounts/list', {
        includeArchived: false,
      });
      return res.data.data;
    },
  });
  return data || [];
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ImportConfig, ImportConfigSourceType, ImportableInfoItem } from '@/types';

// ============================================
// 导入配置查询
// ============================================

// 获取导入配置列表
export function useImportConfigs() {
  return useQuery({
    queryKey: ['import-config', 'list'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        success: boolean;
        data: (ImportConfig & { sourceTypeLabel: string })[];
      }>('/import-config/list');
      return data.data;
    },
  });
}

// 获取导入配置汇总
export function useImportConfigSummary() {
  return useQuery({
    queryKey: ['import-config', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        success: boolean;
        data: {
          alipay: { configCount: number; lastImportAt: string | null };
          wechat: { configCount: number; lastImportAt: string | null };
          bank: { configCount: number; lastImportAt: string | null };
        };
      }>('/import-config/summary');
      return data.data;
    },
  });
}

// 获取单个导入配置
export function useImportConfig(id: string) {
  return useQuery({
    queryKey: ['import-config', 'get', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        success: boolean;
        data: ImportConfig & { sourceTypeLabel: string };
      }>(`/import-config/get/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// 获取可导入的信息类型
export function useImportableTypes() {
  return useQuery({
    queryKey: ['import-config', 'importable-types'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        success: boolean;
        data: ImportableInfoItem[];
      }>('/import-config/importable-types');
      return data.data;
    },
  });
}

// ============================================
// 导入配置操作
// ============================================

// 创建导入配置
export function useCreateImportConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      name: string;
      sourceType: ImportConfigSourceType;
      linkedAccountId?: string | null;
      thirdPartyAccount?: string | null;
      nickname?: string | null;
      defaultCategory?: string | null;
      autoTag?: boolean;
      skipInternal?: boolean;
      mergeSimilar?: boolean;
      remark?: string | null;
    }) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: ImportConfig & { sourceTypeLabel: string };
      }>('/import-config/create', config);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-config'] });
    },
  });
}

// 更新导入配置
export function useUpdateImportConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      id: string;
      name?: string;
      sourceType?: ImportConfigSourceType;
      linkedAccountId?: string | null;
      thirdPartyAccount?: string | null;
      nickname?: string | null;
      defaultCategory?: string | null;
      autoTag?: boolean;
      skipInternal?: boolean;
      mergeSimilar?: boolean;
      isActive?: boolean;
      remark?: string | null;
    }) => {
      const { id, ...updateData } = config;
      const { data } = await apiClient.post<{
        success: boolean;
        data: ImportConfig & { sourceTypeLabel: string };
      }>('/import-config/update', { id, ...updateData });
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['import-config'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['import-config', 'get', variables.id] });
      }
    },
  });
}

// 删除导入配置
export function useDeleteImportConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<{ success: boolean }>('/import-config/delete', { id });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-config'] });
    },
  });
}

// 更新最后导入信息
export function useUpdateLastImport() {
  return useMutation({
    mutationFn: async ({ configId, importCount }: { configId: string; importCount?: number }) => {
      const { data } = await apiClient.post<{ success: boolean; data: ImportConfig }>(
        '/import-config/update-last-import',
        { configId, importCount }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-config'] });
    },
  });
}

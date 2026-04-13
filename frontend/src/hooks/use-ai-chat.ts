import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  reply: string;
  usage?: {
    PromptTokens: number;
    CompletionTokens: number;
    TotalTokens: number;
  };
}

interface QuickQueryResponse {
  queryType: string;
  reply: string;
}

// AI对话
export function useAIChat() {
  return useMutation({
    mutationFn: async ({ message, history = [] }: { message: string; history?: ChatMessage[] }) => {
      const { data } = await apiClient.post<{ success: boolean; data: ChatResponse }>(
        '/ai-chat/chat',
        { message, history }
      );
      return data.data;
    },
  });
}

// 快捷查询
export function useQuickQuery() {
  return useMutation({
    mutationFn: async (queryType: string) => {
      const { data } = await apiClient.post<{ success: boolean; data: QuickQueryResponse }>(
        '/ai-chat/quick-query',
        { queryType }
      );
      return data.data;
    },
  });
}

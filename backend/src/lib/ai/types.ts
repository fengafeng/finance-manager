/**
 * AI Chat Adapter - 统一接口定义
 * 支持多模型：DeepSeek、OpenAI 兼容 API、腾讯云混元
 */

/** 统一消息格式（兼容 OpenAI） */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Token 用量统计 */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** AI 响应 */
export interface AIResponse {
  content: string;
  usage?: Usage;
  raw?: unknown;
}

/** AI Provider 配置 */
export interface AIProviderConfig {
  /** 提供者名称 */
  provider: string;
  /** 模型名称 */
  model?: string;
}

/** AI 适配器接口 */
export interface AIAdapter {
  /** 生成 AI 回复（非流式） */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse>;
  /** 生成 AI 回复（流式） */
  chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse>;
  /** 获取当前 Provider 信息 */
  getProviderInfo(): AIProviderConfig;
  /** 是否已启用 */
  isEnabled(): boolean;
}

/** 聊天选项 */
export interface ChatOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
}

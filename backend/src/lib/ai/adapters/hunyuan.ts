/**
 * 腾讯云混元大模型适配器
 * 封装现有的 HunyuanClient
 * @see https://cloud.tencent.com/document/product/1729/105701
 */

import { HunyuanClient, Message as HunyuanMessage } from '../../hunyuan-chat';
import { AIAdapter, ChatMessage, AIResponse, ChatOptions } from '../types.js';

export class HunyuanAdapter implements AIAdapter {
  private client: HunyuanClient | null = null;
  private enabled: boolean = false;
  private model: string;

  constructor(secretId: string, secretKey: string, region: string, model: string) {
    this.model = model || 'hunyuan-turbo';

    if (!secretId || !secretKey) {
      this.enabled = false;
      console.warn('[AI] 腾讯云混元未配置 (AI_PROVIDER=hunyuan)，AI 功能已禁用');
      return;
    }

    try {
      this.client = new HunyuanClient({ secretId, secretKey, region });
      this.enabled = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[AI] 腾讯云混元初始化失败: ${msg}，AI 功能已禁用`);
      this.enabled = false;
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    if (!this.enabled || !this.client) {
      throw new Error('腾讯云混元未启用');
    }

    const hunyuanMessages: HunyuanMessage[] = messages.map((m) => ({
      Role: m.role,
      Content: m.content,
    }));

    const response = await this.client.chatCompletions(hunyuanMessages, {
      Model: this.model,
      Temperature: options?.temperature,
      TopP: options?.topP,
    });

    return {
      content: response.Choices[0]?.Message?.Content || '',
      usage: response.Usage
        ? {
            promptTokens: response.Usage.PromptTokens,
            completionTokens: response.Usage.CompletionTokens,
            totalTokens: response.Usage.TotalTokens,
          }
        : undefined,
      raw: response,
    };
  }

  async chatStream(
    messages: ChatMessage[],
    options: ChatOptions | undefined,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    if (!this.enabled || !this.client) {
      throw new Error('腾讯云混元未启用');
    }

    const hunyuanMessages: HunyuanMessage[] = messages.map((m) => ({
      Role: m.role,
      Content: m.content,
    }));

    const response = await this.client.chatCompletionsStream(
      hunyuanMessages,
      { Model: this.model, Temperature: options?.temperature, TopP: options?.topP },
      (chunk: { Delta?: { Content?: string } }) => onChunk?.(chunk.Delta?.Content || '')
    );

    return {
      content: response.Choices[0]?.Message?.Content || '',
      usage: response.Usage
        ? {
            promptTokens: response.Usage.PromptTokens,
            completionTokens: response.Usage.CompletionTokens,
            totalTokens: response.Usage.TotalTokens,
          }
        : undefined,
    };
  }

  getProviderInfo() {
    return { provider: 'hunyuan', model: this.model };
  }

  isEnabled() {
    return this.enabled;
  }
}

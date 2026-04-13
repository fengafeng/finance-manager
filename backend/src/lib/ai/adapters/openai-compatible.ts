/**
 * OpenAI 兼容适配器
 * 适用于 OpenAI、Azure OpenAI、硅基流动等支持 OpenAI API 格式的服务
 */

import OpenAI from 'openai';
import { AIAdapter, ChatMessage, AIResponse, ChatOptions } from '../types.js';

export class OpenAICompatibleAdapter implements AIAdapter {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL: string, model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
    this.model = model || 'gpt-4o-mini';
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: false,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || '',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
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
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        onChunk?.(delta);
      }
    }

    return { content: fullContent };
  }

  getProviderInfo() {
    return { provider: 'openai', model: this.model };
  }

  isEnabled() {
    return true;
  }
}

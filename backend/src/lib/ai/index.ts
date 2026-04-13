/**
 * AI Provider 工厂
 * 根据环境变量选择并创建对应的 AI 适配器
 *
 * 支持的 Provider：
 * - deepseek       : DeepSeek (默认推荐，免费额度高)
 * - openai         : OpenAI / 硅基流动 / 其他 OpenAI 兼容 API
 * - hunyuan        : 腾讯云混元
 * - disabled       : 禁用 AI 功能
 *
 * 配置示例：
 *
 *  # 方式一：DeepSeek（推荐，免费好用）
 *  AI_PROVIDER=deepseek
 *  DEEPSEEK_API_KEY=sk-xxxxx
 *  DEEPSEEK_BASE_URL=https://api.deepseek.com
 *  DEEPSEEK_MODEL=deepseek-chat
 *
 *  # 方式二：OpenAI 兼容（硅基流动等）
 *  AI_PROVIDER=openai
 *  OPENAI_API_KEY=sk-xxxxx
 *  OPENAI_BASE_URL=https://api.siliconflow.cn/v1
 *  OPENAI_MODEL=gpt-4o-mini
 *
 *  # 方式三：腾讯云混元
 *  AI_PROVIDER=hunyuan
 *  TENCENT_SECRET_ID=AKIDxxxxx
 *  TENCENT_SECRET_KEY=xxxxx
 *  HUNYUAN_MODEL=hunyuan-turbo
 */

import { AIAdapter } from './types.js';
import { DeepSeekAdapter } from './adapters/deepseek.js';
import { OpenAICompatibleAdapter } from './adapters/openai-compatible.js';
import { HunyuanAdapter } from './adapters/hunyuan.js';

let _adapter: AIAdapter | null = null;

/**
 * 获取 AI 适配器实例（单例）
 */
export function getAIAdapter(): AIAdapter {
  if (_adapter) return _adapter;

  const provider = (process.env.AI_PROVIDER || 'disabled').toLowerCase().trim();
  let adapter: AIAdapter;

  switch (provider) {
    case 'deepseek': {
      const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || '';
      const baseURL = process.env.DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com';
      const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat';

      if (!apiKey) {
        console.warn('[AI] DeepSeek API Key 未配置，AI 功能已禁用');
        adapter = createDisabledAdapter();
      } else {
        console.log(`[AI] 初始化 DeepSeek (model: ${model})`);
        adapter = new DeepSeekAdapter(apiKey, baseURL, model);
      }
      break;
    }

    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY?.trim() || '';
      const baseURL = process.env.OPENAI_BASE_URL?.trim() || '';
      const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

      if (!apiKey || !baseURL) {
        console.warn('[AI] OpenAI API Key 或 BaseURL 未配置，AI 功能已禁用');
        adapter = createDisabledAdapter();
      } else {
        console.log(`[AI] 初始化 OpenAI 兼容 API (model: ${model})`);
        adapter = new OpenAICompatibleAdapter(apiKey, baseURL, model);
      }
      break;
    }

    case 'hunyuan': {
      const secretId = process.env.TENCENT_SECRET_ID?.trim() || '';
      const secretKey = process.env.TENCENT_SECRET_KEY?.trim() || '';
      const region = process.env.TENCENT_REGION?.trim() || 'ap-guangzhou';
      const model = process.env.HUNYUAN_MODEL?.trim() || 'hunyuan-turbo';

      console.log(`[AI] 初始化腾讯云混元 (model: ${model})`);
      adapter = new HunyuanAdapter(secretId, secretKey, region, model);
      break;
    }

    default:
      console.log('[AI] AI_PROVIDER 未配置或为 disabled，AI 功能已禁用');
      adapter = createDisabledAdapter();
  }

  _adapter = adapter;
  return _adapter;
}

/** 创建一个始终返回"未启用"的适配器 */
function createDisabledAdapter(): AIAdapter {
  return {
    async chat() {
      throw new Error('AI 功能未启用，请在 .env 中配置 AI_PROVIDER');
    },
    async chatStream() {
      throw new Error('AI 功能未启用，请在 .env 中配置 AI_PROVIDER');
    },
    getProviderInfo() {
      return { provider: 'disabled' };
    },
    isEnabled() {
      return false;
    },
  };
}

/** 获取当前 AI Provider 信息 */
export function getAIProviderInfo() {
  return getAIAdapter().getProviderInfo();
}

/** 检查 AI 是否已启用 */
export function isAIEnabled() {
  return getAIAdapter().isEnabled();
}

import { createOpenAI } from '@ai-sdk/openai';

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  compatibility: 'compatible',
});

export const defaultModel = process.env.LLM_MODEL || 'deepseek-chat';

export const defaultGenerateOptions = {
  model: openai(defaultModel),
  temperature: 0.2,
  maxRetries: 2,
} as const;

import type { OpenRouterUsage } from './openRouterJobTypes';
import { asOpenRouterRecord } from './openRouterJobRecordUtils';

export function extractOpenRouterJobText(result: unknown): string {
  const record = asOpenRouterRecord(result);
  const text = typeof record.text === 'string' ? record.text : '';
  if (text.trim()) return text;

  const payload = asOpenRouterRecord(record.payload);
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const content = asOpenRouterRecord(asOpenRouterRecord(choices[0]).message).content;
  return typeof content === 'string' ? content : '';
}

export function extractOpenRouterJobUsage(result: unknown): OpenRouterUsage | null {
  const record = asOpenRouterRecord(result);
  const payload = asOpenRouterRecord(record.payload);
  const usage = asOpenRouterRecord(payload.usage);
  const promptTokens = Number(usage.prompt_tokens);
  const completionTokens = Number(usage.completion_tokens);
  const totalTokens = Number(usage.total_tokens);

  if (!Number.isFinite(promptTokens) && !Number.isFinite(completionTokens) && !Number.isFinite(totalTokens)) {
    return null;
  }

  const safePromptTokens = Number.isFinite(promptTokens) ? promptTokens : 0;
  const safeCompletionTokens = Number.isFinite(completionTokens) ? completionTokens : 0;
  return {
    promptTokens: safePromptTokens,
    completionTokens: safeCompletionTokens,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : safePromptTokens + safeCompletionTokens,
  };
}

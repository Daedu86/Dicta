import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  formatOpenRouterJobTimeoutError,
  OPENROUTER_JOB_TIMEOUT_MS,
} from '../api/openrouter/_jobRunner.js';

describe('OpenRouter job runner timeout', () => {
  it('allows slow provider completions while staying inside the Vercel function window', () => {
    const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
    const openRouterFunctionMaxDurationMs = vercelConfig.functions['api/openrouter/*.js'].maxDuration * 1000;

    expect(OPENROUTER_JOB_TIMEOUT_MS).toBeGreaterThan(291_400);
    expect(OPENROUTER_JOB_TIMEOUT_MS).toBeLessThanOrEqual(openRouterFunctionMaxDurationMs - 4_000);
  });

  it('formats timeout failures without exposing the raw fetch abort message', () => {
    expect(formatOpenRouterJobTimeoutError('openai/gpt-oss-120b:free')).toBe(
      'Selected OpenRouter model "openai/gpt-oss-120b:free" timed out after 296 seconds. Vercel free-tier functions are capped at 300 seconds; use a shorter prompt budget or a faster OpenRouter model/provider.',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { readOpenRouterChatPayload } from '../api/openrouter/_request.js';

describe('openRouter chat route payload validation', () => {
  it('defaults and bounds max_tokens for free chat requests', () => {
    expect(
      readOpenRouterChatPayload({
        model: 'openrouter/free',
        prompt: 'Say hello.',
      }),
    ).toEqual({
      model: 'openrouter/free',
      prompt: 'Say hello.',
      maxTokens: 600,
    });

    expect(
      readOpenRouterChatPayload({
        model: 'openrouter/free',
        prompt: 'Say hello.',
        maxTokens: 99999,
      }).maxTokens,
    ).toBe(1800);
  });

  it('rejects paid model ids', () => {
    expect(() =>
      readOpenRouterChatPayload({
        model: 'openai/gpt-5',
        prompt: 'Say hello.',
      }),
    ).toThrow('OpenRouter model must be openrouter/free or a :free model variant.');
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatOpenRouterJobProviderError,
  isRetryableOpenRouterJobResponse,
  readCreateJobPayload,
} from '../api/openrouter/jobs.js';

describe('OpenRouter jobs route payload validation', () => {
  it('accepts French durable session generation jobs', () => {
    expect(
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a French Dicta session.',
        inputMode: 'browser-tts',
        language: 'fr',
        slotLabel: 'Session 1',
        durationMinutes: 2,
      }),
    ).toMatchObject({
      model: 'openrouter/free',
      maxTokens: 1000,
      inputMode: 'browser-tts',
      language: 'fr',
      slotLabel: 'Session 1',
      durationMinutes: 2,
    });
  });

  it('accepts Portuguese durable session generation jobs', () => {
    expect(
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a Portuguese Dicta session.',
        inputMode: 'qwen-cloud',
        language: 'pt',
        slotLabel: 'Session PT',
        durationMinutes: 2,
      }),
    ).toMatchObject({
      model: 'openrouter/free',
      maxTokens: 1000,
      inputMode: 'qwen-cloud',
      language: 'pt',
      slotLabel: 'Session PT',
      durationMinutes: 2,
    });
  });

  it('accepts one-minute express durable generation jobs', () => {
    expect(
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a short express Dicta session.',
        inputMode: 'browser-tts',
        language: 'de',
        slotLabel: 'Express easy direct session',
        durationMinutes: 1,
      }),
    ).toMatchObject({
      maxTokens: 800,
      slotLabel: 'Express easy direct session',
      durationMinutes: 1,
    });
  });

  it('treats OpenRouter 503 provider upstream failures as retryable', () => {
    expect(
      isRetryableOpenRouterJobResponse({
        ok: false,
        status: 503,
        body: JSON.stringify({
          error: {
            message: 'Provider returned error',
            code: 503,
            metadata: {
              raw: 'no healthy upstream',
              provider_name: 'OpenInference',
              is_byok: false,
            },
          },
          user_id: 'user_360ls8gD0nDOmwcRgJr92fqM1Fk',
        }),
      }),
    ).toBe(true);
  });

  it('formats transient provider failures without leaking OpenRouter user ids', () => {
    const message = formatOpenRouterJobProviderError(
      {
        ok: false,
        status: 503,
        body: JSON.stringify({
          error: {
            message: 'Provider returned error',
            code: 503,
            metadata: {
              raw: 'no healthy upstream',
              provider_name: 'OpenInference',
              is_byok: false,
            },
          },
          user_id: 'user_360ls8gD0nDOmwcRgJr92fqM1Fk',
        }),
      },
      [
        { attempt: 1, status: 503, retryable: true },
        { attempt: 2, status: 503, retryable: true },
        { attempt: 3, status: 503, retryable: true },
      ],
    );

    expect(message).toContain('OpenRouter provider error (503 from OpenInference): no healthy upstream.');
    expect(message).toContain('Retried 2 times.');
    expect(message).not.toContain('user_360ls8gD0nDOmwcRgJr92fqM1Fk');
  });

  it('rejects unsupported durable job languages', () => {
    expect(() =>
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a session.',
        inputMode: 'browser-tts',
        language: 'it',
        slotLabel: 'Session 1',
        durationMinutes: 2,
      }),
    ).toThrow('Invalid language.');
  });

  it('rejects paid OpenRouter model ids before a job is created', () => {
    expect(() =>
      readCreateJobPayload({
        model: 'anthropic/claude-sonnet-4.5',
        prompt: 'Generate a session.',
        inputMode: 'browser-tts',
        language: 'fr',
        slotLabel: 'Session 1',
        durationMinutes: 2,
      }),
    ).toThrow('OpenRouter model must be openrouter/free or a :free model variant.');
  });

  it('bounds max token requests server-side', () => {
    expect(
      readCreateJobPayload({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        prompt: 'Generate a session.',
        maxTokens: 99999,
        inputMode: 'browser-tts',
        language: 'fr',
        slotLabel: 'Session 1',
        durationMinutes: 4,
      }).maxTokens,
    ).toBe(1800);
  });

  it('rejects oversized prompts', () => {
    expect(() =>
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'x'.repeat(32001),
        inputMode: 'browser-tts',
        language: 'fr',
        slotLabel: 'Session 1',
        durationMinutes: 2,
      }),
    ).toThrow('Prompt is too large.');
  });
});

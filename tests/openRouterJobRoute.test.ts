import { describe, expect, it } from 'vitest';
import {
  formatOpenRouterJobProviderError,
  isRetryableOpenRouterJobResponse,
  readCreateJobPayload,
  resolveCreateJobPayloadForRequester,
  resolveOpenRouterJobModelCandidates,
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

  it('uses an assigned model when the client still requests the generic free router', () => {
    expect(
      resolveCreateJobPayloadForRequester(
        { assignedOpenRouterModel: 'meta-llama/llama-3.2-3b-instruct:free' },
        {
          model: 'openrouter/free',
          prompt: 'Generate a short express Dicta session.',
          inputMode: 'browser-tts',
          language: 'de',
          slotLabel: 'Express easy direct session',
          durationMinutes: 1,
        },
      ),
    ).toMatchObject({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      requestedModel: 'openrouter/free',
      slotLabel: 'Express easy direct session',
    });
  });

  it('keeps an explicitly requested concrete model unchanged', () => {
    expect(
      resolveCreateJobPayloadForRequester(
        { assignedOpenRouterModel: 'meta-llama/llama-3.2-3b-instruct:free' },
        {
          model: 'google/gemma-3n-e2b-it:free',
          prompt: 'Generate a short express Dicta session.',
          inputMode: 'browser-tts',
          language: 'de',
          slotLabel: 'Express easy direct session',
          durationMinutes: 1,
        },
      ),
    ).toMatchObject({
      model: 'google/gemma-3n-e2b-it:free',
    });
  });

  it('falls back from a concrete free model to other free models', () => {
    expect(resolveOpenRouterJobModelCandidates('openai/gpt-oss-120b:free')).toEqual([
      'openai/gpt-oss-120b:free',
      'google/gemma-3n-e2b-it:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'qwen/qwen3-4b:free',
    ]);
  });

  it('deduplicates fallback models when the primary model is already a fallback', () => {
    expect(resolveOpenRouterJobModelCandidates('google/gemma-3n-e2b-it:free')).toEqual([
      'google/gemma-3n-e2b-it:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'qwen/qwen3-4b:free',
    ]);
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
        { attempt: 1, model: 'openai/gpt-oss-120b:free', status: 503, retryable: true },
        { attempt: 2, model: 'openai/gpt-oss-120b:free', status: 503, retryable: true },
        { attempt: 3, model: 'google/gemma-3n-e2b-it:free', status: 503, retryable: true },
      ],
    );

    expect(message).toContain('OpenRouter provider error (503 from OpenInference): no healthy upstream.');
    expect(message).toContain('Retried 2 times.');
    expect(message).toContain('Tried 2 models.');
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

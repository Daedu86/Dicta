import { describe, expect, it } from 'vitest';
import { readCreateJobPayload } from '../api/openrouter/jobs.js';

describe('openRouter jobs route payload validation', () => {
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

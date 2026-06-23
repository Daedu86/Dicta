import { describe, expect, it } from 'vitest';
import { readCreateJobPayload } from '../api/openrouter/jobs.js';
import { directMobileButtonPayloads } from './helpers/openRouterJobFixtures';

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
      maxTokens: 2600,
      inputMode: 'browser-tts',
      language: 'fr',
      slotLabel: 'Session 1',
      durationMinutes: 2,
    });
  });

  it('rejects removed legacy durable session generation jobs', () => {
    expect(() =>
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a Portuguese Dicta session.',
        inputMode: 'removed-legacy-input-a',
        language: 'pt',
        slotLabel: 'Session PT',
        durationMinutes: 2,
      }),
    ).toThrow('Invalid inputMode.');

    expect(() =>
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a Portuguese Dicta session.',
        inputMode: 'removed-legacy-input-b',
        language: 'pt',
        slotLabel: 'Session PT',
        durationMinutes: 2,
      }),
    ).toThrow('Invalid inputMode.');
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
      maxTokens: 1800,
      slotLabel: 'Express easy direct session',
      durationMinutes: 1,
    });
  });

  it('accepts five-minute durable generation jobs', () => {
    expect(
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a longer Dicta session.',
        inputMode: 'browser-tts',
        language: 'en',
        slotLabel: 'Adaptive direct session',
        durationMinutes: 5,
      }),
    ).toMatchObject({
      maxTokens: 6000,
      durationMinutes: 5,
    });
  });

  it('accepts all three direct mobile generation button job payloads', () => {
    for (const payload of directMobileButtonPayloads) {
      expect(
        readCreateJobPayload({
          model: 'openrouter/free',
          prompt: `Generate ${payload.slotLabel}.`,
          inputMode: 'browser-tts',
          language: 'de',
          maxTokens: payload.durationMinutes === 1 ? 1800 : 2600,
          ...payload,
        }),
      ).toMatchObject({
        model: 'openrouter/free',
        inputMode: 'browser-tts',
        language: 'de',
        maxTokens: payload.durationMinutes === 1 ? 1800 : 2600,
        slotLabel: payload.slotLabel,
        durationMinutes: payload.durationMinutes,
        targetDifficulty: payload.targetDifficulty,
      });
    }
  });
});

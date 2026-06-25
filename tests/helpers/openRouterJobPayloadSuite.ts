import { describe, expect, it } from 'vitest';
import { readCreateJobPayload } from '../../api/openrouter/jobs.js';
import { directMobileButtonPayloads } from './openRouterJobFixtures';

export function registerOpenRouterJobPayloadSuite(): void {
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
        maxTokens: 1800,
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

    it('accepts six-minute durable generation jobs', () => {
      expect(
        readCreateJobPayload({
          model: 'openrouter/free',
          prompt: 'Generate a longer Dicta session.',
          inputMode: 'browser-tts',
          language: 'en',
          slotLabel: 'Adaptive direct session',
          durationMinutes: 6,
        }),
      ).toMatchObject({
        maxTokens: 4200,
        durationMinutes: 6,
      });
    });

    it('accepts compact chunk jobs with a normalized script build policy through ten minutes', () => {
      expect(
        readCreateJobPayload({
          model: 'openrouter/free',
          prompt: 'Generate compact chunks.',
          inputMode: 'browser-tts',
          language: 'pt',
          slotLabel: 'Adaptive direct session',
          durationMinutes: 10,
          targetDifficulty: 'hard',
          generationFormat: 'compact-chunks-v1',
          scriptBuildPolicy: {
            inputMode: 'browser-tts',
            language: 'pt',
            difficulty: 'hard',
            durationMinutes: 10,
            recommendedRateRange: [0.76, 0.8],
            recommendedPhraseSize: 'short',
            recommendedPauseMs: 2600,
            phraseDifficultyRange: [0.65, 0.82],
          },
        }),
      ).toMatchObject({
        maxTokens: 6600,
        durationMinutes: 10,
        generationFormat: 'compact-chunks-v1',
        scriptBuildPolicy: {
          inputMode: 'browser-tts',
          language: 'pt',
          difficulty: 'hard',
          durationMinutes: 10,
          recommendedRateRange: [0.76, 0.8],
          recommendedPhraseSize: 'short',
          recommendedPauseMs: 2600,
          phraseDifficultyRange: [0.65, 0.82],
        },
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
            maxTokens: 1800,
            ...payload,
          }),
        ).toMatchObject({
          model: 'openrouter/free',
          inputMode: 'browser-tts',
          language: 'de',
          maxTokens: 1800,
          slotLabel: payload.slotLabel,
          durationMinutes: payload.durationMinutes,
          targetDifficulty: payload.targetDifficulty,
        });
      }
    });
  });
}

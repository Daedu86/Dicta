import { describe, expect, it } from 'vitest';
import {
  resolveCreateJobPayloadForRequester,
  resolveOpenRouterJobModelCandidates,
} from '../../api/openrouter/jobs.js';

export function registerOpenRouterJobModelSuite(): void {
  describe('OpenRouter jobs route model resolution', () => {
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

    it('keeps an explicitly selected free model as the only durable job candidate', () => {
      expect(resolveOpenRouterJobModelCandidates('z-ai/glm-4.5-air:free')).toEqual(['z-ai/glm-4.5-air:free']);
    });

    it('does not add app-level fallback candidates to the generic free router', () => {
      expect(resolveOpenRouterJobModelCandidates('openrouter/free')).toEqual(['openrouter/free']);
    });
  });
}

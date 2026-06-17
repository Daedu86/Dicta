import { describe, expect, it } from 'vitest';
import {
  extractOpenRouterJobSessionJson,
  formatOpenRouterJobProviderError,
  isRetryableOpenRouterJobResponse,
  readCreateJobPayload,
  resolveCreateJobPayloadForRequester,
  resolveOpenRouterJobModelCandidates,
} from '../api/openrouter/jobs.js';
import { directMobileButtonPayloads, validScript } from './helpers/openRouterJobFixtures';

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
});

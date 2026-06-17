import { describe, expect, it } from 'vitest';
import {
  resolveCreateJobPayloadForRequester,
  resolveOpenRouterJobModelCandidates,
} from '../api/openrouter/jobs.js';

const ASSIGNED_MODEL = 'provider/assigned-model:free';
const CONCRETE_MODEL = 'provider/concrete-model:free';
const SELECTED_FREE_MODEL = 'provider/selected-free-model:free';

describe('OpenRouter jobs route model resolution', () => {
  it('uses an assigned model when the client still requests the generic free router', () => {
    expect(
      resolveCreateJobPayloadForRequester(
        { assignedOpenRouterModel: ASSIGNED_MODEL },
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
      model: ASSIGNED_MODEL,
      requestedModel: 'openrouter/free',
      slotLabel: 'Express easy direct session',
    });
  });

  it('keeps an explicitly requested concrete model unchanged', () => {
    expect(
      resolveCreateJobPayloadForRequester(
        { assignedOpenRouterModel: ASSIGNED_MODEL },
        {
          model: CONCRETE_MODEL,
          prompt: 'Generate a short express Dicta session.',
          inputMode: 'browser-tts',
          language: 'de',
          slotLabel: 'Express easy direct session',
          durationMinutes: 1,
        },
      ),
    ).toMatchObject({
      model: CONCRETE_MODEL,
    });
  });

  it('keeps an explicitly selected free model as the only durable job candidate', () => {
    expect(resolveOpenRouterJobModelCandidates(SELECTED_FREE_MODEL)).toEqual([SELECTED_FREE_MODEL]);
  });

  it('does not add app-level fallback candidates to the generic free router', () => {
    expect(resolveOpenRouterJobModelCandidates('openrouter/free')).toEqual(['openrouter/free']);
  });
});

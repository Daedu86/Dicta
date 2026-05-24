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
});

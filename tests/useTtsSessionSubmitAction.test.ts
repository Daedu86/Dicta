import { describe, it, vi } from 'vitest';
import {
  buildTtsSessionSubmitOptions,
  expectTtsSubmitRejected,
  expectValidTtsSubmitFinalization,
  submitTtsAttempt,
} from './useTtsSessionSubmitActionTestUtils';

describe('createTtsSessionSubmitAction', () => {
  it('rejects submit when text or the typed attempt is missing', () => {
    const endPerfSpan = vi.fn();
    const options = buildTtsSessionSubmitOptions({
      ttsHasText: false,
      startPerfSpan: vi.fn(() => endPerfSpan),
    });

    submitTtsAttempt(options, '');

    expectTtsSubmitRejected(options, endPerfSpan);
  });

  it('finalizes, persists, stops playback, and publishes submit feedback for a valid attempt', () => {
    const endPerfSpan = vi.fn();
    const options = buildTtsSessionSubmitOptions({
      startPerfSpan: vi.fn(() => endPerfSpan),
    });

    submitTtsAttempt(options, 'eins zwei');

    expectValidTtsSubmitFinalization(options, endPerfSpan);
  });
});

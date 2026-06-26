import { describe, expect, it, vi } from 'vitest';
import {
  buildTtsSubmitSession,
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

  it('applies pending target punctuation before finalizing a submitted attempt', () => {
    const endPerfSpan = vi.fn();
    const options = buildTtsSessionSubmitOptions({
      activeSession: buildTtsSubmitSession({
        ttsText: 'eins, zwei!',
      }),
      startPerfSpan: vi.fn(() => endPerfSpan),
    });

    submitTtsAttempt(options, 'eins zwei');

    expect(options.setTtsPracticeText).toHaveBeenCalledWith('eins, zwei!');
    expect(options.applyTtsPerformanceSample).toHaveBeenCalledWith({
      action: 'submit',
      finalize: true,
      practiceTextOverride: 'eins, zwei!',
    });
    expect(options.setSessions).toHaveBeenCalledWith([
      expect.objectContaining({
        ttsPracticeText: 'eins, zwei!',
      }),
    ]);
  });
});

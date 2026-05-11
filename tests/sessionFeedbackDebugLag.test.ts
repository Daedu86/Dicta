import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildBenchmarkFeedbackPackage } from '../src/core/adaptive/sessionFeedback';

describe('debug benchmark feedback lag diagnostics', () => {
  it('keeps raw and stable lag in recent timeline points', () => {
    const base = createEmptyInputLanguageBenchmark('browser-tts', 'es');
    const profile = {
      ...base,
      timeline: [
        {
          timestampMs: 1,
          inputMode: 'browser-tts' as const,
          language: 'es',
          mode: 'support' as const,
          playbackRate: 0.8,
          accuracy: 0.88,
          lagSec: -5,
          rawLagSec: -36.48,
          stableLagSec: -5,
          lagOutlierCount: 1,
          wpm: 60,
          pauseMs: 1200,
          event: 'pause' as const,
        },
      ],
    };

    const payload = buildBenchmarkFeedbackPackage(profile, null);
    expect(payload.recentTimelinePoints).toHaveLength(1);
    expect(payload.recentTimelinePoints[0].rawLagSec).toBe(-36.48);
    expect(payload.recentTimelinePoints[0].stableLagSec).toBe(-5);
    expect(payload.recentTimelinePoints[0].lagOutlierCount).toBe(1);
  });
});

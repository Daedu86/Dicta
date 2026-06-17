import { describe, expect, it } from 'vitest';
import {
  sampleTtsPerformance,
} from '../src/app/useTtsPerformanceSampler';
import type {
  TtsLanguage,
} from '../src/app/sessionTypes';
import {
  createSamplerDependencies,
  ref,
  transcriptFromWords,
} from './helpers/ttsPerformanceSamplerFixtures';

describe('sampleTtsPerformance', () => {
  it('initializes playback time, publishes metrics, and tracks a controller action transition', () => {
    const deps = createSamplerDependencies();

    const result = sampleTtsPerformance(deps);

    expect(deps.ttsStartedAtMsRef.current).toBe(10_000);
    expect(result.metrics).toMatchObject({
      controllerState: 'speed_up',
      rate: 1,
      lagWords: 1,
      wpm: 180,
      accuracy: 100,
      trend: 'stable',
      points: 3,
    });
    expect(result.metrics.lagSec).toBeCloseTo(1 / 2.6, 3);
    expect(result.metrics.score).toBe(120);
    expect(deps.ttsLiveSignalRef.current).toMatchObject({
      controllerState: 'speed_up',
      accuracy: 100,
      wpm: 180,
    });
    expect(deps.previousLagRef.current).toBeCloseTo(1 / 2.6, 3);
    expect(deps.previousAccuracyRef.current).toBe(100);
    expect(deps.ttsLastControllerActionRef.current).toBe('speed_up');
    expect(deps.telemetryRef.current?.lagSeries).toEqual([0.385]);
    expect(deps.telemetryRef.current?.wpmSeries).toEqual([180]);
    expect(deps.telemetryRef.current?.accuracySeries).toEqual([100]);
    expect(deps.telemetryRef.current?.actions).toEqual([
      { t: 0, action: 'speed_up', rate: 1 },
    ]);
    expect(deps.publishedUi).toHaveLength(1);
    expect(deps.publishedUi[0]).toMatchObject({
      now: 10_000,
      force: false,
      next: {
        controllerState: 'speed_up',
        lagWords: 1,
        wpm: 180,
        accuracy: 100,
      },
    });
  });

  it('uses practiceTextOverride, records explicit action, and finalizes telemetry', () => {
    const deps = createSamplerDependencies({
      ttsPracticeLiveTextRef: ref('wrong words should not count'),
      ttsTranscript: transcriptFromWords(['alpha', 'beta', 'gamma']),
      estimateTtsSpokenWordIndex: () => 2,
    });

    const result = sampleTtsPerformance(deps, {
      action: 'submit',
      finalize: true,
      practiceTextOverride: 'alpha beta',
    });

    expect(result.metrics.points).toBe(2);
    expect(result.metrics.accuracy).toBe(100);
    expect(deps.telemetryRef.current?.actions).toEqual([
      { t: 0, action: 'submit', rate: 1 },
    ]);
    expect(deps.telemetryRef.current?.finishedAt).toBe('2026-06-12T12:00:00.000Z');
    expect(deps.publishedUi[0]?.force).toBe(true);
  });

  it('falls back to the previous valid German control lag for raw lag outliers', () => {
    const transcript = transcriptFromWords(Array.from({ length: 30 }, (_, index) => `wort${index}`));
    const deps = createSamplerDependencies({
      ttsTranscript: transcript,
      ttsPracticeLiveTextRef: ref(''),
      ttsLanguage: 'de' as TtsLanguage,
      ttsLastValidControlLagSecRef: ref(1.25),
      estimateTtsSpokenWordIndex: () => 30,
    });

    const result = sampleTtsPerformance(deps);

    expect(result.metrics.lagSec).toBe(1.25);
    expect(result.metrics.lagWords).toBe(30);
    expect(deps.ttsLagOutlierCountRef.current).toBe(1);
    expect(deps.ttsLastValidControlLagSecRef.current).toBe(1.25);
    expect(deps.ttsLiveSignalRef.current).toMatchObject({
      rawLagSec: 30 / 2.6,
      stableLagSec: 1.25,
      lagOutlierCount: 1,
    });
  });
});

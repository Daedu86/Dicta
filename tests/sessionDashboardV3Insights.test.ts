import { describe, expect, it } from 'vitest';
import { buildListenerStateV3 } from '../src/core/adaptive/listenerStateV3';
import { cloneTelemetry } from '../src/core/sessionTelemetryNormalization';
import {
  buildCoachingInsights,
  buildListeningCycleV3DashboardInsights,
} from '../src/components/session-dashboard/sessionDashboardModel';
import type { SessionDashboardSession } from '../src/components/session-dashboard/sessionDashboardTypes';

const baseMetrics = {
  accuracy: 92,
  lagSec: 1,
  lagWords: 0,
  wpm: 42,
  rate: 1,
  points: 10,
  score: 120,
};

function makeSession(overrides: Partial<SessionDashboardSession> = {}): SessionDashboardSession {
  return {
    id: 'session-1',
    name: 'Browser TTS session',
    updatedAt: '2026-06-18T00:00:00.000Z',
    inputMode: 'browser-tts',
    ttsText: 'The listener should segment this sentence carefully.',
    ttsPracticeText: 'The listener should segment this sentence carefully.',
    status: 'finished',
    metrics: baseMetrics,
    telemetry: cloneTelemetry({
      startedAt: '2026-06-18T00:00:00.000Z',
      finishedAt: '2026-06-18T00:01:00.000Z',
      lagSeries: [1],
      wpmSeries: [42],
      accuracySeries: [92],
      actions: [],
      ttsChunks: [],
      repeatCount: 0,
      rateDistribution: [{ rate: 1, seconds: 30 }],
    }),
    ...overrides,
  };
}

describe('session dashboard V3 insights', () => {
  it('keeps persisted live frames available after telemetry normalization', () => {
    const listenerStateV3 = buildListenerStateV3({
      phraseBoundaryType: 'unsafe',
      semanticCompleteness: 0.4,
      accuracy: 0.95,
      wpm: 38,
    });

    const telemetry = cloneTelemetry({
      startedAt: '2026-06-18T00:00:00.000Z',
      liveFrames: [{ listenerStateV3, v3Prosody: { boundaryStrength: 'weak' } }],
    }) as ReturnType<typeof cloneTelemetry> & { liveFrames?: unknown[] };

    expect(telemetry.liveFrames).toHaveLength(1);
  });

  it('surfaces Listening Cycle V3 insight bullets in the dashboard model', () => {
    const listenerStateV3 = buildListenerStateV3({
      phraseBoundaryType: 'unsafe',
      semanticCompleteness: 0.4,
      accuracy: 0.95,
      wpm: 38,
    });
    const telemetry = cloneTelemetry({
      startedAt: '2026-06-18T00:00:00.000Z',
      liveFrames: [
        {
          listenerStateV3,
          phraseBoundaryType: 'unsafe',
          semanticCompleteness: 0.4,
          v3Prosody: {
            boundaryStrength: 'weak',
            pauseClass: 'recovery',
            replayStrategy: 'repeat-with-preroll',
            reasonCodes: ['boundary-fragile'],
          },
          surgicalReplayPlan: {
            strategy: 'repeat-with-preroll',
            reasonCodes: ['replay-with-preroll'],
          },
        },
      ],
    });

    const insights = buildListeningCycleV3DashboardInsights(makeSession({ telemetry }));

    expect(insights[0]).toContain('Listening Cycle V3');
    expect(insights.join(' ')).toContain('boundary frágil');
    expect(insights.join(' ')).toContain('replay-with-preroll');
  });

  it('falls back to legacy coaching insights when no V3 frames exist', () => {
    const session = makeSession({
      metrics: { ...baseMetrics, accuracy: 96, wpm: 20 },
    });

    const insights = buildCoachingInsights(session, {
      accuracy: 90,
      wpmMin: 35,
      wpmMax: 75,
      lagMin: 1,
      lagMax: 3,
      repeatsMax: 3,
    });

    expect(insights).toContain('Accuracy is strong; the next coaching target is pace.');
  });
});

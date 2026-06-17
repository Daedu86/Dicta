import { expect } from 'vitest';
import {
  createEmptyInputLanguageBenchmark,
  updateInputLanguageBenchmark,
  type BrowserTtsDeBenchmarkRejectionReason,
  type InputLanguageBenchmarkUpdateArgs,
} from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { InputLanguageBenchmarkMetrics } from '../src/core/adaptive/types';
import {
  decision,
  environmentA,
  environmentB,
  live,
} from './helpers/adaptiveBenchmarkFixtures';

type LiveOverrides = NonNullable<Parameters<typeof live>[0]>;
type DecisionOverrides = NonNullable<Parameters<typeof decision>[0]>;

type UpdateBenchmarkOptions = Omit<InputLanguageBenchmarkUpdateArgs, 'live' | 'decision'> & {
  liveOverrides?: LiveOverrides;
  decisionOverrides?: DecisionOverrides;
};

export const BENCHMARK_TIMESTAMP_MS = Date.parse('2026-06-01T12:00:00Z');
export const BENCHMARK_LATER_TIMESTAMP_MS = Date.parse('2026-06-01T12:05:00Z');

export function emptyBrowserTtsBenchmark(language: string): InputLanguageBenchmarkMetrics {
  return createEmptyInputLanguageBenchmark('browser-tts', language);
}

export function updateBenchmark({
  liveOverrides,
  decisionOverrides,
  timestampMs = BENCHMARK_TIMESTAMP_MS,
  event = 'phrase_completed',
  ...options
}: UpdateBenchmarkOptions): InputLanguageBenchmarkMetrics {
  return updateInputLanguageBenchmark({
    ...options,
    live: live(liveOverrides),
    decision: decision(decisionOverrides),
    timestampMs,
    event,
  });
}

export function updateGermanBrowserTtsBenchmark(
  options: Omit<UpdateBenchmarkOptions, 'liveOverrides'> & { liveOverrides?: LiveOverrides } = {},
): InputLanguageBenchmarkMetrics {
  return updateBenchmark({
    current: emptyBrowserTtsBenchmark('de'),
    ...options,
    liveOverrides: {
      language: 'de',
      ...options.liveOverrides,
    },
  });
}

export function updateEnglishBrowserTtsBenchmark(
  options: Omit<UpdateBenchmarkOptions, 'liveOverrides'> & { liveOverrides?: LiveOverrides } = {},
): InputLanguageBenchmarkMetrics {
  return updateBenchmark({
    current: emptyBrowserTtsBenchmark('en'),
    ...options,
    liveOverrides: {
      language: 'en',
      ...options.liveOverrides,
    },
  });
}

export function expectLatestRejectionReason(
  profile: InputLanguageBenchmarkMetrics,
  reason: BrowserTtsDeBenchmarkRejectionReason,
): void {
  expect(profile.timeline.at(-1)?.benchmarkRejectionReason).toBe(reason);
}

export function expectLatestSampleUnflagged(profile: InputLanguageBenchmarkMetrics): void {
  expect(profile.timeline.at(-1)?.benchmarkRejectionReason).toBeUndefined();
}

export function updateWithEnvironmentHistory(): InputLanguageBenchmarkMetrics {
  const first = updateEnglishBrowserTtsBenchmark({
    liveOverrides: { phraseId: 'phrase-1' },
    ttsEnvironment: environmentA,
    sessionId: 's-a',
  });

  return updateEnglishBrowserTtsBenchmark({
    current: first,
    liveOverrides: { phraseId: 'phrase-2' },
    ttsEnvironment: environmentB,
    timestampMs: BENCHMARK_LATER_TIMESTAMP_MS,
    sessionId: 's-b',
  });
}

export function expectEnvironmentHistorySummary(profile: InputLanguageBenchmarkMetrics): void {
  expect(profile.ttsEnvironment).toEqual(environmentB);
  expect(profile.environmentChanged).toBe(true);
  expect(profile.ttsEnvironmentHistory).toHaveLength(2);
  expect(profile.timeline.every((point) => typeof point.ttsEnvironmentId === 'string')).toBe(true);
  expect(profile.ttsEnvironmentHistory?.map((entry) => entry.sampleCount)).toEqual([1, 1]);
}

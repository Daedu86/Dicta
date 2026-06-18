import { describe, expect, it } from 'vitest';
import {
  getBrowserTtsDeBenchmarkRejectionReason,
  isValidBrowserTtsDeBenchmarkSample,
} from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  BENCHMARK_LATER_TIMESTAMP_MS,
  BENCHMARK_TIMESTAMP_MS,
  emptyBrowserTtsBenchmark,
  expectEnvironmentHistorySummary,
  expectLatestRejectionReason,
  expectLatestSampleUnflagged,
  updateBenchmark,
  updateEnglishBrowserTtsBenchmark,
  updateGermanBrowserTtsBenchmark,
  updateWithEnvironmentHistory,
} from './adaptiveBenchmarkServiceTestUtils';

describe('AdaptiveInputLanguageBenchmarkService', () => {
  it('resets profile state when inputMode/language changes', () => {
    const updated = updateBenchmark({
      current: emptyBrowserTtsBenchmark('de'),
      liveOverrides: { inputMode: 'browser-tts', language: 'en' },
      sessionId: 's1',
    });

    expect(updated.inputMode).toBe('browser-tts');
    expect(updated.language).toBe('en');
    expect(updated.sampleCount).toBe(1);
    expect(updated.timeline).toHaveLength(1);
    expect(updated.timeline[0]?.inputMode).toBe('browser-tts');
  });

  it('filters unsafe Browser TTS samples through the same universal gate for neighboring languages', () => {
    const unsafeGerman = updateGermanBrowserTtsBenchmark({
      liveOverrides: {
        phraseBoundaryType: 'unsafe',
        semanticCompleteness: 0.4,
      },
      sessionId: 's-de',
      phraseIndex: 0,
      totalSemanticPhrases: 2,
    });
    const unsafeEnglish = updateEnglishBrowserTtsBenchmark({
      liveOverrides: {
        phraseBoundaryType: 'unsafe',
        semanticCompleteness: 0.4,
      },
      sessionId: 's-en',
      phraseIndex: 0,
      totalSemanticPhrases: 2,
    });

    expect(unsafeGerman.sampleCount).toBe(0);
    expect(unsafeGerman.timeline).toHaveLength(1);
    expect(unsafeGerman.timeline[0]?.sampleQuality?.acceptedForRuntimePressure).toBe(true);
    expect(unsafeEnglish.sampleCount).toBe(0);
    expect(unsafeEnglish.timeline).toHaveLength(1);
    expect(unsafeEnglish.timeline[0]?.benchmarkRejectionReason).toBe('unsafe_phrase_boundary');
    expect(unsafeEnglish.timeline[0]?.sampleQuality?.acceptedForRuntimePressure).toBe(true);
  });

  it('reports Browser TTS German rejection reasons for stale or unsafe samples', () => {
    const profile = updateGermanBrowserTtsBenchmark({
      liveOverrides: {
        phraseBoundaryType: 'unsafe',
        semanticCompleteness: 0.4,
      },
      sessionId: 's-de',
      phraseIndex: 0,
      totalSemanticPhrases: 2,
    });
    const point = profile.timeline[0];

    expect(point).toBeDefined();
    expect(isValidBrowserTtsDeBenchmarkSample(point!)).toBe(false);
    expect(getBrowserTtsDeBenchmarkRejectionReason(point!)).toBe('unsafe_phrase_boundary');
  });

  it('keeps accepted browser-tts/de phrase_completed samples unflagged', () => {
    const profile = updateGermanBrowserTtsBenchmark({
      liveOverrides: {
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.92,
      },
      sessionId: 's-de-accepted',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
    });

    expectLatestSampleUnflagged(profile);
  });

  it('flags non-scoring browser-tts/de pause events and unsafe boundaries', () => {
    const pauseProfile = updateGermanBrowserTtsBenchmark({
      liveOverrides: {
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.92,
      },
      decisionOverrides: { shouldPauseNow: true },
      sessionId: 's-de-pause',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
      event: 'pause',
    });
    const unsafeProfile = updateGermanBrowserTtsBenchmark({
      current: pauseProfile,
      liveOverrides: {
        phraseBoundaryType: 'unsafe',
        semanticCompleteness: 0.9,
      },
      timestampMs: BENCHMARK_LATER_TIMESTAMP_MS,
      sessionId: 's-de-unsafe',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
    });

    expectLatestRejectionReason(pauseProfile, 'event_not_scoring');
    expectLatestRejectionReason(unsafeProfile, 'unsafe_phrase_boundary');
  });

  it('flags raw lag out-of-range samples by quality instead of by language', () => {
    const outOfRangeProfile = updateGermanBrowserTtsBenchmark({
      liveOverrides: {
        rawLagSec: 9.5,
        lagSec: 9.5,
        stableLagSec: 9.5,
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.92,
      },
      sessionId: 's-de-range',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
    });
    const englishProfile = updateEnglishBrowserTtsBenchmark({
      liveOverrides: {
        rawLagSec: 9.5,
        lagSec: 9.5,
        stableLagSec: 9.5,
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.92,
      },
      timestampMs: BENCHMARK_TIMESTAMP_MS,
      sessionId: 's-en-range',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
    });

    expectLatestRejectionReason(outOfRangeProfile, 'rawLagSec_out_of_range');
    expectLatestRejectionReason(englishProfile, 'rawLagSec_out_of_range');
    expect(englishProfile.sampleCount).toBe(0);
  });

  it('tracks Browser TTS environment ids on timeline samples and summarizes environment history', () => {
    expectEnvironmentHistorySummary(updateWithEnvironmentHistory());
  });
});

import { describe, expect, it } from 'vitest';
import {
  createEmptyInputLanguageBenchmark,
  getBrowserTtsDeBenchmarkRejectionReason,
  isValidBrowserTtsDeBenchmarkSample,
  updateInputLanguageBenchmark,
} from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  decision,
  environmentA,
  environmentB,
  live,
} from './helpers/adaptiveBenchmarkFixtures';

describe('AdaptiveInputLanguageBenchmarkService', () => {
  it('resets profile state when inputMode/language changes', () => {
    const current = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const updated = updateInputLanguageBenchmark({
      current,
      live: live({ inputMode: 'browser-tts', language: 'en' }),
      decision: decision(),
      timestampMs: Date.parse('2026-06-01T12:00:00Z'),
      sessionId: 's1',
      event: 'phrase_completed',
    });

    expect(updated.inputMode).toBe('browser-tts');
    expect(updated.language).toBe('en');
    expect(updated.sampleCount).toBe(1);
    expect(updated.timeline).toHaveLength(1);
    expect(updated.timeline[0]?.inputMode).toBe('browser-tts');
  });

  it('filters unsafe Browser TTS German samples without blocking neighboring languages', () => {
    const unsafeGerman = updateInputLanguageBenchmark({
      current: createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      live: live({ language: 'de', phraseBoundaryType: 'unsafe', semanticCompleteness: 0.4 }),
      decision: decision(),
      timestampMs: Date.parse('2026-06-01T12:00:00Z'),
      sessionId: 's-de',
      phraseIndex: 0,
      totalSemanticPhrases: 2,
      event: 'phrase_completed',
    });
    const unsafeEnglish = updateInputLanguageBenchmark({
      current: createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      live: live({ language: 'en', phraseBoundaryType: 'unsafe', semanticCompleteness: 0.4 }),
      decision: decision(),
      timestampMs: Date.parse('2026-06-01T12:00:00Z'),
      sessionId: 's-en',
      phraseIndex: 0,
      totalSemanticPhrases: 2,
      event: 'phrase_completed',
    });

    expect(unsafeGerman.sampleCount).toBe(0);
    expect(unsafeGerman.timeline).toHaveLength(1);
    expect(unsafeEnglish.sampleCount).toBe(1);
    expect(unsafeEnglish.timeline).toHaveLength(1);
  });

  it('reports Browser TTS German rejection reasons for stale or unsafe samples', () => {
    const profile = updateInputLanguageBenchmark({
      current: createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      live: live({ language: 'de', phraseBoundaryType: 'unsafe', semanticCompleteness: 0.4 }),
      decision: decision(),
      timestampMs: Date.parse('2026-06-01T12:00:00Z'),
      sessionId: 's-de',
      phraseIndex: 0,
      totalSemanticPhrases: 2,
      event: 'phrase_completed',
    });
    const point = profile.timeline[0];

    expect(point).toBeDefined();
    expect(isValidBrowserTtsDeBenchmarkSample(point!)).toBe(false);
    expect(getBrowserTtsDeBenchmarkRejectionReason(point!)).toBe('unsafe_phrase_boundary');
  });

  it('keeps accepted browser-tts/de phrase_completed samples unflagged', () => {
    const profile = updateInputLanguageBenchmark({
      current: createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      live: live({
        language: 'de',
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.92,
      }),
      decision: decision(),
      timestampMs: Date.parse('2026-06-01T12:00:00Z'),
      sessionId: 's-de-accepted',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
      event: 'phrase_completed',
    });

    expect(profile.timeline.at(-1)?.benchmarkRejectionReason).toBeUndefined();
  });

  it('flags non-scoring browser-tts/de pause events and unsafe boundaries', () => {
    const pauseProfile = updateInputLanguageBenchmark({
      current: createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      live: live({
        language: 'de',
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.92,
      }),
      decision: decision({ shouldPauseNow: true }),
      timestampMs: Date.parse('2026-06-01T12:00:00Z'),
      sessionId: 's-de-pause',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
      event: 'pause',
    });
    const unsafeProfile = updateInputLanguageBenchmark({
      current: pauseProfile,
      live: live({
        language: 'de',
        phraseBoundaryType: 'unsafe',
        semanticCompleteness: 0.9,
      }),
      decision: decision(),
      timestampMs: Date.parse('2026-06-01T12:05:00Z'),
      sessionId: 's-de-unsafe',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
      event: 'phrase_completed',
    });

    expect(pauseProfile.timeline.at(-1)?.benchmarkRejectionReason).toBe('event_not_scoring');
    expect(unsafeProfile.timeline.at(-1)?.benchmarkRejectionReason).toBe('unsafe_phrase_boundary');
  });

  it('flags browser-tts/de raw lag out-of-range samples and leaves browser-tts/en unaffected', () => {
    const outOfRangeProfile = updateInputLanguageBenchmark({
      current: createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      live: live({
        language: 'de',
        rawLagSec: 9.5,
        lagSec: 9.5,
        stableLagSec: 9.5,
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.92,
      }),
      decision: decision(),
      timestampMs: Date.parse('2026-06-01T12:00:00Z'),
      sessionId: 's-de-range',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
      event: 'phrase_completed',
    });
    const englishProfile = updateInputLanguageBenchmark({
      current: createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      live: live({
        language: 'en',
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.92,
      }),
      decision: decision(),
      timestampMs: Date.parse('2026-06-01T12:00:00Z'),
      sessionId: 's-en-pause',
      phraseIndex: 1,
      totalSemanticPhrases: 3,
      event: 'pause',
    });

    expect(outOfRangeProfile.timeline.at(-1)?.benchmarkRejectionReason).toBe('rawLagSec_out_of_range');
    expect(englishProfile.timeline.at(-1)?.benchmarkRejectionReason).toBeUndefined();
  });

  it('tracks Browser TTS environment ids on timeline samples and summarizes environment history', () => {
    const first = updateInputLanguageBenchmark({
      current: createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      live: live({ language: 'en', phraseId: 'phrase-1' }),
      decision: decision(),
      ttsEnvironment: environmentA,
      timestampMs: Date.parse('2026-06-01T12:00:00Z'),
      sessionId: 's-a',
      event: 'phrase_completed',
    });
    const second = updateInputLanguageBenchmark({
      current: first,
      live: live({ language: 'en', phraseId: 'phrase-2' }),
      decision: decision(),
      ttsEnvironment: environmentB,
      timestampMs: Date.parse('2026-06-01T12:05:00Z'),
      sessionId: 's-b',
      event: 'phrase_completed',
    });

    expect(second.ttsEnvironment).toEqual(environmentB);
    expect(second.environmentChanged).toBe(true);
    expect(second.ttsEnvironmentHistory).toHaveLength(2);
    expect(second.timeline.every((point) => typeof point.ttsEnvironmentId === 'string')).toBe(true);
    expect(second.ttsEnvironmentHistory?.map((entry) => entry.sampleCount)).toEqual([1, 1]);
  });
});

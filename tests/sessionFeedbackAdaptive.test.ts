import { describe, expect, it } from 'vitest';
import {
  buildAdaptiveSessionFeedback,
  detectPlaybackIssues,
  selectLatestAdaptiveSessionFeedback,
} from '../src/core/adaptive/sessionFeedback';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { AdaptiveSessionFeedback, PhrasePlaybackEvent } from '../src/core/adaptive/types';

function event(overrides: Partial<PhrasePlaybackEvent>): PhrasePlaybackEvent {
  return {
    sessionId: 'session-1',
    phraseId: 'phrase-1',
    phraseIndex: 0,
    textPreview: 'Hallo Welt',
    event: 'phrase_started',
    timestampMs: 1,
    inputMode: 'browser-tts',
    language: 'de',
    ...overrides,
  };
}

function feedback(overrides: Partial<AdaptiveSessionFeedback>): AdaptiveSessionFeedback {
  return {
    sessionId: 'session-1',
    inputMode: 'browser-tts',
    language: 'de',
    createdAt: '2026-06-01T10:00:00.000Z',
    sourceType: 'plain_text',
    improvementDelta: {
      accuracyDelta: 0,
      lagDelta: 0,
      wpmDelta: 0,
      sweetSpotScoreDelta: 0,
      semanticFidelityDelta: 0,
      controlFidelityDelta: 0,
      learningEffectivenessDelta: 0,
      flowStabilityDelta: 0,
      overallImprovementScore: 0.5,
    },
    playbackIssues: {
      repeatedPhraseCount: 0,
      maxRepeatCountForSinglePhrase: 0,
      repeatedPhrases: [],
      skippedPhraseCount: 0,
      skippedPhrases: [],
      outOfOrderAdvanceCount: 0,
      replayAdvancedPhraseCount: 0,
      phraseIndexJumpCount: 0,
    },
    phraseStats: {
      totalPhrases: 1,
      completedPhrases: 1,
      replayCount: 0,
      phraseAdvanceCount: 1,
      averageRepeatsPerPhrase: 0,
    },
    verdict: 'stable',
    notes: ['Verdict: stable.'],
    ...overrides,
  };
}

describe('adaptive session feedback', () => {
  it('detects phrase-order and replay issues by phraseIndex, not opaque phraseId ordering', () => {
    const issues = detectPlaybackIssues([
      event({ phraseId: 'z', phraseIndex: 0, timestampMs: 1, event: 'phrase_started' }),
      event({ phraseId: 'a', phraseIndex: 0, timestampMs: 2, event: 'phrase_replayed' }),
      event({ phraseId: 'q', phraseIndex: 1, timestampMs: 3, event: 'phrase_started' }),
      event({ phraseId: 'r', phraseIndex: 3, timestampMs: 4, event: 'phrase_started' }),
    ]);

    expect(issues.replayAdvancedPhraseCount).toBe(1);
    expect(issues.phraseIndexJumpCount).toBe(1);
    expect(issues.skippedPhraseCount).toBe(1);
    expect(issues.skippedPhrases[0]?.expectedIndex).toBe(2);
  });

  it('scopes Browser TTS German feedback to the current session', () => {
    const before = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const after = { ...before, sampleCount: 1, sessionCount: 1, averageAccuracy: 0.9, sweetSpotScore: 0.6 };
    const built = buildAdaptiveSessionFeedback({
      sessionId: 'target-session',
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'plain_text',
      createdAt: '2026-06-01T10:00:00.000Z',
      benchmarkBefore: before,
      benchmarkAfter: after,
      phraseEvents: [
        event({ sessionId: 'other-session', phraseIndex: 0, event: 'phrase_started' }),
        event({ sessionId: 'target-session', phraseIndex: 0, event: 'phrase_started' }),
        event({ sessionId: 'target-session', phraseIndex: 0, event: 'phrase_completed' }),
      ],
      totalPhrases: 1,
    });

    expect(built.phraseStats.completedPhrases).toBe(1);
    expect(built.phraseStats.totalPhrases).toBe(1);
    expect(built.playbackIssues.repeatedPhraseCount).toBe(0);
  });

  it('selects latest feedback only within the requested input/language profile', () => {
    const latest = feedback({ createdAt: '2026-06-01T12:00:00.000Z', sessionId: 'latest', language: 'de' });
    const wrongLanguage = feedback({ createdAt: '2026-06-01T13:00:00.000Z', sessionId: 'wrong-lang', language: 'en' });
    const wrongInput = feedback({ createdAt: '2026-06-01T14:00:00.000Z', sessionId: 'wrong-input', inputMode: 'audio' });

    const selected = selectLatestAdaptiveSessionFeedback([wrongInput, wrongLanguage, latest], 'browser-tts', 'de');

    expect(selected?.sessionId).toBe('latest');
  });
});

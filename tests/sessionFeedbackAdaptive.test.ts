import { describe, expect, it } from 'vitest';
import {
  buildAdaptiveSessionFeedback,
  detectPlaybackIssues,
} from '../src/core/adaptive/sessionFeedback';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { PhrasePlaybackEvent } from '../src/core/adaptive/types';

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
});

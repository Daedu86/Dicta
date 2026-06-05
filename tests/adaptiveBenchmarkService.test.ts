import { describe, expect, it } from 'vitest';
import {
  createEmptyInputLanguageBenchmark,
  getBrowserTtsDeBenchmarkRejectionReason,
  isValidBrowserTtsDeBenchmarkSample,
  updateInputLanguageBenchmark,
} from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { LiveTelemetryFrame, PacingDecision } from '../src/core/adaptive/types';
import type { BrowserTtsEnvironmentFingerprint } from '../src/types/dictation';

const environmentA: BrowserTtsEnvironmentFingerprint = {
  engine: 'browser',
  browserUserAgentHash: '11111111',
  platform: 'Win32',
  standalonePwa: false,
  voiceURI: 'de-a',
  voiceName: 'German A',
  voiceLang: 'de-DE',
  localService: true,
  availableVoiceCount: 4,
  matchingVoiceCount: 2,
};

const environmentB: BrowserTtsEnvironmentFingerprint = {
  ...environmentA,
  browserUserAgentHash: '22222222',
  platform: 'Linux armv8l',
  voiceURI: 'de-b',
  voiceName: 'German B',
  localService: false,
};

function live(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: 'phrase-1',
    spokenProgressRatio: 0.5,
    typedProgressRatio: 0.5,
    lagSec: 0.4,
    lagWords: 1,
    lagChars: 4,
    rawLagSec: 0.4,
    stableLagSec: 0.4,
    accuracy: 0.92,
    errorRate: 0.08,
    wpm: 48,
    charsPerMinute: 240,
    pauseMs: 600,
    longestPauseMs: 900,
    backspaceRate: 0.03,
    correctionRate: 0.04,
    phraseDifficulty: 0.35,
    phraseLengthWords: 8,
    phraseLengthChars: 48,
    language: 'en',
    phraseBoundaryType: 'sentence',
    canPauseAfter: true,
    canReplayIndependently: true,
    semanticCompleteness: 0.95,
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 700,
    trend: 'stable',
    ...overrides,
  };
}

function decision(overrides: Partial<PacingDecision> = {}): PacingDecision {
  return {
    mode: 'balanced',
    playbackRate: 1,
    pauseAfterPhraseMs: 700,
    shouldPauseNow: false,
    shouldReplayPhrase: false,
    boundaryStrictness: 'sentence',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.9,
    nextPhraseSize: 'medium',
    reason: 'test',
    lagScore: 0.8,
    accuracyScore: 0.9,
    hesitationScore: 0.7,
    confidenceScore: 0.8,
    ...overrides,
  };
}

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

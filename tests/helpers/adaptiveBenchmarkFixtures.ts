import type { LiveTelemetryFrame, PacingDecision } from '../../src/core/adaptive/types';
import type { BrowserTtsEnvironmentFingerprint } from '../../src/types/dictation';

export const environmentA: BrowserTtsEnvironmentFingerprint = {
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

export const environmentB: BrowserTtsEnvironmentFingerprint = {
  ...environmentA,
  browserUserAgentHash: '22222222',
  platform: 'Linux armv8l',
  voiceURI: 'de-b',
  voiceName: 'German B',
  localService: false,
};

export function live(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
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

export function decision(overrides: Partial<PacingDecision> = {}): PacingDecision {
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

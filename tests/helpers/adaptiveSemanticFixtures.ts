import type { HistoricalPerformanceProfile, LiveTelemetryFrame } from '../../src/core/adaptive/types';

export function buildHistory(overrides: Partial<HistoricalPerformanceProfile> = {}): HistoricalPerformanceProfile {
  return {
    language: 'en',
    inputMode: 'browser-tts',
    comfortablePlaybackRate: 1,
    averageWpm: 55,
    averageAccuracy: 0.9,
    averageLagSec: 1.1,
    averagePauseMs: 700,
    preferredPhraseSize: 'medium',
    preferredPauseAfterPhraseMs: 700,
    typicalBackspaceRate: 0.04,
    typicalCorrectionRate: 0.05,
    strugglesWithLongPhrases: false,
    strugglesWithNumbers: false,
    strugglesWithNames: false,
    strugglesWithPunctuation: false,
    improvementTrend: 'stable',
    sessionsCount: 5,
    profileConfidence: 0.8,
    ...overrides,
  };
}

export function buildLive(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: 'p1',
    spokenProgressRatio: 0.6,
    typedProgressRatio: 0.4,
    lagSec: 2.7,
    lagWords: 4,
    lagChars: 18,
    accuracy: 0.78,
    errorRate: 0.22,
    wpm: 34,
    charsPerMinute: 180,
    pauseMs: 500,
    longestPauseMs: 900,
    backspaceRate: 0.06,
    correctionRate: 0.13,
    phraseDifficulty: 0.65,
    phraseLengthWords: 11,
    phraseLengthChars: 74,
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 700,
    trend: 'declining',
    ...overrides,
  };
}

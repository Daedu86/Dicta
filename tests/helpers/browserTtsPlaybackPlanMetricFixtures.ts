import { createEmptyInputLanguageBenchmark } from '../../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type {
  HistoricalPerformanceProfile,
  InputLanguageBenchmarkMetrics,
  PacingDecision,
} from '../../src/core/adaptive/types';
import type { AttemptEvaluation } from '../../src/core/evaluation';
import type { TtsLiveSignal } from '../../src/app/ttsPlaybackProfile';
import type { BrowserTtsDeRecoveryState } from '../../src/inputs/browserTts/browserTtsRecoveryPolicy';
import type { SupportedLanguage } from '../../src/inputs/browserTts/ttsDynamicChunkPlanner';

export function decision(overrides: Partial<PacingDecision> = {}): PacingDecision {
  return {
    mode: 'balanced',
    playbackRate: 0.95,
    pauseAfterPhraseMs: 750,
    shouldPauseNow: false,
    shouldReplayPhrase: false,
    boundaryStrictness: 'sentence',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.9,
    nextPhraseSize: 'medium',
    reason: 'mode=balanced',
    lagScore: 0.7,
    accuracyScore: 0.9,
    hesitationScore: 0.8,
    confidenceScore: 0.7,
    ...overrides,
  };
}

export function historyProfile(overrides: Partial<HistoricalPerformanceProfile> = {}): HistoricalPerformanceProfile {
  return {
    language: 'en',
    inputMode: 'browser-tts',
    comfortablePlaybackRate: 0.95,
    averageWpm: 50,
    averageAccuracy: 0.9,
    averageLagSec: 0.5,
    averagePauseMs: 750,
    preferredPhraseSize: 'medium',
    preferredPauseAfterPhraseMs: 750,
    typicalBackspaceRate: 0,
    typicalCorrectionRate: 0,
    strugglesWithLongPhrases: false,
    strugglesWithNumbers: false,
    strugglesWithNames: false,
    strugglesWithPunctuation: false,
    improvementTrend: 'stable',
    sessionsCount: 4,
    profileConfidence: 0.7,
    ...overrides,
  };
}

export function liveSignal(overrides: Partial<TtsLiveSignal> = {}): TtsLiveSignal {
  return {
    accuracy: 96,
    lagSec: 0.4,
    rawLagSec: 0.4,
    stableLagSec: 0.4,
    lagOutlierCount: 0,
    wpm: 52,
    trend: 'stable',
    controllerState: 'hold',
    ...overrides,
  };
}

export function attempt(overrides: Partial<AttemptEvaluation> = {}): AttemptEvaluation {
  return {
    typedWords: ['we', 'listen'],
    targetWords: ['we', 'listen'],
    alignedPairs: [
      { typedIndex: 0, targetIndex: 0, exact: true },
      { typedIndex: 1, targetIndex: 1, exact: true },
    ],
    matchedWords: 2,
    missedWords: 0,
    extraWords: 0,
    accuracy: 100,
    points: 2,
    lastMatchedTargetIndex: 1,
    ...overrides,
  };
}

export function recovery(overrides: Partial<BrowserTtsDeRecoveryState> = {}): BrowserTtsDeRecoveryState {
  return {
    active: false,
    level: 'none',
    validCompletedSampleCount: 0,
    pressureSampleCount: 0,
    highLagSampleCount: 0,
    lowAccuracySampleCount: 0,
    recentOutlierDiagnosticCount: 0,
    ...overrides,
  };
}

export function benchmark(language: SupportedLanguage): InputLanguageBenchmarkMetrics {
  return createEmptyInputLanguageBenchmark('browser-tts', language);
}

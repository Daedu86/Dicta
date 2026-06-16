import type { BrowserTtsPlaybackPlanInput } from '../../src/app/browserTtsPlaybackPlan';
import { createEmptyInputLanguageBenchmark } from '../../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type {
  HistoricalPerformanceProfile,
  InputLanguageBenchmarkMetrics,
  PacingDecision,
} from '../../src/core/adaptive/types';
import type { AttemptEvaluation } from '../../src/core/evaluation';
import type { TtsLiveSignal } from '../../src/app/ttsPlaybackProfile';
import { resolveBrowserTtsAdaptiveProfile } from '../../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import type { BrowserTtsDeRecoveryState } from '../../src/inputs/browserTts/browserTtsRecoveryPolicy';
import type {
  PlannedBrowserTtsChunk,
  SupportedLanguage,
} from '../../src/inputs/browserTts/ttsDynamicChunkPlanner';

export const desktopNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36',
  platform: 'Win32',
  maxTouchPoints: 0,
};

export const androidNavigator = {
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S901B) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36',
  platform: 'Linux armv8l',
  maxTouchPoints: 5,
};

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

export function chunk(overrides: Partial<PlannedBrowserTtsChunk> = {}): PlannedBrowserTtsChunk {
  const text = overrides.text ?? 'We listen carefully.';
  const wordCount = overrides.wordCount ?? text.split(/\s+/).length;

  return {
    text,
    startWordIndex: overrides.startWordIndex ?? 0,
    wordCount,
    phraseBoundaryType: overrides.phraseBoundaryType ?? 'sentence',
    canPauseAfter: overrides.canPauseAfter ?? true,
    canReplayIndependently: false,
    semanticCompleteness: overrides.semanticCompleteness ?? 1,
    punctuationLoad: overrides.punctuationLoad ?? 0.1,
    rareWordLoad: overrides.rareWordLoad ?? 0,
    syntaxComplexity: overrides.syntaxComplexity ?? 0.1,
    phraseDifficulty: overrides.phraseDifficulty ?? 0.2,
  };
}

export function input(overrides: Partial<BrowserTtsPlaybackPlanInput> = {}): BrowserTtsPlaybackPlanInput {
  const language = overrides.language ?? 'en';
  const macroWords = overrides.macroWords ?? 'We listen carefully, then we type the sentence.'.split(' ');

  const base: BrowserTtsPlaybackPlanInput = {
    macroWords,
    macroWordOffset: 0,
    macroStartWordIndex: 0,
    language,
    lastPhraseSize: 'medium',
    lastBoundaryStrictness: 'sentence',
    liveSignal: liveSignal(),
    livePracticeEvaluation: attempt(),
    browserTtsProfile: resolveBrowserTtsAdaptiveProfile(language),
    browserTtsBenchmark: benchmark(language),
    browserTtsRecovery: recovery(),
    ttsSpeechRate: 1,
    ttsPlaybackPauseMs: 260,
    adaptiveController: {
      decide: () => decision(),
    },
    historyProfile: historyProfile({ language }),
    sourceWordCount: macroWords.length,
    estimatedSpokenWordIndex: 0,
    chunkIndex: 0,
    unsafeChunkCount: 0,
    accuracyWindow: [],
    lastAccuracySnapshot: { typedWords: 0, matchedWords: 0 },
    navigatorInfo: desktopNavigator,
  };

  return {
    ...base,
    ...overrides,
  };
}

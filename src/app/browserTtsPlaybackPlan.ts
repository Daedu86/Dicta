import {
  clampBrowserTtsDeDecisionToRecommendation,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type {
  AdaptivePacingInput,
  HistoricalPerformanceProfile,
  InputLanguageBenchmarkMetrics,
  LiveTelemetryFrame,
  PacingDecision,
  PhraseSize,
} from '../core/adaptive/types';
import type { AttemptEvaluation } from '../core/evaluation';
import { buildAdaptiveBrowserTtsInput } from '../inputs/browserTts/browserTtsTelemetryAdapter';
import type { BrowserTtsAdaptiveProfile } from '../inputs/browserTts/browserTtsAdaptiveProfiles';
import type { BrowserTtsDeRecoveryState } from '../inputs/browserTts/browserTtsRecoveryPolicy';
import type {
  PlanBrowserTtsChunkInput,
  PlannedBrowserTtsChunk,
  SupportedLanguage,
} from '../inputs/browserTts/ttsDynamicChunkPlanner';
import { planBrowserTtsAdaptiveChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';
import type { TtsPacingMode } from '../types/dictation';
import { buildBrowserTtsChunkAccuracySnapshot } from './browserTtsChunkAccuracy';
import {
  computeBrowserTtsChunkCorrectionPressure,
  computeBrowserTtsChunkListeningPrecision,
} from './browserTtsChunkListeningMetrics';
import { buildBrowserTtsRuntimeDecisionPipeline } from './browserTtsPlaybackDecisionPipeline';
import { buildBrowserTtsTelemetry } from './browserTtsPlaybackTelemetry';
import type { TtsLiveSignal } from './ttsPlaybackProfile';
import { mapAdaptivePacingMode } from './ttsPacingHelpers';

export type BrowserTtsBoundaryStrictness = 'sentence' | 'clause' | 'phrase';

export type BrowserTtsChunkPlanner = (input: PlanBrowserTtsChunkInput) => PlannedBrowserTtsChunk | null;

export type BrowserTtsPlaybackPlanInput = {
  macroWords: string[];
  macroWordOffset: number;
  macroStartWordIndex: number;
  language: SupportedLanguage;
  lastPhraseSize: PhraseSize;
  lastBoundaryStrictness: BrowserTtsBoundaryStrictness;
  liveSignal: TtsLiveSignal;
  livePracticeEvaluation: AttemptEvaluation;
  browserTtsProfile: BrowserTtsAdaptiveProfile;
  browserTtsBenchmark: InputLanguageBenchmarkMetrics | null | undefined;
  browserTtsRecovery: BrowserTtsDeRecoveryState;
  ttsSpeechRate: number;
  ttsPlaybackPauseMs: number;
  adaptiveController: {
    decide(input: AdaptivePacingInput): PacingDecision;
  };
  historyProfile: HistoricalPerformanceProfile;
  sourceWordCount: number;
  estimatedSpokenWordIndex: number;
  chunkIndex: number;
  unsafeChunkCount: number;
  accuracyWindow: number[];
  lastAccuracySnapshot: {
    typedWords: number;
    matchedWords: number;
  };
  navigatorInfo: {
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
  };
  chunkPlanner?: BrowserTtsChunkPlanner;
};

export type BrowserTtsPlaybackPlan = {
  candidateChunk: PlannedBrowserTtsChunk;
  chunk: PlannedBrowserTtsChunk;
  rawDecision: PacingDecision;
  decision: PacingDecision;
  runtimeDecision: PacingDecision;
  pacingMode: TtsPacingMode;
  pauseAtBoundary: boolean;
  semanticCompleteness: number;
  rate: number;
  effectivePauseNow: boolean;
  effectiveReplay: false;
  browserTelemetry: LiveTelemetryFrame;
  chunkTelemetry: LiveTelemetryFrame;
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
  nextAccuracyWindow: number[];
  typedWordsNow: number;
  matchedWordsNow: number;
  nextLastPhraseSize: PhraseSize;
  nextLastBoundaryStrictness: BrowserTtsBoundaryStrictness;
  unsafeBoundaryApplied: boolean;
  unsafeChunkCount: number;
  mobileFallbackApplied: boolean;
  germanShortBias: boolean;
  recoverySafeBoundary: boolean;
};

export function buildBrowserTtsPlaybackPlan(input: BrowserTtsPlaybackPlanInput): BrowserTtsPlaybackPlan | null {
  const {
    macroWords,
    macroWordOffset,
    macroStartWordIndex,
    language,
    lastPhraseSize,
    lastBoundaryStrictness,
    liveSignal,
    livePracticeEvaluation,
    browserTtsProfile,
    browserTtsBenchmark,
    browserTtsRecovery,
    ttsSpeechRate,
    ttsPlaybackPauseMs,
    adaptiveController,
    historyProfile,
    sourceWordCount,
    estimatedSpokenWordIndex,
    chunkIndex,
    unsafeChunkCount,
    accuracyWindow,
    lastAccuracySnapshot,
    navigatorInfo,
    chunkPlanner = planBrowserTtsAdaptiveChunk,
  } = input;

  const useBrowserTtsDeRecoverySafeChunks =
    language === 'de' && (browserTtsRecovery.level === 'strong' || browserTtsRecovery.level === 'severe');
  const {
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    nextAccuracyWindow,
    typedWordsNow,
    matchedWordsNow,
  } = buildBrowserTtsChunkAccuracySnapshot({
    liveSignal,
    livePracticeEvaluation,
    accuracyWindow,
    lastAccuracySnapshot,
  });
  const germanShortBias =
    browserTtsProfile.germanShortBias.enabled &&
    (liveSignal.lagSec > browserTtsProfile.germanShortBias.lagSecTrigger ||
      liveSignal.accuracy < browserTtsProfile.germanShortBias.accuracyPercentTrigger);

  const candidateChunk =
    chunkPlanner({
      macroWords,
      macroWordOffset,
      globalStartWordIndex: macroStartWordIndex,
      language,
      nextPhraseSize: lastPhraseSize,
      boundaryStrictness: lastBoundaryStrictness,
      germanShortBias,
      maxWordsOverride: browserTtsRecovery.shortChunkWordCap,
      recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
    }) ??
    chunkPlanner({
      macroWords,
      macroWordOffset,
      globalStartWordIndex: macroStartWordIndex,
      language,
      nextPhraseSize: 'short',
      boundaryStrictness: 'phrase',
      germanShortBias,
      maxWordsOverride: browserTtsRecovery.shortChunkWordCap,
      recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
    });

  if (!candidateChunk) {
    return null;
  }

  const browserTelemetry = buildBrowserTtsTelemetry({
    phraseId: `tts-${chunkIndex}`,
    sourceWordCount,
    estimatedSpokenWordIndex,
    livePracticeEvaluation,
    liveSignal,
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    listeningPrecision: computeBrowserTtsChunkListeningPrecision({
      livePracticeEvaluation,
      language,
      chunk: candidateChunk,
    }),
    correctionPressure: computeBrowserTtsChunkCorrectionPressure(livePracticeEvaluation, candidateChunk),
    pauseMs: ttsPlaybackPauseMs,
    phraseDifficulty: candidateChunk.phraseDifficulty,
    phraseLengthWords: candidateChunk.wordCount,
    phraseLengthChars: candidateChunk.text.length,
    currentPlaybackRate: ttsSpeechRate,
    language,
    chunk: candidateChunk,
  });
  const rawDecision = adaptiveController.decide(buildAdaptiveBrowserTtsInput(browserTelemetry, historyProfile));
  const decision = clampBrowserTtsDeDecisionToRecommendation(rawDecision, browserTtsBenchmark);
  const pacingMode = mapAdaptivePacingMode(decision.mode);
  const chunk =
    chunkPlanner({
      macroWords,
      macroWordOffset,
      globalStartWordIndex: macroStartWordIndex,
      language,
      nextPhraseSize: decision.nextPhraseSize,
      boundaryStrictness: decision.boundaryStrictness,
      germanShortBias,
      maxWordsOverride: browserTtsRecovery.shortChunkWordCap,
      recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
    }) ?? candidateChunk;

  const pauseAtBoundary = chunk.canPauseAfter ?? true;
  const semanticCompleteness = chunk.semanticCompleteness ?? 1;
  const {
    runtimeDecision,
    unsafeBoundaryApplied,
    mobileFallbackApplied,
  } = buildBrowserTtsRuntimeDecisionPipeline({
    decision,
    browserTtsBenchmark,
    browserTtsRecovery,
    browserTtsProfile,
    liveSignal,
    rollingAccuracyLast3,
    navigatorInfo,
    chunk,
    ttsSpeechRate,
  });
  const nextUnsafeChunkCount = unsafeChunkCount + (unsafeBoundaryApplied ? 1 : 0);
  const rate = runtimeDecision.playbackRate;
  const effectivePauseNow = runtimeDecision.shouldPauseNow && pauseAtBoundary;
  const chunkTelemetry = buildBrowserTtsTelemetry({
    phraseId: `tts-${chunkIndex}-chunk`,
    sourceWordCount,
    estimatedSpokenWordIndex: chunk.startWordIndex,
    livePracticeEvaluation,
    liveSignal,
    unsafeChunkCount: nextUnsafeChunkCount,
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    listeningPrecision: computeBrowserTtsChunkListeningPrecision({
      livePracticeEvaluation,
      language,
      chunk,
    }),
    correctionPressure: computeBrowserTtsChunkCorrectionPressure(livePracticeEvaluation, chunk),
    pauseMs: ttsPlaybackPauseMs,
    phraseDifficulty: chunk.phraseDifficulty ?? 0.5,
    phraseLengthWords: chunk.wordCount,
    phraseLengthChars: chunk.text.length,
    currentPlaybackRate: rate,
    language,
    chunk,
  });

  return {
    candidateChunk,
    chunk,
    rawDecision,
    decision,
    runtimeDecision,
    pacingMode,
    pauseAtBoundary,
    semanticCompleteness,
    rate,
    effectivePauseNow,
    effectiveReplay: false,
    browserTelemetry,
    chunkTelemetry,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    nextAccuracyWindow,
    typedWordsNow,
    matchedWordsNow,
    nextLastPhraseSize: runtimeDecision.nextPhraseSize,
    nextLastBoundaryStrictness: runtimeDecision.boundaryStrictness,
    unsafeBoundaryApplied,
    unsafeChunkCount: nextUnsafeChunkCount,
    mobileFallbackApplied,
    germanShortBias,
    recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
  };
}

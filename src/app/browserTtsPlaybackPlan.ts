import type {
  AdaptivePacingInput,
  HistoricalPerformanceProfile,
  InputLanguageBenchmarkMetrics,
  ListeningPrecisionMetrics,
  LiveTelemetryFrame,
  PacingDecision,
  PhraseSize,
} from '../core/adaptive/types';
import { computeListeningPrecisionMetrics } from '../core/adaptive/listeningPrecisionMetrics';
import type { AttemptEvaluation } from '../core/evaluation';
import {
  buildAdaptiveBrowserTtsInput,
  buildBrowserTtsTelemetryFrame,
} from '../inputs/browserTts/browserTtsTelemetryAdapter';
import type { BrowserTtsAdaptiveProfile } from '../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  clampBrowserTtsDeDecisionToRecommendation,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  applyBrowserTtsMobilePacingFallback,
  applyBrowserTtsRuntimeRateFloor,
} from '../inputs/browserTts/browserTtsRatePolicy';
import { applyBrowserTtsUnsafeBoundaryPolicy } from '../inputs/browserTts/browserTtsUnsafePolicy';
import type { BrowserTtsDeRecoveryState } from '../inputs/browserTts/browserTtsRecoveryPolicy';
import { applyBrowserTtsDeRecoveryPolicy } from '../inputs/browserTts/browserTtsRecoveryPolicy';
import type {
  PlanBrowserTtsChunkInput,
  PlannedBrowserTtsChunk,
  SupportedLanguage,
} from '../inputs/browserTts/ttsDynamicChunkPlanner';
import { planBrowserTtsAdaptiveChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';
import type { TtsPacingMode } from '../types/dictation';
import { averageNumbers, clamp01 } from './appRuntimeHelpers';
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

const TTS_BASE_WORDS_PER_SECOND = 2.6;

type BrowserTtsChunkCorrectionPressure = {
  backspaceRate: number;
  correctionRate: number;
};

function computeBrowserTtsChunkListeningPrecision(params: {
  livePracticeEvaluation: AttemptEvaluation;
  language: SupportedLanguage;
  chunk: PlannedBrowserTtsChunk;
}): ListeningPrecisionMetrics {
  const typedText = extractTypedTextForChunk(params.livePracticeEvaluation, params.chunk);

  return computeListeningPrecisionMetrics({
    targetText: params.chunk.text,
    typedText,
    typedTextAtPlaybackEnd: typedText,
    language: params.language,
  });
}

function computeBrowserTtsChunkCorrectionPressure(
  evaluation: AttemptEvaluation,
  chunk: PlannedBrowserTtsChunk,
): BrowserTtsChunkCorrectionPressure {
  const typedWords = extractTypedWordsForChunk(evaluation, chunk);
  const chunkStart = chunk.startWordIndex;
  const chunkEnd = chunkStart + chunk.wordCount;
  const matchedPairs = evaluation.alignedPairs.filter(
    (pair) => pair.targetIndex >= chunkStart && pair.targetIndex < chunkEnd,
  );
  const matchedCount = matchedPairs.length;
  const fuzzyMatchCount = matchedPairs.filter((pair) => !pair.exact).length;
  const missedCount = Math.max(0, chunk.wordCount - matchedCount);
  const extraCount = Math.max(0, typedWords.length - matchedCount);
  const denominator = Math.max(1, chunk.wordCount);

  return {
    // Browser TTS does not yet receive key-level deletion events in this planning path.
    backspaceRate: 0,
    correctionRate: clamp01((missedCount + extraCount + fuzzyMatchCount) / denominator),
  };
}

function extractTypedTextForChunk(
  evaluation: AttemptEvaluation,
  chunk: PlannedBrowserTtsChunk,
): string {
  return extractTypedWordsForChunk(evaluation, chunk).join(' ');
}

function extractTypedWordsForChunk(
  evaluation: AttemptEvaluation,
  chunk: PlannedBrowserTtsChunk,
): string[] {
  const chunkStart = chunk.startWordIndex;
  const chunkEnd = chunkStart + chunk.wordCount;
  const matchedTypedIndices = evaluation.alignedPairs
    .filter((pair) => pair.targetIndex >= chunkStart && pair.targetIndex < chunkEnd)
    .map((pair) => pair.typedIndex)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < evaluation.typedWords.length);

  if (matchedTypedIndices.length === 0) {
    const fallbackStart = Math.max(0, Math.min(evaluation.typedWords.length, chunkStart));
    const fallbackEnd = Math.max(
      fallbackStart,
      Math.min(evaluation.typedWords.length, fallbackStart + chunk.wordCount),
    );
    return evaluation.typedWords.slice(fallbackStart, fallbackEnd);
  }

  const typedStart = Math.max(0, Math.min(...matchedTypedIndices));
  const typedEnd = Math.min(evaluation.typedWords.length, Math.max(...matchedTypedIndices) + 1);
  return evaluation.typedWords.slice(typedStart, typedEnd);
}

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
  const typedWordsNow = livePracticeEvaluation.typedWords.length;
  const matchedWordsNow = livePracticeEvaluation.matchedWords;
  const typedDelta = Math.max(0, typedWordsNow - lastAccuracySnapshot.typedWords);
  const matchedDelta = Math.max(0, matchedWordsNow - lastAccuracySnapshot.matchedWords);
  const sessionAccuracy = clamp01(liveSignal.accuracy / 100);
  const chunkAccuracy = typedDelta > 0 ? clamp01(matchedDelta / typedDelta) : sessionAccuracy;
  const rollingWindow = [...accuracyWindow, chunkAccuracy];
  const rollingAccuracyLast3 = averageNumbers(rollingWindow.slice(-3), chunkAccuracy);
  const rollingAccuracyLast5 = averageNumbers(rollingWindow.slice(-5), chunkAccuracy);
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

  const browserTelemetry = buildBrowserTelemetry({
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
  const rateAfterFloor = applyBrowserTtsRuntimeRateFloor({
    mode: decision.mode,
    requestedRate: decision.playbackRate,
    lagSec: liveSignal.lagSec,
    accuracy: rollingAccuracyLast3,
    supportNeeded: decision.reason.includes('support-needed'),
    profile: browserTtsProfile,
  });
  const unsafeRuntime = applyBrowserTtsUnsafeBoundaryPolicy({
    boundaryType: chunk.phraseBoundaryType,
    requestedRate: rateAfterFloor,
    previousRate: ttsSpeechRate,
    pauseAfterPhraseMs: decision.pauseAfterPhraseMs,
    profile: browserTtsProfile,
  });
  const postPolicyDecision =
    unsafeRuntime.playbackRate === decision.playbackRate && unsafeRuntime.pauseAfterPhraseMs === decision.pauseAfterPhraseMs
      ? decision
      : {
          ...decision,
          playbackRate: unsafeRuntime.playbackRate,
          pauseAfterPhraseMs: unsafeRuntime.pauseAfterPhraseMs,
          reason: unsafeRuntime.unsafeBoundaryApplied
            ? `${decision.reason}, unsafe-boundary-conservative`
            : decision.reason,
        };
  const mobileFallback = applyBrowserTtsMobilePacingFallback({
    decision: postPolicyDecision,
    lagSec: liveSignal.lagSec,
    accuracy: rollingAccuracyLast3,
    userAgent: navigatorInfo.userAgent,
    platform: navigatorInfo.platform,
    maxTouchPoints: navigatorInfo.maxTouchPoints,
    profile: browserTtsProfile,
  });
  const recommendedDecision = clampBrowserTtsDeDecisionToRecommendation(mobileFallback.decision, browserTtsBenchmark);
  const runtimeDecision = applyBrowserTtsDeRecoveryPolicy({
    decision: recommendedDecision,
    recovery: browserTtsRecovery,
    profile: browserTtsProfile,
  });
  const nextUnsafeChunkCount = unsafeChunkCount + (unsafeRuntime.unsafeBoundaryApplied ? 1 : 0);
  const rate = runtimeDecision.playbackRate;
  const effectivePauseNow = runtimeDecision.shouldPauseNow && pauseAtBoundary;
  const chunkTelemetry = buildBrowserTelemetry({
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
    nextAccuracyWindow: rollingWindow.slice(-5),
    typedWordsNow,
    matchedWordsNow,
    nextLastPhraseSize: runtimeDecision.nextPhraseSize,
    nextLastBoundaryStrictness: runtimeDecision.boundaryStrictness,
    unsafeBoundaryApplied: unsafeRuntime.unsafeBoundaryApplied,
    unsafeChunkCount: nextUnsafeChunkCount,
    mobileFallbackApplied: mobileFallback.mobileFallbackApplied,
    germanShortBias,
    recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
  };
}

function buildBrowserTelemetry(params: {
  phraseId: string;
  sourceWordCount: number;
  estimatedSpokenWordIndex: number;
  livePracticeEvaluation: AttemptEvaluation;
  liveSignal: TtsLiveSignal;
  unsafeChunkCount?: number;
  sessionAccuracy: number;
  chunkAccuracy: number;
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
  listeningPrecision: ListeningPrecisionMetrics;
  correctionPressure: BrowserTtsChunkCorrectionPressure;
  pauseMs: number;
  phraseDifficulty: number;
  phraseLengthWords: number;
  phraseLengthChars: number;
  currentPlaybackRate: number;
  language: SupportedLanguage;
  chunk: PlannedBrowserTtsChunk;
}): LiveTelemetryFrame {
  return buildBrowserTtsTelemetryFrame({
    inputMode: 'browser-tts',
    phraseId: params.phraseId,
    estimatedSpokenRatio:
      params.sourceWordCount > 0 ? params.estimatedSpokenWordIndex / params.sourceWordCount : 0,
    typedProgressRatio:
      params.sourceWordCount > 0
        ? Math.max(0, params.livePracticeEvaluation.lastMatchedTargetIndex + 1) / params.sourceWordCount
        : 0,
    lagSec: params.liveSignal.lagSec,
    lagWords: Math.max(0, Math.round(params.liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
    lagChars: Math.max(0, Math.round(params.liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
    rawLagSec: params.liveSignal.rawLagSec,
    stableLagSec: params.liveSignal.stableLagSec,
    lagOutlierCount: params.liveSignal.lagOutlierCount,
    unsafeChunkCount: params.unsafeChunkCount,
    accuracy: params.sessionAccuracy,
    chunkAccuracy: params.chunkAccuracy,
    rollingAccuracyLast3: params.rollingAccuracyLast3,
    rollingAccuracyLast5: params.rollingAccuracyLast5,
    sessionAccuracy: params.sessionAccuracy,
    errorRate: clamp01(1 - params.liveSignal.accuracy / 100),
    listeningPrecision: params.listeningPrecision,
    wpm: params.liveSignal.wpm,
    charsPerMinute: 0,
    pauseMs: params.pauseMs,
    longestPauseMs: 0,
    backspaceRate: params.correctionPressure.backspaceRate,
    correctionRate: params.correctionPressure.correctionRate,
    phraseDifficulty: params.phraseDifficulty,
    phraseLengthWords: params.phraseLengthWords,
    phraseLengthChars: params.phraseLengthChars,
    currentPlaybackRate: params.currentPlaybackRate,
    currentPauseAfterPhraseMs: params.pauseMs,
    language: params.language,
    trend: params.liveSignal.trend,
    phraseBoundaryType: params.chunk.phraseBoundaryType,
    canPauseAfter: params.chunk.canPauseAfter,
    canReplayIndependently: false,
    semanticCompleteness: params.chunk.semanticCompleteness,
    punctuationLoad: params.chunk.punctuationLoad,
    rareWordLoad: params.chunk.rareWordLoad,
    syntaxComplexity: params.chunk.syntaxComplexity,
  });
}

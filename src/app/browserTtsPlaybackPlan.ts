import {
  clampBrowserTtsDeDecisionToRecommendation,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildAdaptiveBrowserTtsInput } from '../inputs/browserTts/browserTtsTelemetryAdapter';
import { buildBrowserTtsChunkAccuracySnapshot } from './browserTtsChunkAccuracy';
import {
  computeBrowserTtsChunkCorrectionPressure,
  computeBrowserTtsChunkListeningPrecision,
} from './browserTtsChunkListeningMetrics';
import {
  selectBrowserTtsCandidateChunk,
  selectBrowserTtsDecisionChunk,
  shouldApplyGermanShortBias,
  shouldUseBrowserTtsRecoverySafeChunks,
} from './browserTtsPlaybackPlanChunkSelection';
import type {
  BrowserTtsPlaybackPlan,
  BrowserTtsPlaybackPlanInput,
} from './browserTtsPlaybackPlanTypes';
import { buildBrowserTtsRuntimeDecisionPipeline } from './browserTtsPlaybackDecisionPipeline';
import { buildBrowserTtsTelemetry } from './browserTtsPlaybackTelemetry';
import { mapAdaptivePacingMode } from './ttsPacingHelpers';

export type {
  BrowserTtsBoundaryStrictness,
  BrowserTtsChunkPlanner,
  BrowserTtsPlaybackPlan,
  BrowserTtsPlaybackPlanInput,
} from './browserTtsPlaybackPlanTypes';

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
    chunkPlanner,
  } = input;

  const useBrowserTtsDeRecoverySafeChunks = shouldUseBrowserTtsRecoverySafeChunks(language, browserTtsRecovery);
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
  const germanShortBias = shouldApplyGermanShortBias(liveSignal, browserTtsProfile);

  const candidateChunk = selectBrowserTtsCandidateChunk({
    macroWords,
    macroWordOffset,
    macroStartWordIndex,
    language,
    phraseSize: lastPhraseSize,
    boundaryStrictness: lastBoundaryStrictness,
    germanShortBias,
    recovery: browserTtsRecovery,
    recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
    chunkPlanner,
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
  const chunk = selectBrowserTtsDecisionChunk({
    macroWords,
    macroWordOffset,
    macroStartWordIndex,
    language,
    phraseSize: decision.nextPhraseSize,
    boundaryStrictness: decision.boundaryStrictness,
    germanShortBias,
    recovery: browserTtsRecovery,
    recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
    chunkPlanner,
    fallbackChunk: candidateChunk,
  });

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

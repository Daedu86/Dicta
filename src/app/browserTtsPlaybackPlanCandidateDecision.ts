import {
  clampBrowserTtsDeDecisionToRecommendation,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildAdaptiveBrowserTtsInput } from '../inputs/browserTts/browserTtsTelemetryAdapter';
import type { PlannedBrowserTtsChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';
import {
  computeBrowserTtsChunkCorrectionPressure,
  computeBrowserTtsChunkListeningPrecision,
} from './browserTtsChunkListeningMetrics';
import { buildBrowserTtsTelemetry } from './browserTtsPlaybackTelemetry';
import type { BrowserTtsPlaybackPlanInput } from './browserTtsPlaybackPlanTypes';
import { mapAdaptivePacingMode } from './ttsPacingHelpers';

type BrowserTtsPlanAccuracySnapshot = {
  sessionAccuracy: number;
  chunkAccuracy: number;
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
};

type ResolveBrowserTtsCandidateDecisionInput = {
  input: BrowserTtsPlaybackPlanInput;
  candidateChunk: PlannedBrowserTtsChunk;
  accuracy: BrowserTtsPlanAccuracySnapshot;
};

export function resolveBrowserTtsCandidateDecision({
  input,
  candidateChunk,
  accuracy,
}: ResolveBrowserTtsCandidateDecisionInput) {
  const {
    language,
    livePracticeEvaluation,
    liveSignal,
    ttsPlaybackPauseMs,
    ttsSpeechRate,
    adaptiveController,
    historyProfile,
    browserTtsBenchmark,
    sourceWordCount,
    estimatedSpokenWordIndex,
    chunkIndex,
  } = input;
  const {
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
  } = accuracy;
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

  return {
    browserTelemetry,
    rawDecision,
    decision,
    pacingMode: mapAdaptivePacingMode(decision.mode),
  };
}

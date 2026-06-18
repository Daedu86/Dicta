import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import type { BrowserTtsEnvironmentFingerprint } from '../types/dictation';
import { buildBrowserTtsPhraseStartDebugUpdate } from './browserTtsAdaptiveSemanticDebug';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlan';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

type BrowserTtsChunkCommitArgs = Pick<
  BrowserTtsPlaybackLoopOptions,
  | 'ttsCompletedSourceWordsRef'
  | 'ttsChunkStartMsRef'
  | 'ttsChunkStartWordIndexRef'
  | 'ttsChunkWordCountRef'
  | 'ttsChunkAccuracyWindowRef'
  | 'ttsLastAccuracySnapshotRef'
  | 'ttsUnsafeChunkCountRef'
  | 'ttsSemanticPhraseAdvanceCountRef'
  | 'ttsSemanticPhraseReplayCountRef'
  | 'recordTtsChunkTelemetry'
  | 'recordAdaptiveBenchmark'
  | 'setAdaptiveSemanticDebug'
  | 'setTtsCurrentChunk'
  | 'setTtsPacingMode'
  | 'setTtsSpeechRate'
> & {
  playbackPlan: BrowserTtsPlaybackPlan;
  macroPhraseIndex: number;
  semanticPhrase: SemanticPhrase;
  semanticPhraseCount: number;
  browserTtsEnvironment: BrowserTtsEnvironmentFingerprint | null;
};

export function commitBrowserTtsPlaybackLoopChunk({
  playbackPlan,
  macroPhraseIndex,
  semanticPhrase,
  semanticPhraseCount,
  browserTtsEnvironment,
  ttsCompletedSourceWordsRef,
  ttsChunkStartMsRef,
  ttsChunkStartWordIndexRef,
  ttsChunkWordCountRef,
  ttsChunkAccuracyWindowRef,
  ttsLastAccuracySnapshotRef,
  ttsUnsafeChunkCountRef,
  ttsSemanticPhraseAdvanceCountRef,
  ttsSemanticPhraseReplayCountRef,
  recordTtsChunkTelemetry,
  recordAdaptiveBenchmark,
  setAdaptiveSemanticDebug,
  setTtsCurrentChunk,
  setTtsPacingMode,
  setTtsSpeechRate,
}: BrowserTtsChunkCommitArgs): void {
  const {
    chunk,
    runtimeDecision,
    pacingMode,
    pauseAtBoundary,
    semanticCompleteness,
    rate,
    effectivePauseNow,
    pauseBeforeNextChunkMs,
    effectiveReplay,
    chunkTelemetry,
  } = playbackPlan;

  if (playbackPlan.unsafeBoundaryApplied) {
    ttsUnsafeChunkCountRef.current += 1;
  }

  setTtsCurrentChunk(chunk.text);
  setTtsPacingMode(pacingMode);
  setTtsSpeechRate(rate);
  ttsChunkStartMsRef.current = performance.now();
  ttsChunkStartWordIndexRef.current = chunk.startWordIndex;
  ttsChunkWordCountRef.current = chunk.wordCount;
  ttsCompletedSourceWordsRef.current = chunk.startWordIndex;
  recordTtsChunkTelemetry({
    startWordIndex: chunk.startWordIndex,
    wordCount: chunk.wordCount,
    rate,
    pacingMode,
  });
  recordAdaptiveBenchmark(chunkTelemetry, runtimeDecision, {
    actualPlaybackRate: rate,
    actualPauseMs: pauseBeforeNextChunkMs,
    replayExecuted: effectiveReplay,
    actualBoundaryType: chunk.phraseBoundaryType,
    ttsEnvironment: browserTtsEnvironment,
    event: resolveBrowserTtsBenchmarkEvent(playbackPlan),
    phraseIndex: macroPhraseIndex,
    totalSemanticPhrases: semanticPhraseCount,
  });
  ttsChunkAccuracyWindowRef.current = playbackPlan.nextAccuracyWindow;
  ttsLastAccuracySnapshotRef.current = {
    typedWords: playbackPlan.typedWordsNow,
    matchedWords: playbackPlan.matchedWordsNow,
  };
  setAdaptiveSemanticDebug((current) =>
    buildBrowserTtsPhraseStartDebugUpdate({
      current,
      semanticCompleteness,
      chunk,
      shouldPauseNow: runtimeDecision.shouldPauseNow,
      pauseAtBoundary,
      effectivePauseNow,
      deferPauseUntilSafeBoundary: runtimeDecision.deferPauseUntilSafeBoundary,
      shouldReplayPhrase: runtimeDecision.shouldReplayPhrase,
      effectiveReplay,
      macroPhraseIndex,
      semanticPhrase,
      totalSemanticPhrases: semanticPhraseCount,
      phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
      phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
    }),
  );
}

function resolveBrowserTtsBenchmarkEvent(
  playbackPlan: Pick<BrowserTtsPlaybackPlan, 'effectiveReplay' | 'effectivePauseNow' | 'runtimeDecision'>,
): 'replay' | 'pause' | 'defer_pause' | 'phrase_advance' {
  if (playbackPlan.effectiveReplay) return 'replay';
  if (playbackPlan.effectivePauseNow) return 'pause';
  if (playbackPlan.runtimeDecision.deferPauseUntilSafeBoundary) return 'defer_pause';
  return 'phrase_advance';
}

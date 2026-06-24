import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
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
  | 'setAdaptiveSemanticDebug'
  | 'setTtsCurrentChunk'
  | 'setTtsPacingMode'
  | 'setTtsSpeechRate'
> & {
  playbackPlan: BrowserTtsPlaybackPlan;
  macroPhraseIndex: number;
  semanticPhrase: SemanticPhrase;
  semanticPhraseCount: number;
};

export function commitBrowserTtsPlaybackLoopChunk({
  playbackPlan,
  macroPhraseIndex,
  semanticPhrase,
  semanticPhraseCount,
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
    effectiveReplay,
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

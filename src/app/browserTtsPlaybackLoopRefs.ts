import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

type BrowserTtsPlaybackLoopRefResetArgs = Pick<
  BrowserTtsPlaybackLoopOptions,
  | 'ttsSemanticPhraseAdvanceCountRef'
  | 'ttsSemanticPhraseReplayCountRef'
  | 'ttsStartedAtMsRef'
  | 'ttsCompletedSourceWordsRef'
  | 'ttsPausedAtWordIndexRef'
  | 'ttsLagOutlierCountRef'
  | 'ttsLastValidControlLagSecRef'
  | 'ttsUnsafeChunkCountRef'
  | 'ttsChunkAccuracyWindowRef'
  | 'ttsLastAccuracySnapshotRef'
  | 'ttsLastControllerActionRef'
> & {
  clampedStartWordIndex: number;
};

export function resetBrowserTtsPlaybackLoopRefs({
  clampedStartWordIndex,
  ttsSemanticPhraseAdvanceCountRef,
  ttsSemanticPhraseReplayCountRef,
  ttsStartedAtMsRef,
  ttsCompletedSourceWordsRef,
  ttsPausedAtWordIndexRef,
  ttsLagOutlierCountRef,
  ttsLastValidControlLagSecRef,
  ttsUnsafeChunkCountRef,
  ttsChunkAccuracyWindowRef,
  ttsLastAccuracySnapshotRef,
  ttsLastControllerActionRef,
}: BrowserTtsPlaybackLoopRefResetArgs): void {
  ttsSemanticPhraseAdvanceCountRef.current = 0;
  ttsSemanticPhraseReplayCountRef.current = 0;
  ttsStartedAtMsRef.current = performance.now();
  ttsCompletedSourceWordsRef.current = clampedStartWordIndex;
  ttsPausedAtWordIndexRef.current = null;
  ttsLagOutlierCountRef.current = 0;
  ttsLastValidControlLagSecRef.current = 0;
  ttsUnsafeChunkCountRef.current = 0;
  ttsChunkAccuracyWindowRef.current = [];
  ttsLastAccuracySnapshotRef.current = { typedWords: 0, matchedWords: 0 };
  ttsLastControllerActionRef.current = 'hold';
}

import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';
import { resetBrowserTtsPlaybackLoopRefs } from './browserTtsPlaybackLoopRefs';

type BrowserTtsLoopRefResetOptions = Pick<
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
>;

type BrowserTtsLoopStateSetters = Pick<
  BrowserTtsPlaybackLoopOptions,
  'setError' | 'setTtsStatus' | 'setRunning' | 'setSessionStatus'
>;

type BrowserTtsLoopFinishOptions = Pick<
  BrowserTtsPlaybackLoopOptions,
  | 'ttsTranscript'
  | 'ttsCompletedSourceWordsRef'
  | 'ttsChunkStartMsRef'
  | 'ttsUtteranceRef'
  | 'applyTtsPerformanceSample'
  | 'setTtsCurrentChunk'
  | 'setTtsStatus'
  | 'setRunning'
  | 'setSessionStatus'
>;

export type BrowserTtsPlaybackLoopCursor = {
  chunkIndex: number;
  macroPhraseIndex: number;
  macroWordOffset: number;
};

export function startBrowserTtsPlaybackLoopState({
  clampedStartWordIndex,
  ttsSpeechRate,
  ensureAttemptTelemetry,
  recordTtsTelemetryAction,
  setError,
  setTtsStatus,
  setRunning,
  setSessionStatus,
  ...refs
}: BrowserTtsLoopRefResetOptions &
  BrowserTtsLoopStateSetters &
  Pick<BrowserTtsPlaybackLoopOptions, 'ensureAttemptTelemetry' | 'recordTtsTelemetryAction' | 'ttsSpeechRate'> & {
    clampedStartWordIndex: number;
  }): void {
  resetBrowserTtsPlaybackLoopRefs({
    clampedStartWordIndex,
    ...refs,
  });
  ensureAttemptTelemetry();
  recordTtsTelemetryAction('play', ttsSpeechRate);
  setError('');
  setTtsStatus('playing');
  setRunning(true);
  setSessionStatus('running');
}

export function finishBrowserTtsPlaybackLoop({
  ttsTranscript,
  ttsCompletedSourceWordsRef,
  ttsChunkStartMsRef,
  ttsUtteranceRef,
  applyTtsPerformanceSample,
  setTtsCurrentChunk,
  setTtsStatus,
  setRunning,
  setSessionStatus,
}: BrowserTtsLoopFinishOptions): void {
  setTtsCurrentChunk('');
  setTtsStatus('finished');
  setRunning(false);
  setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
  ttsCompletedSourceWordsRef.current = ttsTranscript?.words.length ?? ttsCompletedSourceWordsRef.current;
  ttsChunkStartMsRef.current = null;
  applyTtsPerformanceSample();
  ttsUtteranceRef.current = null;
}

export function advanceBrowserTtsMacroPhraseCursor(cursor: BrowserTtsPlaybackLoopCursor): BrowserTtsPlaybackLoopCursor {
  return {
    ...cursor,
    macroPhraseIndex: cursor.macroPhraseIndex + 1,
    macroWordOffset: 0,
  };
}

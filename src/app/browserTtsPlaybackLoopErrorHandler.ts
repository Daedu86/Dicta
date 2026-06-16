import { buildBrowserTtsUnexpectedErrorPlan } from './browserTtsUnexpectedErrorPlan';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

type BrowserTtsPlaybackLoopErrorHandlerParams = {
  error: SpeechSynthesisErrorCode;
  cancelled: boolean;
  perfDiagnostics: BrowserTtsPlaybackLoopOptions['perfDiagnostics'];
  perfUtteranceId: ReturnType<BrowserTtsPlaybackLoopOptions['perfDiagnostics']['beginTtsUtterance']>;
  ttsUtteranceRef: BrowserTtsPlaybackLoopOptions['ttsUtteranceRef'];
  setTtsStatus: BrowserTtsPlaybackLoopOptions['setTtsStatus'];
  setError: BrowserTtsPlaybackLoopOptions['setError'];
  setCancelled: (cancelled: boolean) => void;
};

export function handleBrowserTtsPlaybackLoopError({
  error,
  cancelled,
  perfDiagnostics,
  perfUtteranceId,
  ttsUtteranceRef,
  setTtsStatus,
  setError,
  setCancelled,
}: BrowserTtsPlaybackLoopErrorHandlerParams): void {
  const errorPlan = buildBrowserTtsUnexpectedErrorPlan({
    error,
    cancelled,
  });

  perfDiagnostics.recordTtsError(perfUtteranceId, errorPlan.recordedError);
  if (!errorPlan.shouldApplyState) return;

  setCancelled(errorPlan.nextCancelled);
  ttsUtteranceRef.current = null;
  setTtsStatus('paused');
  setError(errorPlan.userErrorMessage);
}

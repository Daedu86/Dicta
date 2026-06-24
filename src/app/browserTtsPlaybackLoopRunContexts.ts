import { finishBrowserTtsPlaybackLoop, startBrowserTtsPlaybackLoopState } from './browserTtsPlaybackLoopLifecycle';
import type {
  BrowserTtsPlaybackAdaptiveContext,
  BrowserTtsPlaybackLoopOptions,
  BrowserTtsPlaybackProgressContext,
  BrowserTtsPlaybackRunContext,
  BrowserTtsPlaybackTelemetryContext,
  BrowserTtsPlaybackUiContext,
} from './browserTtsPlaybackLoopTypes';

export type BrowserTtsPlaybackLoopRunOptions = BrowserTtsPlaybackLoopOptions & {
  startWordIndex: number;
  perfPlayId: number;
};

type BrowserTtsPlaybackLoopContextsInput = {
  options: BrowserTtsPlaybackLoopRunOptions;
  browserTtsVoice: SpeechSynthesisVoice | null;
  browserTtsEnvironment: ReturnType<BrowserTtsPlaybackLoopOptions['collectBrowserTtsEnvironmentForSession']>;
};

export type BrowserTtsPlaybackLoopContexts = {
  playbackRuntime: BrowserTtsPlaybackRunContext;
  progressContext: BrowserTtsPlaybackProgressContext;
  adaptiveContext: BrowserTtsPlaybackAdaptiveContext;
  telemetryContext: BrowserTtsPlaybackTelemetryContext;
  uiContext: BrowserTtsPlaybackUiContext;
};

export function startBrowserTtsPlaybackLoopRun(
  options: BrowserTtsPlaybackLoopRunOptions,
  clampedStartWordIndex: number,
): void {
  startBrowserTtsPlaybackLoopState({
    clampedStartWordIndex,
    ttsSpeechRate: options.ttsSpeechRate,
    ttsSemanticPhraseAdvanceCountRef: options.ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef: options.ttsSemanticPhraseReplayCountRef,
    ttsStartedAtMsRef: options.ttsStartedAtMsRef,
    ttsCompletedSourceWordsRef: options.ttsCompletedSourceWordsRef,
    ttsPausedAtWordIndexRef: options.ttsPausedAtWordIndexRef,
    ttsLagOutlierCountRef: options.ttsLagOutlierCountRef,
    ttsLastValidControlLagSecRef: options.ttsLastValidControlLagSecRef,
    ttsUnsafeChunkCountRef: options.ttsUnsafeChunkCountRef,
    ttsChunkAccuracyWindowRef: options.ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef: options.ttsLastAccuracySnapshotRef,
    ttsLastControllerActionRef: options.ttsLastControllerActionRef,
    ensureAttemptTelemetry: options.ensureAttemptTelemetry,
    recordTtsTelemetryAction: options.recordTtsTelemetryAction,
    setError: options.setError,
    setTtsStatus: options.setTtsStatus,
    setRunning: options.setRunning,
    setSessionStatus: options.setSessionStatus,
  });
}

export function createBrowserTtsPlaybackLoopContexts({
  options,
  browserTtsVoice,
  browserTtsEnvironment,
}: BrowserTtsPlaybackLoopContextsInput): BrowserTtsPlaybackLoopContexts {
  return {
    playbackRuntime: {
      activeSession: options.activeSession,
      ttsLanguage: options.ttsLanguage,
      ttsTranscript: options.ttsTranscript,
      ttsSpeechRate: options.ttsSpeechRate,
      ttsPlaybackProfile: options.ttsPlaybackProfile,
      browserTtsSafePauseGateSettings: options.browserTtsSafePauseGateSettings,
      browserTtsVoices: options.browserTtsVoices,
      browserTtsVoice,
      browserTtsEnvironment,
      perfDiagnostics: options.perfDiagnostics,
      perfPlayId: options.perfPlayId,
      speakBrowserTts: options.speakBrowserTts,
      ttsUtteranceRef: options.ttsUtteranceRef,
    },
    progressContext: {
      ttsCompletedSourceWordsRef: options.ttsCompletedSourceWordsRef,
      ttsChunkStartMsRef: options.ttsChunkStartMsRef,
      ttsChunkStartWordIndexRef: options.ttsChunkStartWordIndexRef,
      ttsChunkWordCountRef: options.ttsChunkWordCountRef,
    },
    adaptiveContext: {
      ttsChunkAccuracyWindowRef: options.ttsChunkAccuracyWindowRef,
      ttsLastAccuracySnapshotRef: options.ttsLastAccuracySnapshotRef,
      ttsUnsafeChunkCountRef: options.ttsUnsafeChunkCountRef,
      ttsSemanticPhraseAdvanceCountRef: options.ttsSemanticPhraseAdvanceCountRef,
      ttsSemanticPhraseReplayCountRef: options.ttsSemanticPhraseReplayCountRef,
      ttsLiveSignalRef: options.ttsLiveSignalRef,
      setAdaptiveSemanticDebug: options.setAdaptiveSemanticDebug,
    },
    telemetryContext: {
      perfDiagnostics: options.perfDiagnostics,
      recordTtsChunkTelemetry: options.recordTtsChunkTelemetry,
      recordAdaptiveBenchmark: options.recordAdaptiveBenchmark,
      recordPhrasePlaybackEvent: options.recordPhrasePlaybackEvent,
      applyTtsPerformanceSample: options.applyTtsPerformanceSample,
    },
    uiContext: {
      setTtsCurrentChunk: options.setTtsCurrentChunk,
      setTtsPacingMode: options.setTtsPacingMode,
      setTtsSpeechRate: options.setTtsSpeechRate,
      setTtsStatus: options.setTtsStatus,
      setError: options.setError,
      setRunning: options.setRunning,
      setSessionStatus: options.setSessionStatus,
    },
  };
}

export function finishBrowserTtsPlaybackLoopRun(options: BrowserTtsPlaybackLoopRunOptions): void {
  finishBrowserTtsPlaybackLoop({
    ttsTranscript: options.ttsTranscript,
    ttsCompletedSourceWordsRef: options.ttsCompletedSourceWordsRef,
    ttsChunkStartMsRef: options.ttsChunkStartMsRef,
    ttsUtteranceRef: options.ttsUtteranceRef,
    applyTtsPerformanceSample: options.applyTtsPerformanceSample,
    setTtsCurrentChunk: options.setTtsCurrentChunk,
    setTtsStatus: options.setTtsStatus,
    setRunning: options.setRunning,
    setSessionStatus: options.setSessionStatus,
  });
}

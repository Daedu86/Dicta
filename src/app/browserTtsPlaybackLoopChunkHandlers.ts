import { attachBrowserTtsPlaybackLoopUtteranceHandlers } from './browserTtsPlaybackLoopUtteranceHandlers';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlanTypes';
import type { SpeakBrowserTtsPlaybackLoopChunkInput } from './browserTtsPlaybackLoopChunkSpeakerTypes';

type BrowserTtsPerfUtteranceId = ReturnType<
  SpeakBrowserTtsPlaybackLoopChunkInput['telemetryContext']['perfDiagnostics']['beginTtsUtterance']
>;

export interface AttachBrowserTtsPlaybackLoopChunkHandlersInput {
  input: SpeakBrowserTtsPlaybackLoopChunkInput;
  playbackPlan: BrowserTtsPlaybackPlan;
  perfUtteranceId: BrowserTtsPerfUtteranceId;
  utterance: SpeechSynthesisUtterance;
}

export function attachBrowserTtsPlaybackLoopChunkHandlers({
  input,
  playbackPlan,
  perfUtteranceId,
  utterance,
}: AttachBrowserTtsPlaybackLoopChunkHandlersInput): void {
  let cancelled = false;

  attachBrowserTtsPlaybackLoopUtteranceHandlers({
    utterance,
    start: () => ({
      perfDiagnostics: input.telemetryContext.perfDiagnostics,
      perfUtteranceId,
    }),
    end: () => ({
      perfDiagnostics: input.telemetryContext.perfDiagnostics,
      perfUtteranceId,
      cancelled,
      chunkIndex: input.runnerState.cursor.chunkIndex,
      macroPhraseIndex: input.runnerState.cursor.macroPhraseIndex,
      macroWordOffset: input.runnerState.cursor.macroWordOffset,
      macroWordsLength: input.runnerState.macroPhrase.macroWords.length,
      chunk: playbackPlan.chunk,
      effectivePauseNow: playbackPlan.effectivePauseNow,
      pauseBeforeNextChunkMs: playbackPlan.pauseBeforeNextChunkMs,
      runtimeDecision: playbackPlan.runtimeDecision,
      ttsCompletedSourceWordsRef: input.progressContext.ttsCompletedSourceWordsRef,
      ttsPracticeLiveTextRef: input.planInput.ttsPracticeLiveTextRef,
      ttsTranscript: input.playbackRuntime.ttsTranscript,
      recordPhrasePlaybackEvent: input.telemetryContext.recordPhrasePlaybackEvent,
      ttsLanguage: input.playbackRuntime.ttsLanguage,
      semanticPhrase: input.runnerState.macroPhrase.semanticPhrase,
      applyTtsPerformanceSample: input.telemetryContext.applyTtsPerformanceSample,
      ttsLiveSignalRef: input.adaptiveContext.ttsLiveSignalRef,
      chunkTelemetry: playbackPlan.chunkTelemetry,
      ttsUnsafeChunkCountRef: input.adaptiveContext.ttsUnsafeChunkCountRef,
      recordAdaptiveBenchmark: input.telemetryContext.recordAdaptiveBenchmark,
      rate: playbackPlan.rate,
      browserTtsEnvironment: input.playbackRuntime.browserTtsEnvironment,
      semanticPhrases: input.runnerState.macroPhrase.semanticPhrases,
      ttsSemanticPhraseAdvanceCountRef: input.adaptiveContext.ttsSemanticPhraseAdvanceCountRef,
      ttsSemanticPhraseReplayCountRef: input.adaptiveContext.ttsSemanticPhraseReplayCountRef,
      setAdaptiveSemanticDebug: input.adaptiveContext.setAdaptiveSemanticDebug,
      speakNext: input.callbacks.speakNext,
      updatePlaybackCursor: input.callbacks.updatePlaybackCursor,
    }),
    error: (event) => ({
      error: event.error,
      cancelled,
      perfDiagnostics: input.telemetryContext.perfDiagnostics,
      perfUtteranceId,
      ttsUtteranceRef: input.playbackRuntime.ttsUtteranceRef,
      setTtsStatus: input.uiContext.setTtsStatus,
      setError: input.uiContext.setError,
      setCancelled: (nextCancelled: boolean) => {
        cancelled = nextCancelled;
        input.callbacks.setCancelled(nextCancelled);
      },
    }),
  });
}

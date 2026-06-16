import type {
  BrowserTtsPlaybackAdaptiveContext,
  BrowserTtsPlaybackChunkCallbacks,
  BrowserTtsPlaybackCursorSnapshot,
  BrowserTtsPlaybackMacroPhraseContext,
  BrowserTtsPlaybackProgressContext,
  BrowserTtsPlaybackRunContext,
  BrowserTtsPlaybackTelemetryContext,
  BrowserTtsPlaybackUiContext,
} from './browserTtsPlaybackLoopTypes';
import { buildBrowserTtsPlaybackLoopChunkPlan, type BrowserTtsPlaybackLoopChunkPlanInput } from './browserTtsPlaybackLoopChunkPlan';
import { commitBrowserTtsPlaybackLoopChunk } from './browserTtsPlaybackLoopChunkCommit';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlanTypes';
import { createBrowserTtsPlaybackUtterance } from './browserTtsPlaybackLoopUtterance';
import { attachBrowserTtsPlaybackLoopUtteranceHandlers } from './browserTtsPlaybackLoopUtteranceHandlers';

export type SpeakBrowserTtsPlaybackLoopChunkInput = {
  playbackRuntime: BrowserTtsPlaybackRunContext;
  runnerState: {
    cursor: BrowserTtsPlaybackCursorSnapshot;
    macroPhrase: BrowserTtsPlaybackMacroPhraseContext;
  };
  planInput: BrowserTtsPlaybackLoopChunkPlanInput;
  progressContext: BrowserTtsPlaybackProgressContext;
  adaptiveContext: BrowserTtsPlaybackAdaptiveContext;
  telemetryContext: BrowserTtsPlaybackTelemetryContext;
  uiContext: BrowserTtsPlaybackUiContext;
  callbacks: BrowserTtsPlaybackChunkCallbacks;
};

export type SpeakBrowserTtsPlaybackLoopChunkResult =
  | {
      ok: true;
      playbackPlan: BrowserTtsPlaybackPlan;
    }
  | {
      ok: false;
      reason: 'no_playback_plan';
    };

export function speakBrowserTtsPlaybackLoopChunk(
  input: SpeakBrowserTtsPlaybackLoopChunkInput,
): SpeakBrowserTtsPlaybackLoopChunkResult {
  const playbackPlan = buildBrowserTtsPlaybackLoopChunkPlan(input.planInput);
  if (!playbackPlan) {
    return { ok: false, reason: 'no_playback_plan' };
  }

  const { utterance, perfUtteranceId } = createBrowserTtsPlaybackUtterance({
    chunk: playbackPlan.chunk,
    perfDiagnostics: input.playbackRuntime.perfDiagnostics,
    perfPlayId: input.playbackRuntime.perfPlayId,
    chunkIndex: input.runnerState.cursor.chunkIndex,
    ttsLanguage: input.playbackRuntime.ttsLanguage,
    pacingMode: playbackPlan.pacingMode,
    rate: playbackPlan.rate,
    browserTtsVoice: input.playbackRuntime.browserTtsVoice,
    activeSession: input.playbackRuntime.activeSession,
    browserTtsVoices: input.playbackRuntime.browserTtsVoices,
  });
  input.playbackRuntime.ttsUtteranceRef.current = utterance;

  commitBrowserTtsPlaybackLoopChunk({
    playbackPlan,
    macroPhraseIndex: input.runnerState.macroPhrase.macroPhraseIndex,
    semanticPhrase: input.runnerState.macroPhrase.semanticPhrase,
    semanticPhraseCount: input.runnerState.macroPhrase.semanticPhrases.length,
    browserTtsEnvironment: input.playbackRuntime.browserTtsEnvironment,
    ttsCompletedSourceWordsRef: input.progressContext.ttsCompletedSourceWordsRef,
    ttsChunkStartMsRef: input.progressContext.ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef: input.progressContext.ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef: input.progressContext.ttsChunkWordCountRef,
    ttsChunkAccuracyWindowRef: input.adaptiveContext.ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef: input.adaptiveContext.ttsLastAccuracySnapshotRef,
    ttsUnsafeChunkCountRef: input.adaptiveContext.ttsUnsafeChunkCountRef,
    ttsSemanticPhraseAdvanceCountRef: input.adaptiveContext.ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef: input.adaptiveContext.ttsSemanticPhraseReplayCountRef,
    recordTtsChunkTelemetry: input.telemetryContext.recordTtsChunkTelemetry,
    recordAdaptiveBenchmark: input.telemetryContext.recordAdaptiveBenchmark,
    setAdaptiveSemanticDebug: input.adaptiveContext.setAdaptiveSemanticDebug,
    setTtsCurrentChunk: input.uiContext.setTtsCurrentChunk,
    setTtsPacingMode: input.uiContext.setTtsPacingMode,
    setTtsSpeechRate: input.uiContext.setTtsSpeechRate,
  });

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
      runtimeDecision: playbackPlan.runtimeDecision,
      ttsCompletedSourceWordsRef: input.progressContext.ttsCompletedSourceWordsRef,
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

  input.telemetryContext.perfDiagnostics.recordTtsSpeak(perfUtteranceId);
  input.playbackRuntime.speakBrowserTts(utterance);
  return { ok: true, playbackPlan };
}

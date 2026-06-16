import { createBrowserTtsPlaybackLoopCursor } from './browserTtsPlaybackLoopCursor';
import { createBrowserTtsPlaybackLoopStartContext } from './browserTtsPlaybackLoopStartContext';
import { finishBrowserTtsPlaybackLoop, startBrowserTtsPlaybackLoopState } from './browserTtsPlaybackLoopLifecycle';
import { resolveBrowserTtsPlaybackStartError } from './browserTtsPlaybackLoopGuards';
import {
  speakBrowserTtsPlaybackLoopChunk,
  type SpeakBrowserTtsPlaybackLoopChunkInput,
} from './browserTtsPlaybackLoopChunkSpeaker';
import type {
  BrowserTtsPlaybackAdaptiveContext,
  BrowserTtsPlaybackProgressContext,
  BrowserTtsPlaybackRunContext,
  BrowserTtsPlaybackTelemetryContext,
  BrowserTtsPlaybackUiContext,
} from './browserTtsPlaybackLoopTypes';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';
import type { BrowserTtsPlaybackLoopChunkPlanInput } from './browserTtsPlaybackLoopChunkPlan';

export function runBrowserTtsPlaybackLoop(options: BrowserTtsPlaybackLoopOptions & { startWordIndex: number; perfPlayId: number }): void {
  const startError = resolveBrowserTtsPlaybackStartError({
    activeSessionFinished: options.activeSessionFinished,
    ttsText: options.ttsText,
    isBrowserTtsSupported: options.isBrowserTtsSupported,
  });
  if (startError) {
    options.setError(startError);
    return;
  }

  options.stopTtsPlaybackRef.current();
  const startContext = createBrowserTtsPlaybackLoopStartContext({
    activeSession: options.activeSession,
    ttsText: options.ttsText,
    ttsLanguage: options.ttsLanguage,
    ttsPacingMode: options.ttsPacingMode,
    startWordIndex: options.startWordIndex,
    buildSemanticPhrasesForCurrentSession: options.buildSemanticPhrasesForCurrentSession,
    resolveActiveBrowserTtsVoice: options.resolveActiveBrowserTtsVoice,
    collectBrowserTtsEnvironmentForSession: options.collectBrowserTtsEnvironmentForSession,
  });
  if (!startContext.ok) {
    options.setError(startContext.error);
    return;
  }

  const { playbackStartPlan, browserTtsVoice, browserTtsEnvironment } = startContext;
  const playbackCursor = createBrowserTtsPlaybackLoopCursor({
    chunkIndex: playbackStartPlan.chunkIndex,
    macroPhraseIndex: playbackStartPlan.macroPhraseIndex,
    macroWordOffset: playbackStartPlan.macroWordOffset,
    lastPhraseSize: playbackStartPlan.lastPhraseSize,
    lastBoundaryStrictness: playbackStartPlan.lastBoundaryStrictness,
  });
  let cancelled = false;

  if (playbackStartPlan.clampedStartWordIndex === 0) {
    options.beginAdaptiveSessionFeedback('browser-tts', options.ttsLanguage, playbackStartPlan.semanticPhrases.length);
  }

  startBrowserTtsPlaybackLoopState({
    clampedStartWordIndex: playbackStartPlan.clampedStartWordIndex,
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

  const playbackRuntime: BrowserTtsPlaybackRunContext = {
    activeSession: options.activeSession,
    ttsLanguage: options.ttsLanguage,
    ttsTranscript: options.ttsTranscript,
    ttsSpeechRate: options.ttsSpeechRate,
    ttsPlaybackProfile: options.ttsPlaybackProfile,
    browserTtsVoices: options.browserTtsVoices,
    browserTtsVoice,
    browserTtsEnvironment,
    perfDiagnostics: options.perfDiagnostics,
    perfPlayId: options.perfPlayId,
    speakBrowserTts: options.speakBrowserTts,
    ttsUtteranceRef: options.ttsUtteranceRef,
  };
  const progressContext: BrowserTtsPlaybackProgressContext = {
    ttsCompletedSourceWordsRef: options.ttsCompletedSourceWordsRef,
    ttsChunkStartMsRef: options.ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef: options.ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef: options.ttsChunkWordCountRef,
  };
  const adaptiveContext: BrowserTtsPlaybackAdaptiveContext = {
    ttsChunkAccuracyWindowRef: options.ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef: options.ttsLastAccuracySnapshotRef,
    ttsUnsafeChunkCountRef: options.ttsUnsafeChunkCountRef,
    ttsSemanticPhraseAdvanceCountRef: options.ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef: options.ttsSemanticPhraseReplayCountRef,
    ttsLiveSignalRef: options.ttsLiveSignalRef,
    setAdaptiveSemanticDebug: options.setAdaptiveSemanticDebug,
  };
  const telemetryContext: BrowserTtsPlaybackTelemetryContext = {
    perfDiagnostics: options.perfDiagnostics,
    recordTtsChunkTelemetry: options.recordTtsChunkTelemetry,
    recordAdaptiveBenchmark: options.recordAdaptiveBenchmark,
    recordPhrasePlaybackEvent: options.recordPhrasePlaybackEvent,
    applyTtsPerformanceSample: options.applyTtsPerformanceSample,
  };
  const uiContext: BrowserTtsPlaybackUiContext = {
    setTtsCurrentChunk: options.setTtsCurrentChunk,
    setTtsPacingMode: options.setTtsPacingMode,
    setTtsSpeechRate: options.setTtsSpeechRate,
    setTtsStatus: options.setTtsStatus,
    setError: options.setError,
    setRunning: options.setRunning,
    setSessionStatus: options.setSessionStatus,
  };

  const setCancelled = (nextCancelled: boolean): void => {
    cancelled = nextCancelled;
  };

  const speakNext = (): void => {
    const cursor = playbackCursor.get();
    if (cancelled || cursor.macroPhraseIndex >= playbackStartPlan.semanticPhrases.length) {
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
      return;
    }

    const semanticPhrase = playbackStartPlan.semanticPhrases[cursor.macroPhraseIndex];
    const macroWords = playbackStartPlan.semanticPhraseWords[cursor.macroPhraseIndex] ?? [];
    if (macroWords.length === 0 || cursor.macroWordOffset >= macroWords.length) {
      playbackCursor.advanceMacroPhrase();
      if (!cancelled) speakNext();
      return;
    }

    if (cursor.macroWordOffset === 0) {
      options.recordPhrasePlaybackEvent('phrase_started', 'browser-tts', options.ttsLanguage, semanticPhrase, cursor.macroPhraseIndex);
    }

    const planInput: BrowserTtsPlaybackLoopChunkPlanInput = {
      ttsLanguage: options.ttsLanguage,
      ttsTranscript: options.ttsTranscript,
      ttsLiveSignalRef: options.ttsLiveSignalRef,
      ttsPracticeLiveTextRef: options.ttsPracticeLiveTextRef,
      getHistoricalPerformanceProfile: options.getHistoricalPerformanceProfile,
      getBenchmarkSnapshot: options.getBenchmarkSnapshot,
      ttsSpeechRate: options.ttsSpeechRate,
      ttsPlaybackProfile: options.ttsPlaybackProfile,
      getAdaptiveController: options.getAdaptiveController,
      estimateTtsSpokenWordIndex: options.estimateTtsSpokenWordIndex,
      macroWords,
      macroWordOffset: cursor.macroWordOffset,
      macroStartWordIndex: playbackStartPlan.semanticPhraseStartWordIndices[cursor.macroPhraseIndex] ?? 0,
      lastPhraseSize: cursor.lastPhraseSize,
      lastBoundaryStrictness: cursor.lastBoundaryStrictness,
      sourceWordCount: playbackStartPlan.sourceWords.length,
      chunkIndex: cursor.chunkIndex,
      unsafeChunkCount: options.ttsUnsafeChunkCountRef.current,
      accuracyWindow: options.ttsChunkAccuracyWindowRef.current,
      lastAccuracySnapshot: options.ttsLastAccuracySnapshotRef.current,
    };
    const chunkSpeakerInput: SpeakBrowserTtsPlaybackLoopChunkInput = {
      playbackRuntime,
      runnerState: {
        cursor,
        macroPhrase: {
          semanticPhrase,
          semanticPhrases: playbackStartPlan.semanticPhrases,
          macroWords,
          macroStartWordIndex: playbackStartPlan.semanticPhraseStartWordIndices[cursor.macroPhraseIndex] ?? 0,
          sourceWordCount: playbackStartPlan.sourceWords.length,
          macroPhraseIndex: cursor.macroPhraseIndex,
          macroWordOffset: cursor.macroWordOffset,
        },
      },
      planInput,
      progressContext,
      adaptiveContext,
      telemetryContext,
      uiContext,
      callbacks: {
        speakNext,
        updatePlaybackCursor: (nextCursor) => {
          playbackCursor.updatePosition(nextCursor);
        },
        setCancelled,
      },
    };

    const result = speakBrowserTtsPlaybackLoopChunk(chunkSpeakerInput);
    if (!result.ok) {
      playbackCursor.advanceMacroPhrase();
      if (!cancelled) speakNext();
      return;
    }

    playbackCursor.updateDecisionState({
      lastPhraseSize: result.playbackPlan.nextLastPhraseSize,
      lastBoundaryStrictness: result.playbackPlan.nextLastBoundaryStrictness,
    });
  };

  speakNext();
}

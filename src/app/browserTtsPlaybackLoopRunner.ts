/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolveBrowserTtsPlaybackStartError } from './browserTtsPlaybackLoopGuards';
import { createBrowserTtsPlaybackLoopStartContext } from './browserTtsPlaybackLoopStartContext';
import { createBrowserTtsPlaybackLoopCursor } from './browserTtsPlaybackLoopCursor';
import { finishBrowserTtsPlaybackLoop, startBrowserTtsPlaybackLoopState } from './browserTtsPlaybackLoopLifecycle';
import { speakBrowserTtsPlaybackLoopChunk } from './browserTtsPlaybackLoopChunkSpeaker';

export function runBrowserTtsPlaybackLoop(options: any): void {
  const startError = resolveBrowserTtsPlaybackStartError({
    activeSessionFinished: options.activeSessionFinished,
    ttsText: options.ttsText,
    isBrowserTtsSupported: options.isBrowserTtsSupported,
  });
  if (startError) return options.setError(startError);

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
  if (!startContext.ok) return options.setError(startContext.error);

  const { playbackStartPlan, browserTtsEnvironment } = startContext;
  const playbackCursor = createBrowserTtsPlaybackLoopCursor({
    chunkIndex: playbackStartPlan.chunkIndex,
    macroPhraseIndex: playbackStartPlan.macroPhraseIndex,
    macroWordOffset: playbackStartPlan.macroWordOffset,
    lastPhraseSize: playbackStartPlan.lastPhraseSize,
    lastBoundaryStrictness: playbackStartPlan.lastBoundaryStrictness,
  });

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

  const semanticPhrases = playbackStartPlan.semanticPhrases;
  if (playbackStartPlan.clampedStartWordIndex === 0) {
    options.beginAdaptiveSessionFeedback('browser-tts', options.ttsLanguage, semanticPhrases.length);
  }

  const speakNext = () => {
    const cursor = playbackCursor.get();
    if (cursor.macroPhraseIndex >= semanticPhrases.length) {
      return finishBrowserTtsPlaybackLoop({
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
    const semanticPhrase = semanticPhrases[cursor.macroPhraseIndex];
    const macroWords = playbackStartPlan.semanticPhraseWords[cursor.macroPhraseIndex] ?? [];
    if (macroWords.length === 0 || cursor.macroWordOffset >= macroWords.length) {
      playbackCursor.advanceMacroPhrase();
      return speakNext();
    }
    const played = speakBrowserTtsPlaybackLoopChunk({
      chunkPlanArgs: {
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
      },
      utteranceArgs: (playbackPlan: any) => ({
        chunk: playbackPlan.chunk,
        perfDiagnostics: options.perfDiagnostics,
        perfPlayId: options.perfPlayId,
        chunkIndex: cursor.chunkIndex,
        ttsLanguage: options.ttsLanguage,
        pacingMode: playbackPlan.pacingMode,
        rate: playbackPlan.rate,
        browserTtsVoice: startContext.browserTtsVoice,
        activeSession: options.activeSession,
        browserTtsVoices: options.browserTtsVoices,
      }),
      commitArgs: (playbackPlan: any) => ({
        playbackPlan,
        macroPhraseIndex: cursor.macroPhraseIndex,
        semanticPhrase,
        semanticPhraseCount: semanticPhrases.length,
        browserTtsEnvironment,
        ttsCompletedSourceWordsRef: options.ttsCompletedSourceWordsRef,
        ttsChunkStartMsRef: options.ttsChunkStartMsRef,
        ttsChunkStartWordIndexRef: options.ttsChunkStartWordIndexRef,
        ttsChunkWordCountRef: options.ttsChunkWordCountRef,
        ttsChunkAccuracyWindowRef: options.ttsChunkAccuracyWindowRef,
        ttsLastAccuracySnapshotRef: options.ttsLastAccuracySnapshotRef,
        ttsUnsafeChunkCountRef: options.ttsUnsafeChunkCountRef,
        ttsSemanticPhraseAdvanceCountRef: options.ttsSemanticPhraseAdvanceCountRef,
        ttsSemanticPhraseReplayCountRef: options.ttsSemanticPhraseReplayCountRef,
        recordTtsChunkTelemetry: options.recordTtsChunkTelemetry,
        recordAdaptiveBenchmark: options.recordAdaptiveBenchmark,
        setAdaptiveSemanticDebug: options.setAdaptiveSemanticDebug,
        setTtsCurrentChunk: options.setTtsCurrentChunk,
        setTtsPacingMode: options.setTtsPacingMode,
        setTtsSpeechRate: options.setTtsSpeechRate,
      }),
      handlerArgs: (playbackPlan: any, utterance: SpeechSynthesisUtterance, perfUtteranceId: number) => ({
        utterance,
        start: () => ({ perfDiagnostics: options.perfDiagnostics, perfUtteranceId }),
        end: () => ({
          perfDiagnostics: options.perfDiagnostics,
          perfUtteranceId,
          cancelled: false,
          chunkIndex: cursor.chunkIndex,
          macroPhraseIndex: cursor.macroPhraseIndex,
          macroWordOffset: cursor.macroWordOffset,
          macroWordsLength: macroWords.length,
          chunk: playbackPlan.chunk,
          effectivePauseNow: playbackPlan.effectivePauseNow,
          runtimeDecision: playbackPlan.runtimeDecision,
          ttsCompletedSourceWordsRef: options.ttsCompletedSourceWordsRef,
          recordPhrasePlaybackEvent: options.recordPhrasePlaybackEvent,
          ttsLanguage: options.ttsLanguage,
          semanticPhrase,
          applyTtsPerformanceSample: options.applyTtsPerformanceSample,
          ttsLiveSignalRef: options.ttsLiveSignalRef,
          chunkTelemetry: playbackPlan.chunkTelemetry,
          ttsUnsafeChunkCountRef: options.ttsUnsafeChunkCountRef,
          recordAdaptiveBenchmark: options.recordAdaptiveBenchmark,
          rate: playbackPlan.rate,
          browserTtsEnvironment,
          semanticPhrases,
          ttsSemanticPhraseAdvanceCountRef: options.ttsSemanticPhraseAdvanceCountRef,
          ttsSemanticPhraseReplayCountRef: options.ttsSemanticPhraseReplayCountRef,
          setAdaptiveSemanticDebug: options.setAdaptiveSemanticDebug,
          speakNext,
          updatePlaybackCursor: (nextCursor: any) => playbackCursor.updatePosition(nextCursor),
        }),
        error: (event: any) => ({
          error: event.error,
          cancelled: false,
          perfDiagnostics: options.perfDiagnostics,
          perfUtteranceId,
          ttsUtteranceRef: options.ttsUtteranceRef,
          setTtsStatus: options.setTtsStatus,
          setError: options.setError,
          setCancelled: () => undefined,
        }),
      }),
      perfDiagnostics: options.perfDiagnostics,
      speakBrowserTts: options.speakBrowserTts,
      ttsUtteranceRef: options.ttsUtteranceRef,
    });
    if (!played) playbackCursor.advanceMacroPhrase();
  };

  speakNext();
}

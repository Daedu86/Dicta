import type { PhraseSize } from '../core/adaptive/types';
import type { BrowserTtsBoundaryStrictness } from './browserTtsPlaybackPlan';
import { buildBrowserTtsPlaybackLoopChunkPlan } from './browserTtsPlaybackLoopChunkPlan';
import { createBrowserTtsPlaybackLoopStartContext } from './browserTtsPlaybackLoopStartContext';
import { resolveBrowserTtsPlaybackStartError } from './browserTtsPlaybackLoopGuards';
import {
  advanceBrowserTtsMacroPhraseCursor,
  finishBrowserTtsPlaybackLoop,
  startBrowserTtsPlaybackLoopState,
} from './browserTtsPlaybackLoopLifecycle';
import { commitBrowserTtsPlaybackLoopChunk } from './browserTtsPlaybackLoopChunkCommit';
import { createBrowserTtsPlaybackUtterance } from './browserTtsPlaybackLoopUtterance';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';
import { attachBrowserTtsPlaybackLoopUtteranceHandlers } from './browserTtsPlaybackLoopUtteranceHandlers';

export type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

export function useBrowserTtsPlaybackLoop({
  activeSessionFinished,
  activeSession,
  ttsStatus,
  ttsText,
  ttsLanguage,
  ttsPacingMode,
  ttsSpeechRate,
  ttsTranscript,
  browserTtsVoices,
  ttsPlaybackProfile,
  perfDiagnostics,
  stopTtsPlaybackRef,
  ttsPausedAtWordIndexRef,
  ttsCompletedSourceWordsRef,
  ttsStartedAtMsRef,
  ttsLagOutlierCountRef,
  ttsLastValidControlLagSecRef,
  ttsUnsafeChunkCountRef,
  ttsChunkAccuracyWindowRef,
  ttsLastAccuracySnapshotRef,
  ttsLastControllerActionRef,
  ttsLiveSignalRef,
  ttsPracticeLiveTextRef,
  ttsUtteranceRef,
  ttsChunkStartMsRef,
  ttsChunkStartWordIndexRef,
  ttsChunkWordCountRef,
  ttsSemanticPhraseAdvanceCountRef,
  ttsSemanticPhraseReplayCountRef,
  buildSemanticPhrasesForCurrentSession,
  isBrowserTtsSupported,
  speakBrowserTts,
  resolveActiveBrowserTtsVoice,
  collectBrowserTtsEnvironmentForSession,
  getHistoricalPerformanceProfile,
  getBenchmarkSnapshot,
  getAdaptiveController,
  beginAdaptiveSessionFeedback,
  recordPhrasePlaybackEvent,
  recordAdaptiveBenchmark,
  estimateTtsSpokenWordIndex,
  ensureAttemptTelemetry,
  recordTtsTelemetryAction,
  recordTtsChunkTelemetry,
  applyTtsPerformanceSample,
  setAdaptiveSemanticDebug,
  setTtsCurrentChunk,
  setTtsPacingMode,
  setTtsSpeechRate,
  setTtsStatus,
  setRunning,
  setSessionStatus,
  setError,
}: BrowserTtsPlaybackLoopOptions) {
  function playTts(): void {
    const perfPlayId = perfDiagnostics.beginTtsPlay('browser-tts-play-button');
    playTtsFromWord(ttsStatus === 'paused' ? (ttsPausedAtWordIndexRef.current ?? ttsCompletedSourceWordsRef.current) : 0, perfPlayId);
  }

  function playTtsFromWord(startWordIndex: number, perfPlayId = perfDiagnostics.beginTtsPlay('browser-tts-direct')): void {
    const startError = resolveBrowserTtsPlaybackStartError({
      activeSessionFinished,
      ttsText,
      isBrowserTtsSupported,
    });
    if (startError) {
      setError(startError);
      return;
    }

    stopTtsPlaybackRef.current();
    const startContext = createBrowserTtsPlaybackLoopStartContext({
      activeSession,
      ttsText,
      ttsLanguage,
      ttsPacingMode,
      startWordIndex,
      buildSemanticPhrasesForCurrentSession,
      resolveActiveBrowserTtsVoice,
      collectBrowserTtsEnvironmentForSession,
    });
    if (!startContext.ok) {
      setError(startContext.error);
      return;
    }

    const { playbackStartPlan, browserTtsVoice, browserTtsEnvironment } = startContext;
    const {
      sourceWords,
      clampedStartWordIndex,
      semanticPhrases,
      semanticPhraseWords,
      semanticPhraseStartWordIndices,
    } = playbackStartPlan;
    let chunkIndex = playbackStartPlan.chunkIndex;
    let macroPhraseIndex = playbackStartPlan.macroPhraseIndex;
    let macroWordOffset = playbackStartPlan.macroWordOffset;
    let cancelled = false;
    let lastPhraseSize: PhraseSize = playbackStartPlan.lastPhraseSize;
    let lastBoundaryStrictness: BrowserTtsBoundaryStrictness = playbackStartPlan.lastBoundaryStrictness;
    if (clampedStartWordIndex === 0) {
      beginAdaptiveSessionFeedback('browser-tts', ttsLanguage, semanticPhrases.length);
    }
    startBrowserTtsPlaybackLoopState({
      clampedStartWordIndex,
      ttsSpeechRate,
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
      ensureAttemptTelemetry,
      recordTtsTelemetryAction,
      setError,
      setTtsStatus,
      setRunning,
      setSessionStatus,
    });

    const advanceToNextMacroPhrase = (): void => {
      const nextCursor = advanceBrowserTtsMacroPhraseCursor({ chunkIndex, macroPhraseIndex, macroWordOffset });
      chunkIndex = nextCursor.chunkIndex;
      macroPhraseIndex = nextCursor.macroPhraseIndex;
      macroWordOffset = nextCursor.macroWordOffset;
      if (!cancelled) {
        speakNext();
      }
    };

    const speakNext = () => {
      if (cancelled || macroPhraseIndex >= semanticPhrases.length) {
        finishBrowserTtsPlaybackLoop({
          ttsTranscript,
          ttsCompletedSourceWordsRef,
          ttsChunkStartMsRef,
          ttsUtteranceRef,
          applyTtsPerformanceSample,
          setTtsCurrentChunk,
          setTtsStatus,
          setRunning,
          setSessionStatus,
        });
        return;
      }

      const semanticPhrase = semanticPhrases[macroPhraseIndex];
      const macroWords = semanticPhraseWords[macroPhraseIndex] ?? [];
      const macroStartWordIndex = semanticPhraseStartWordIndices[macroPhraseIndex] ?? 0;

      // If the current macro phrase is empty or already fully spoken, advance to the next macro phrase.
      if (macroWords.length === 0 || macroWordOffset >= macroWords.length) {
        advanceToNextMacroPhrase();
        return;
      }

      if (macroWordOffset === 0) {
        recordPhrasePlaybackEvent('phrase_started', 'browser-tts', ttsLanguage, semanticPhrase, macroPhraseIndex);
      }

      const playbackPlan = buildBrowserTtsPlaybackLoopChunkPlan({
        ttsLanguage,
        ttsTranscript,
        ttsLiveSignalRef,
        ttsPracticeLiveTextRef,
        getHistoricalPerformanceProfile,
        getBenchmarkSnapshot,
        ttsSpeechRate,
        ttsPlaybackProfile,
        getAdaptiveController,
        estimateTtsSpokenWordIndex,
        macroWords,
        macroWordOffset,
        macroStartWordIndex,
        lastPhraseSize,
        lastBoundaryStrictness,
        sourceWordCount: sourceWords.length,
        chunkIndex,
        unsafeChunkCount: ttsUnsafeChunkCountRef.current,
        accuracyWindow: ttsChunkAccuracyWindowRef.current,
        lastAccuracySnapshot: ttsLastAccuracySnapshotRef.current,
      });

      if (!playbackPlan) {
        advanceToNextMacroPhrase();
        return;
      }

      const { chunk, runtimeDecision, pacingMode, rate, effectivePauseNow, chunkTelemetry } = playbackPlan;
      // Persist the final executable decision so the next chunk reflects runtime constraints.
      lastPhraseSize = playbackPlan.nextLastPhraseSize;
      lastBoundaryStrictness = playbackPlan.nextLastBoundaryStrictness;
      const { utterance, perfUtteranceId } = createBrowserTtsPlaybackUtterance({
        chunk,
        perfDiagnostics,
        perfPlayId,
        chunkIndex,
        ttsLanguage,
        pacingMode,
        rate,
        browserTtsVoice,
        activeSession,
        browserTtsVoices,
      });
      ttsUtteranceRef.current = utterance;
      commitBrowserTtsPlaybackLoopChunk({
        playbackPlan,
        macroPhraseIndex,
        semanticPhrase,
        semanticPhraseCount: semanticPhrases.length,
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
      });

      attachBrowserTtsPlaybackLoopUtteranceHandlers({
        utterance,
        start: () => ({
          perfDiagnostics,
          perfUtteranceId,
        }),
        end: () => ({
          perfDiagnostics,
          perfUtteranceId,
          cancelled,
          chunkIndex,
          macroPhraseIndex,
          macroWordOffset,
          macroWordsLength: macroWords.length,
          chunk,
          effectivePauseNow,
          runtimeDecision,
          ttsCompletedSourceWordsRef,
          recordPhrasePlaybackEvent,
          ttsLanguage,
          semanticPhrase,
          applyTtsPerformanceSample,
          ttsLiveSignalRef,
          chunkTelemetry,
          ttsUnsafeChunkCountRef,
          recordAdaptiveBenchmark,
          rate,
          browserTtsEnvironment,
          semanticPhrases,
          ttsSemanticPhraseAdvanceCountRef,
          ttsSemanticPhraseReplayCountRef,
          setAdaptiveSemanticDebug,
          speakNext,
          updatePlaybackCursor: (nextCursor) => {
            chunkIndex = nextCursor.chunkIndex;
            macroPhraseIndex = nextCursor.macroPhraseIndex;
            macroWordOffset = nextCursor.macroWordOffset;
          },
        }),
        error: (event) => ({
          error: event.error,
          cancelled,
          perfDiagnostics,
          perfUtteranceId,
          ttsUtteranceRef,
          setTtsStatus,
          setError,
          setCancelled: (nextCancelled) => {
            cancelled = nextCancelled;
          },
        }),
      });

      perfDiagnostics.recordTtsSpeak(perfUtteranceId);
      speakBrowserTts(utterance);
    };

    speakNext();
  }

  return {
    playTts,
    playTtsFromWord,
  };
}

import type { PhraseSize } from '../core/adaptive/types';
import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { evaluateTranscriptAttempt } from '../core/evaluation';
import { summarizeBrowserTtsDeRecoveryState } from '../inputs/browserTts/browserTtsRecoveryPolicy';
import { resolveBrowserTtsAdaptiveProfile } from '../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  buildBrowserTtsPlaybackPlan,
  type BrowserTtsBoundaryStrictness,
} from './browserTtsPlaybackPlan';
import { buildBrowserTtsPhraseStartDebugUpdate } from './browserTtsAdaptiveSemanticDebug';
import { buildBrowserTtsPlaybackStartPlan } from './browserTtsPlaybackStartPlan';
import { configureBrowserTtsUtterance } from './browserTtsUtteranceConfiguration';
import { buildBrowserTtsUtterancePerfMetadata } from './browserTtsUtterancePerfMetadata';
import { handleBrowserTtsPlaybackLoopChunkEnd } from './browserTtsPlaybackLoopCompletionHandler';
import { handleBrowserTtsPlaybackLoopChunkStart } from './browserTtsPlaybackLoopStartHandler';
import { handleBrowserTtsPlaybackLoopError } from './browserTtsPlaybackLoopErrorHandler';
import { resolveBrowserTtsPlaybackStartError } from './browserTtsPlaybackLoopGuards';
import { collectBrowserTtsNavigatorInfo } from './browserTtsPlaybackLoopNavigator';
import { resetBrowserTtsPlaybackLoopRefs } from './browserTtsPlaybackLoopRefs';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

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
    const playbackStartPlan = buildBrowserTtsPlaybackStartPlan({
      ttsText,
      ttsLanguage,
      ttsPacingMode,
      startWordIndex,
      buildSemanticPhrasesForCurrentSession,
    });
    if (!playbackStartPlan.ok) {
      setError('Paste TTS text before playing.');
      return;
    }

    const browserTtsVoice = resolveActiveBrowserTtsVoice();
    const browserTtsEnvironment = collectBrowserTtsEnvironmentForSession(
      activeSession,
      browserTtsVoice,
      browserTtsVoice?.voiceURI ?? activeSession?.ttsVoiceURI ?? null,
    );
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
    resetBrowserTtsPlaybackLoopRefs({
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
    });
    ensureAttemptTelemetry();
    recordTtsTelemetryAction('play', ttsSpeechRate);
    setError('');
    setTtsStatus('playing');
    setRunning(true);
    setSessionStatus('running');

    const speakNext = () => {
      if (cancelled || macroPhraseIndex >= semanticPhrases.length) {
        setTtsCurrentChunk('');
        setTtsStatus('finished');
        setRunning(false);
        setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
        ttsCompletedSourceWordsRef.current = ttsTranscript?.words.length ?? ttsCompletedSourceWordsRef.current;
        ttsChunkStartMsRef.current = null;
        applyTtsPerformanceSample();
        ttsUtteranceRef.current = null;
        return;
      }

      const historyProfile = getHistoricalPerformanceProfile('browser-tts', ttsLanguage);
      const liveSignal = ttsLiveSignalRef.current;
      const livePracticeEvaluation = evaluateTranscriptAttempt(ttsPracticeLiveTextRef.current, ttsTranscript);
      const browserTtsProfile = resolveBrowserTtsAdaptiveProfile(ttsLanguage);
      const browserTtsBenchmark = getBenchmarkSnapshot('browser-tts', normalizeBenchmarkLanguage(ttsLanguage));
      const navigatorInfo = collectBrowserTtsNavigatorInfo();
      const browserTtsRecovery = summarizeBrowserTtsDeRecoveryState({
        timeline: browserTtsBenchmark.timeline,
        ...navigatorInfo,
      });
      const semanticPhrase = semanticPhrases[macroPhraseIndex];
      const macroWords = semanticPhraseWords[macroPhraseIndex] ?? [];
      const macroStartWordIndex = semanticPhraseStartWordIndices[macroPhraseIndex] ?? 0;

      // If the current macro phrase is empty or already fully spoken, advance to the next macro phrase.
      if (macroWords.length === 0 || macroWordOffset >= macroWords.length) {
        macroPhraseIndex += 1;
        macroWordOffset = 0;
        if (!cancelled) {
          speakNext();
        }
        return;
      }

      if (macroWordOffset === 0) {
        recordPhrasePlaybackEvent('phrase_started', 'browser-tts', ttsLanguage, semanticPhrase, macroPhraseIndex);
      }

      const playbackPlan = buildBrowserTtsPlaybackPlan({
        macroWords,
        macroWordOffset,
        macroStartWordIndex,
        language: ttsLanguage,
        lastPhraseSize,
        lastBoundaryStrictness,
        liveSignal,
        livePracticeEvaluation,
        browserTtsProfile,
        browserTtsBenchmark,
        browserTtsRecovery,
        ttsSpeechRate,
        ttsPlaybackPauseMs: ttsPlaybackProfile.pauseMs,
        adaptiveController: getAdaptiveController('browser-tts', ttsLanguage),
        historyProfile,
        sourceWordCount: sourceWords.length,
        estimatedSpokenWordIndex: estimateTtsSpokenWordIndex(),
        chunkIndex,
        unsafeChunkCount: ttsUnsafeChunkCountRef.current,
        accuracyWindow: ttsChunkAccuracyWindowRef.current,
        lastAccuracySnapshot: ttsLastAccuracySnapshotRef.current,
        navigatorInfo,
      });

      if (!playbackPlan) {
        macroPhraseIndex += 1;
        macroWordOffset = 0;
        if (!cancelled) {
          speakNext();
        }
        return;
      }

      const {
        chunk,
        runtimeDecision,
        pacingMode,
        pauseAtBoundary,
        semanticCompleteness,
        rate,
        effectivePauseNow,
        effectiveReplay,
        chunkTelemetry,
      } = playbackPlan;
      // Persist the final executable decision so the next chunk reflects runtime constraints.
      lastPhraseSize = playbackPlan.nextLastPhraseSize;
      lastBoundaryStrictness = playbackPlan.nextLastBoundaryStrictness;
      if (playbackPlan.unsafeBoundaryApplied) {
        ttsUnsafeChunkCountRef.current += 1;
      }
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      const perfUtteranceId = perfDiagnostics.beginTtsUtterance(
        buildBrowserTtsUtterancePerfMetadata({
          playId: perfPlayId,
          chunkIndex,
          phraseLengthWords: chunk.wordCount,
          phraseLengthChars: chunk.text.length,
          language: ttsLanguage,
          pacingMode,
          voice: browserTtsVoice,
          sessionVoiceURI: activeSession?.ttsVoiceURI ?? null,
          availableVoices: browserTtsVoices,
        }),
      );
      configureBrowserTtsUtterance({
        utterance,
        rate,
        language: ttsLanguage,
        voice: browserTtsVoice,
      });
      ttsUtteranceRef.current = utterance;
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
      recordAdaptiveBenchmark(chunkTelemetry, runtimeDecision, {
        actualPlaybackRate: rate,
        actualPauseMs: effectivePauseNow ? runtimeDecision.pauseAfterPhraseMs : 0,
        replayExecuted: effectiveReplay,
        actualBoundaryType: chunk.phraseBoundaryType,
        ttsEnvironment: browserTtsEnvironment,
        event: effectiveReplay ? 'replay' : effectivePauseNow ? 'pause' : runtimeDecision.deferPauseUntilSafeBoundary ? 'defer_pause' : 'phrase_advance',
        phraseIndex: macroPhraseIndex,
        totalSemanticPhrases: semanticPhrases.length,
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
          totalSemanticPhrases: semanticPhrases.length,
          phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
          phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
        }),
      );

      utterance.onstart = () => {
        handleBrowserTtsPlaybackLoopChunkStart({
          perfDiagnostics,
          perfUtteranceId,
        });
      };

      utterance.onend = () => {
        handleBrowserTtsPlaybackLoopChunkEnd({
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
        });
      };

      utterance.onerror = (event) => {
        handleBrowserTtsPlaybackLoopError({
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
        });
      };

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

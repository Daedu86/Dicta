import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type {
  BrowserTtsEnvironmentFingerprint,
  ControlAction,
  Transcript,
  TtsPacingMode,
} from '../types/dictation';
import { evaluateTranscriptAttempt } from '../core/evaluation';
import type { PhraseSize } from '../core/adaptive/types';
import {
  normalizeBenchmarkLanguage,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { summarizeBrowserTtsDeRecoveryState } from '../inputs/browserTts/browserTtsRecoveryPolicy';
import { resolveBrowserTtsAdaptiveProfile } from '../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  buildBrowserTtsPlaybackPlan,
  type BrowserTtsBoundaryStrictness,
} from './browserTtsPlaybackPlan';
import { completeBrowserTtsChunk } from './browserTtsChunkCompletion';
import {
  buildBrowserTtsChunkCompletionDebugUpdate,
  buildBrowserTtsPhraseStartDebugUpdate,
} from './browserTtsAdaptiveSemanticDebug';
import { buildBrowserTtsPhraseCompletionTelemetry } from './browserTtsPhraseCompletionTelemetry';
import { buildBrowserTtsPlaybackStartPlan } from './browserTtsPlaybackStartPlan';
import { configureBrowserTtsUtterance } from './browserTtsUtteranceConfiguration';
import { buildBrowserTtsUtterancePerfMetadata } from './browserTtsUtterancePerfMetadata';
import { scheduleBrowserTtsNextChunk } from './browserTtsNextChunkScheduler';
import { buildBrowserTtsUnexpectedErrorPlan } from './browserTtsUnexpectedErrorPlan';
import type { PerfDiagnostics } from '../core/perfDiagnostics';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import type { AdaptiveRuntime } from './useAdaptiveRuntime';
import type {
  AdaptiveSemanticDebug,
  SessionStatus,
  StoredSession,
  TtsLanguage,
  TtsPerformanceSampleResult,
  TtsStatus,
} from './sessionTypes';
import type {
  TtsLiveSignal,
  TtsPlaybackProfile,
} from './ttsPlaybackProfile';
import type {
  TtsPerformanceSampleOptions,
} from './useTtsPerformanceSampler';
import type {
  TtsTelemetryRecorder,
} from './useTtsTelemetryRecorder';

type BrowserTtsEnvironmentResolver = (
  session: StoredSession | null | undefined,
  selectedVoice?: SpeechSynthesisVoice | null,
  selectedVoiceURI?: string | null | undefined,
) => BrowserTtsEnvironmentFingerprint | null;

export type BrowserTtsPlaybackLoopOptions = {
  activeSessionFinished: boolean;
  activeSession: StoredSession | null;
  ttsStatus: TtsStatus;
  ttsText: string;
  ttsLanguage: TtsLanguage;
  ttsPacingMode: TtsPacingMode;
  ttsSpeechRate: number;
  ttsTranscript: Transcript | null;
  browserTtsVoices: SpeechSynthesisVoice[];
  ttsPlaybackProfile: TtsPlaybackProfile;
  perfDiagnostics: PerfDiagnostics;
  stopTtsPlaybackRef: MutableRefObject<() => void>;
  ttsPausedAtWordIndexRef: MutableRefObject<number | null>;
  ttsCompletedSourceWordsRef: MutableRefObject<number>;
  ttsStartedAtMsRef: MutableRefObject<number | null>;
  ttsLagOutlierCountRef: MutableRefObject<number>;
  ttsLastValidControlLagSecRef: MutableRefObject<number>;
  ttsUnsafeChunkCountRef: MutableRefObject<number>;
  ttsChunkAccuracyWindowRef: MutableRefObject<number[]>;
  ttsLastAccuracySnapshotRef: MutableRefObject<{ typedWords: number; matchedWords: number }>;
  ttsLastControllerActionRef: MutableRefObject<ControlAction>;
  ttsLiveSignalRef: MutableRefObject<TtsLiveSignal>;
  ttsPracticeLiveTextRef: MutableRefObject<string>;
  ttsUtteranceRef: MutableRefObject<SpeechSynthesisUtterance | null>;
  ttsChunkStartMsRef: MutableRefObject<number | null>;
  ttsChunkStartWordIndexRef: MutableRefObject<number>;
  ttsChunkWordCountRef: MutableRefObject<number>;
  ttsSemanticPhraseAdvanceCountRef: MutableRefObject<number>;
  ttsSemanticPhraseReplayCountRef: MutableRefObject<number>;
  buildSemanticPhrasesForCurrentSession: (text: string, language: string | undefined, mode: TtsPacingMode) => SemanticPhrase[];
  isBrowserTtsSupported: () => boolean;
  speakBrowserTts: (utterance: SpeechSynthesisUtterance) => boolean;
  resolveActiveBrowserTtsVoice: () => SpeechSynthesisVoice | null;
  collectBrowserTtsEnvironmentForSession: BrowserTtsEnvironmentResolver;
  getHistoricalPerformanceProfile: AdaptiveRuntime['getHistoricalPerformanceProfile'];
  getBenchmarkSnapshot: AdaptiveRuntime['getBenchmarkSnapshot'];
  getAdaptiveController: AdaptiveRuntime['getAdaptiveController'];
  beginAdaptiveSessionFeedback: AdaptiveRuntime['beginAdaptiveSessionFeedback'];
  recordPhrasePlaybackEvent: AdaptiveRuntime['recordPhrasePlaybackEvent'];
  recordAdaptiveBenchmark: AdaptiveRuntime['recordAdaptiveBenchmark'];
  estimateTtsSpokenWordIndex: (now?: number) => number;
  ensureAttemptTelemetry: TtsTelemetryRecorder['ensureAttemptTelemetry'];
  recordTtsTelemetryAction: TtsTelemetryRecorder['recordTtsTelemetryAction'];
  recordTtsChunkTelemetry: TtsTelemetryRecorder['recordTtsChunkTelemetry'];
  applyTtsPerformanceSample: (options?: TtsPerformanceSampleOptions) => TtsPerformanceSampleResult;
  setAdaptiveSemanticDebug: Dispatch<SetStateAction<AdaptiveSemanticDebug>>;
  setTtsCurrentChunk: Dispatch<SetStateAction<string>>;
  setTtsPacingMode: Dispatch<SetStateAction<TtsPacingMode>>;
  setTtsSpeechRate: Dispatch<SetStateAction<number>>;
  setTtsStatus: Dispatch<SetStateAction<TtsStatus>>;
  setRunning: Dispatch<SetStateAction<boolean>>;
  setSessionStatus: Dispatch<SetStateAction<SessionStatus>>;
  setError: Dispatch<SetStateAction<string>>;
};

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
    if (activeSessionFinished) {
      setError('Reset the finished session before playing TTS again.');
      return;
    }

    if (!ttsText.trim()) {
      setError('Paste TTS text before playing.');
      return;
    }
    if (!isBrowserTtsSupported()) {
      setError('This browser does not support speech synthesis.');
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
      const browserTtsRecovery = summarizeBrowserTtsDeRecoveryState({
        timeline: browserTtsBenchmark.timeline,
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform,
        maxTouchPoints: window.navigator.maxTouchPoints,
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
        navigatorInfo: {
          userAgent: window.navigator.userAgent,
          platform: window.navigator.platform,
          maxTouchPoints: window.navigator.maxTouchPoints,
        },
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
        perfDiagnostics.recordTtsStart(perfUtteranceId);
      };

      utterance.onend = () => {
        perfDiagnostics.recordTtsEnd(perfUtteranceId);
        if (cancelled) return;
        const chunkCompletion = completeBrowserTtsChunk({
          macroPhraseIndex,
          macroWordOffset,
          macroWordsLength: macroWords.length,
          chunkStartWordIndex: chunk.startWordIndex,
          chunkWordCount: chunk.wordCount,
          effectivePauseNow,
          pauseAfterPhraseMs: runtimeDecision.pauseAfterPhraseMs,
        });
        const { completesMacroPhrase } = chunkCompletion;
        ttsCompletedSourceWordsRef.current = chunkCompletion.completedSourceWords;
        if (completesMacroPhrase) {
          recordPhrasePlaybackEvent('phrase_completed', 'browser-tts', ttsLanguage, semanticPhrase, macroPhraseIndex);
          if (normalizeBenchmarkLanguage(ttsLanguage) === 'de') {
            applyTtsPerformanceSample();
            const completionLiveSignal = ttsLiveSignalRef.current;
            const completionTelemetry = buildBrowserTtsPhraseCompletionTelemetry({
              chunkTelemetry,
              semanticPhraseId: semanticPhrase?.id,
              macroPhraseIndex,
              liveSignal: completionLiveSignal,
              unsafeChunkCount: ttsUnsafeChunkCountRef.current,
            });
            recordAdaptiveBenchmark(completionTelemetry, runtimeDecision, {
              actualPlaybackRate: rate,
              actualPauseMs: 0,
              replayExecuted: false,
              actualBoundaryType: chunk.phraseBoundaryType,
              ttsEnvironment: browserTtsEnvironment,
              event: 'phrase_completed',
              phraseIndex: macroPhraseIndex,
              totalSemanticPhrases: semanticPhrases.length,
            });
          }
        }
        chunkIndex += 1;
        macroPhraseIndex = chunkCompletion.nextMacroPhraseIndex;
        macroWordOffset = chunkCompletion.nextMacroWordOffset;
        if (chunkCompletion.phraseAdvanced) {
          ttsSemanticPhraseAdvanceCountRef.current += 1;
          recordPhrasePlaybackEvent('phrase_advanced', 'browser-tts', ttsLanguage, semanticPhrase, macroPhraseIndex);
        }
        setAdaptiveSemanticDebug((current) =>
          buildBrowserTtsChunkCompletionDebugUpdate({
            current,
            macroPhraseIndex,
            semanticPhrases,
            phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
            phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
          }),
        );
        scheduleBrowserTtsNextChunk({
          shouldPauseBeforeNextChunk: chunkCompletion.shouldPauseBeforeNextChunk,
          pauseBeforeNextChunkMs: chunkCompletion.pauseBeforeNextChunkMs,
          scheduleTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
          speakNext,
        });
      };

      utterance.onerror = (event) => {
        const errorPlan = buildBrowserTtsUnexpectedErrorPlan({
          error: event.error,
          cancelled,
        });

        perfDiagnostics.recordTtsError(perfUtteranceId, errorPlan.recordedError);
        if (!errorPlan.shouldApplyState) return;

        cancelled = errorPlan.nextCancelled;
        ttsUtteranceRef.current = null;
        setTtsStatus('paused');
        setError(errorPlan.userErrorMessage);
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

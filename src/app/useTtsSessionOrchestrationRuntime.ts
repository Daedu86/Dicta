import { useKeyboardRemapRuntime } from './useKeyboardRemapRuntime';
import { useTtsPracticeInputRuntime } from './useTtsPracticeInputRuntime';
import { useTtsPlaybackMetricsRuntime } from './useTtsPlaybackMetricsRuntime';
import { useBrowserTtsPlaybackLoop } from './useBrowserTtsPlaybackLoop';
import { useTtsPlaybackControls } from './useTtsPlaybackControls';
import { useResetSessionRuntime } from './useResetSessionRuntime';
import { useTtsSessionSubmitAction } from './useTtsSessionSubmitAction';
import { buildSemanticPhrasesFromDictationScript } from './dictationScriptSemanticPhrases';
import { buildOrderedSemanticPhrases } from './ttsPacingHelpers';
import type { TtsPacingMode } from '../types/dictation';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

type KeyboardArgs = Parameters<typeof useKeyboardRemapRuntime>[0];
type PracticeInputArgs = Parameters<typeof useTtsPracticeInputRuntime>[0];
type PlaybackMetricsArgs = Parameters<typeof useTtsPlaybackMetricsRuntime>[0];
type BrowserPlaybackArgs = Parameters<typeof useBrowserTtsPlaybackLoop>[0];
type PlaybackControlsArgs = Parameters<typeof useTtsPlaybackControls>[0];
type ResetSessionArgs = Parameters<typeof useResetSessionRuntime>[0];
type SubmitSessionArgs = Parameters<typeof useTtsSessionSubmitAction>[0];

type UseTtsSessionOrchestrationRuntimeArgs =
  KeyboardArgs &
  Omit<PracticeInputArgs, 'handleEsKeyboardRemapKeyDown'> &
  Omit<PlaybackMetricsArgs, 'baseWordsPerSecond'> &
  Omit<
    BrowserPlaybackArgs,
    | 'buildSemanticPhrasesForCurrentSession'
    | 'estimateTtsSpokenWordIndex'
    | 'ensureAttemptTelemetry'
    | 'recordTtsTelemetryAction'
    | 'recordTtsChunkTelemetry'
    | 'applyTtsPerformanceSample'
  > &
  Omit<
    PlaybackControlsArgs,
    | 'estimateTtsSpokenWordIndex'
    | 'playTtsFromWord'
    | 'recordTtsTelemetryAction'
    | 'ttsTranscriptWordCount'
  > &
  Omit<ResetSessionArgs, 'stopTtsPlayback'> &
  Omit<SubmitSessionArgs, 'applyTtsPerformanceSample' | 'stopTtsPlayback'>;

export function useTtsSessionOrchestrationRuntime(args: UseTtsSessionOrchestrationRuntimeArgs) {
  function buildSemanticPhrasesForCurrentSession(
    text: string,
    language: string | undefined,
    mode: TtsPacingMode,
  ): SemanticPhrase[] {
    if (args.activeSession?.sessionSource === 'dictationScript' && args.activeSession.dictationScript) {
      return buildSemanticPhrasesFromDictationScript(args.activeSession.dictationScript);
    }
    return buildOrderedSemanticPhrases(text, language, mode);
  }

  const {
    getActiveTypingLanguage,
    handleEsKeyboardRemapKeyDown,
  } = useKeyboardRemapRuntime({
    activeInputMode: args.activeInputMode,
    inputSettingsLocked: args.inputSettingsLocked,
    ttsLanguage: args.ttsLanguage,
  });

  const {
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
  } = useTtsPracticeInputRuntime({
    activeSessionFinished: args.activeSessionFinished,
    telemetryRef: args.telemetryRef,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
    setTtsPracticeText: args.setTtsPracticeText,
    handleEsKeyboardRemapKeyDown,
  });

  const {
    ensureAttemptTelemetry,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
    estimateTtsSpokenWordIndex,
    applyTtsPerformanceSample,
  } = useTtsPlaybackMetricsRuntime({
    ttsTranscript: args.ttsTranscript,
    ttsStatus: args.ttsStatus,
    ttsSpeechRate: args.ttsSpeechRate,
    ttsLanguage: args.ttsLanguage,
    controllerState: args.controllerState,
    rate: args.rate,
    lagSec: args.lagSec,
    lagWords: args.lagWords,
    wpm: args.wpm,
    accuracy: args.accuracy,
    trend: args.trend,
    telemetryRef: args.telemetryRef,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
    ttsChunkStartMsRef: args.ttsChunkStartMsRef,
    ttsChunkWordCountRef: args.ttsChunkWordCountRef,
    ttsChunkStartWordIndexRef: args.ttsChunkStartWordIndexRef,
    ttsCompletedSourceWordsRef: args.ttsCompletedSourceWordsRef,
    ttsLastValidControlLagSecRef: args.ttsLastValidControlLagSecRef,
    ttsLagOutlierCountRef: args.ttsLagOutlierCountRef,
    ttsLiveSignalRef: args.ttsLiveSignalRef,
    previousLagRef: args.previousLagRef,
    previousAccuracyRef: args.previousAccuracyRef,
    ttsLastControllerActionRef: args.ttsLastControllerActionRef,
    ttsPublishedUiRef: args.ttsPublishedUiRef,
    ttsUiLastPublishedAtRef: args.ttsUiLastPublishedAtRef,
    applyTtsPerformanceSampleRef: args.applyTtsPerformanceSampleRef,
    setControllerState: args.setControllerState,
    setRate: args.setRate,
    setLagSec: args.setLagSec,
    setLagWords: args.setLagWords,
    setWpm: args.setWpm,
    setAccuracy: args.setAccuracy,
    setTrend: args.setTrend,
    baseWordsPerSecond: TTS_BASE_WORDS_PER_SECOND,
  });

  const {
    playTts,
    playTtsFromWord,
  } = useBrowserTtsPlaybackLoop({
    activeSessionFinished: args.activeSessionFinished,
    activeSession: args.activeSession,
    ttsStatus: args.ttsStatus,
    ttsText: args.ttsText,
    ttsLanguage: args.ttsLanguage,
    ttsPacingMode: args.ttsPacingMode,
    ttsSpeechRate: args.ttsSpeechRate,
    ttsTranscript: args.ttsTranscript,
    browserTtsVoices: args.browserTtsVoices,
    ttsPlaybackProfile: args.ttsPlaybackProfile,
    perfDiagnostics: args.perfDiagnostics,
    stopTtsPlaybackRef: args.stopTtsPlaybackRef,
    ttsPausedAtWordIndexRef: args.ttsPausedAtWordIndexRef,
    ttsCompletedSourceWordsRef: args.ttsCompletedSourceWordsRef,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsLagOutlierCountRef: args.ttsLagOutlierCountRef,
    ttsLastValidControlLagSecRef: args.ttsLastValidControlLagSecRef,
    ttsUnsafeChunkCountRef: args.ttsUnsafeChunkCountRef,
    ttsChunkAccuracyWindowRef: args.ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef: args.ttsLastAccuracySnapshotRef,
    ttsLastControllerActionRef: args.ttsLastControllerActionRef,
    ttsLiveSignalRef: args.ttsLiveSignalRef,
    ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
    ttsUtteranceRef: args.ttsUtteranceRef,
    ttsChunkStartMsRef: args.ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef: args.ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef: args.ttsChunkWordCountRef,
    ttsSemanticPhraseAdvanceCountRef: args.ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef: args.ttsSemanticPhraseReplayCountRef,
    buildSemanticPhrasesForCurrentSession,
    isBrowserTtsSupported: args.isBrowserTtsSupported,
    speakBrowserTts: args.speakBrowserTts,
    resolveActiveBrowserTtsVoice: args.resolveActiveBrowserTtsVoice,
    collectBrowserTtsEnvironmentForSession: args.collectBrowserTtsEnvironmentForSession,
    getHistoricalPerformanceProfile: args.getHistoricalPerformanceProfile,
    getBenchmarkSnapshot: args.getBenchmarkSnapshot,
    getAdaptiveController: args.getAdaptiveController,
    beginAdaptiveSessionFeedback: args.beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent: args.recordPhrasePlaybackEvent,
    recordAdaptiveBenchmark: args.recordAdaptiveBenchmark,
    estimateTtsSpokenWordIndex,
    ensureAttemptTelemetry,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
    applyTtsPerformanceSample,
    setAdaptiveSemanticDebug: args.setAdaptiveSemanticDebug,
    setTtsCurrentChunk: args.setTtsCurrentChunk,
    setTtsPacingMode: args.setTtsPacingMode,
    setTtsSpeechRate: args.setTtsSpeechRate,
    setTtsStatus: args.setTtsStatus,
    setRunning: args.setRunning,
    setSessionStatus: args.setSessionStatus,
    setError: args.setError,
  });

  const {
    pauseTts,
    resumeTts,
    stopTtsPlayback,
    seekTtsPlayback,
  } = useTtsPlaybackControls({
    activeInputMode: args.activeInputMode,
    activeSessionFinished: args.activeSessionFinished,
    ttsHasText: args.ttsHasText,
    ttsStatus: args.ttsStatus,
    ttsText: args.ttsText,
    ttsPracticeText: args.ttsPracticeText,
    ttsTranscriptWordCount: args.ttsTranscript?.words.length ?? 0,
    isBrowserTtsSupported: args.isBrowserTtsSupported,
    cancelBrowserTts: args.cancelBrowserTts,
    resumeBrowserTts: args.resumeBrowserTts,
    estimateTtsSpokenWordIndex,
    playTtsFromWord,
    recordTtsTelemetryAction,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsUtteranceRef: args.ttsUtteranceRef,
    ttsChunkStartMsRef: args.ttsChunkStartMsRef,
    ttsCompletedSourceWordsRef: args.ttsCompletedSourceWordsRef,
    ttsPausedAtWordIndexRef: args.ttsPausedAtWordIndexRef,
    setTtsCurrentChunk: args.setTtsCurrentChunk,
    setTtsPacingMode: args.setTtsPacingMode,
    setTtsSpeechRate: args.setTtsSpeechRate,
    setRunning: args.setRunning,
    setSessionStatus: args.setSessionStatus,
    setTtsStatus: args.setTtsStatus,
    setTtsPlayerProgressTick: args.setTtsPlayerProgressTick,
  });

  const resetSession = useResetSessionRuntime({
    activeSession: args.activeSession,
    activeInputMode: args.activeInputMode,
    inputSettingsLocked: args.inputSettingsLocked,
    ttsText: args.ttsText,
    stopTtsPlayback,
    resetAdaptiveSessionFeedbackTracking: args.resetAdaptiveSessionFeedbackTracking,
    allowFinishedSessionResetRef: args.allowFinishedSessionResetRef,
    ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsChunkStartMsRef: args.ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef: args.ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef: args.ttsChunkWordCountRef,
    ttsCompletedSourceWordsRef: args.ttsCompletedSourceWordsRef,
    ttsLastControllerActionRef: args.ttsLastControllerActionRef,
    ttsUiLastPublishedAtRef: args.ttsUiLastPublishedAtRef,
    ttsPublishedUiRef: args.ttsPublishedUiRef,
    telemetryRef: args.telemetryRef,
    setTtsPracticeText: args.setTtsPracticeText,
    setTtsStatus: args.setTtsStatus,
    setTtsCurrentChunk: args.setTtsCurrentChunk,
    setTtsPacingMode: args.setTtsPacingMode,
    setTtsSpeechRate: args.setTtsSpeechRate,
    setRunning: args.setRunning,
    setRate: args.setRate,
    setLagSec: args.setLagSec,
    setLagWords: args.setLagWords,
    setWpm: args.setWpm,
    setAccuracy: args.setAccuracy,
    setControllerState: args.setControllerState,
    setSessionStatus: args.setSessionStatus,
    setTrainingSubmitMessage: args.setTrainingSubmitMessage,
    setInputSettingsLocked: args.setInputSettingsLocked,
  });

  const submitTtsSession = useTtsSessionSubmitAction({
    activeInputMode: args.activeInputMode,
    ttsHasText: args.ttsHasText,
    ttsPracticeText: args.ttsPracticeText,
    ttsLanguage: args.ttsLanguage,
    sessions: args.sessions,
    activeSessionId: args.activeSessionId,
    activeSession: args.activeSession,
    applyTtsPerformanceSample,
    resolveBrowserTtsVoiceForSession: args.resolveBrowserTtsVoiceForSession,
    collectBrowserTtsEnvironmentForSession: args.collectBrowserTtsEnvironmentForSession,
    persistAndPushSessionsNow: args.persistAndPushSessionsNow,
    stopTtsPlayback,
    completeAdaptiveSessionFeedback: args.completeAdaptiveSessionFeedback,
    setTtsPracticeText: args.setTtsPracticeText,
    setSessions: args.setSessions,
    setRunning: args.setRunning,
    setSessionStatus: args.setSessionStatus,
    setTtsStatus: args.setTtsStatus,
    setError: args.setError,
    setTrainingSubmitMessage: args.setTrainingSubmitMessage,
  });

  args.stopTtsPlaybackRef.current = stopTtsPlayback;

  return {
    getActiveTypingLanguage,
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
    estimateTtsSpokenWordIndex,
    applyTtsPerformanceSample,
    playTts,
    pauseTts,
    resumeTts,
    stopTtsPlayback,
    seekTtsPlayback,
    resetSession,
    submitTtsSession,
  };
}

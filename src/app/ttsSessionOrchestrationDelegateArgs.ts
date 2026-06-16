import { useBrowserTtsPlaybackLoop } from './useBrowserTtsPlaybackLoop';
import { useKeyboardRemapRuntime } from './useKeyboardRemapRuntime';
import { useResetSessionRuntime } from './useResetSessionRuntime';
import { useTtsPlaybackControls } from './useTtsPlaybackControls';
import { useTtsPlaybackMetricsRuntime } from './useTtsPlaybackMetricsRuntime';
import { useTtsPracticeInputRuntime } from './useTtsPracticeInputRuntime';
import { useTtsSessionSubmitAction } from './useTtsSessionSubmitAction';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

type KeyboardArgs = Parameters<typeof useKeyboardRemapRuntime>[0];
type PracticeInputArgs = Parameters<typeof useTtsPracticeInputRuntime>[0];
type PlaybackMetricsArgs = Parameters<typeof useTtsPlaybackMetricsRuntime>[0];
type BrowserPlaybackArgs = Parameters<typeof useBrowserTtsPlaybackLoop>[0];
type PlaybackControlsArgs = Parameters<typeof useTtsPlaybackControls>[0];
type ResetSessionArgs = Parameters<typeof useResetSessionRuntime>[0];
type SubmitSessionArgs = Parameters<typeof useTtsSessionSubmitAction>[0];

type PracticeInputDelegateArgs = Omit<PracticeInputArgs, 'handleEsKeyboardRemapKeyDown'>;
type BrowserPlaybackDelegateArgs = Omit<
  BrowserPlaybackArgs,
  | 'estimateTtsSpokenWordIndex'
  | 'ensureAttemptTelemetry'
  | 'recordTtsTelemetryAction'
  | 'recordTtsChunkTelemetry'
  | 'applyTtsPerformanceSample'
>;
type PlaybackControlsDelegateArgs = Omit<
  PlaybackControlsArgs,
  | 'estimateTtsSpokenWordIndex'
  | 'playTtsFromWord'
  | 'recordTtsTelemetryAction'
>;
type ResetSessionDelegateArgs = Omit<ResetSessionArgs, 'stopTtsPlayback'>;
type SubmitSessionDelegateArgs = Omit<SubmitSessionArgs, 'applyTtsPerformanceSample' | 'stopTtsPlayback'>;

export type UseTtsSessionOrchestrationRuntimeArgs =
  KeyboardArgs &
  PracticeInputDelegateArgs &
  Omit<PlaybackMetricsArgs, 'baseWordsPerSecond'> &
  Omit<BrowserPlaybackDelegateArgs, 'buildSemanticPhrasesForCurrentSession'> &
  Omit<PlaybackControlsDelegateArgs, 'ttsTranscriptWordCount'> &
  ResetSessionDelegateArgs &
  SubmitSessionDelegateArgs;

export type TtsSessionOrchestrationDelegateArgs = {
  keyboardRemap: KeyboardArgs;
  practiceInput: PracticeInputDelegateArgs;
  playbackMetrics: PlaybackMetricsArgs;
  browserPlayback: BrowserPlaybackDelegateArgs;
  playbackControls: PlaybackControlsDelegateArgs;
  resetSession: ResetSessionDelegateArgs;
  submitSession: SubmitSessionDelegateArgs;
};

export function buildTtsSessionOrchestrationDelegateArgs(
  args: UseTtsSessionOrchestrationRuntimeArgs,
  buildSemanticPhrasesForCurrentSession: BrowserPlaybackArgs['buildSemanticPhrasesForCurrentSession'],
): TtsSessionOrchestrationDelegateArgs {
  return {
    keyboardRemap: {
      activeInputMode: args.activeInputMode,
      inputSettingsLocked: args.inputSettingsLocked,
      ttsLanguage: args.ttsLanguage,
    },
    practiceInput: {
      activeSessionFinished: args.activeSessionFinished,
      telemetryRef: args.telemetryRef,
      ttsStartedAtMsRef: args.ttsStartedAtMsRef,
      ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
      setTtsPracticeText: args.setTtsPracticeText,
    },
    playbackMetrics: {
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
    },
    browserPlayback: {
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
      setAdaptiveSemanticDebug: args.setAdaptiveSemanticDebug,
      setTtsCurrentChunk: args.setTtsCurrentChunk,
      setTtsPacingMode: args.setTtsPacingMode,
      setTtsSpeechRate: args.setTtsSpeechRate,
      setTtsStatus: args.setTtsStatus,
      setRunning: args.setRunning,
      setSessionStatus: args.setSessionStatus,
      setError: args.setError,
    },
    playbackControls: {
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
    },
    resetSession: {
      activeSession: args.activeSession,
      activeInputMode: args.activeInputMode,
      inputSettingsLocked: args.inputSettingsLocked,
      ttsText: args.ttsText,
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
    },
    submitSession: {
      activeInputMode: args.activeInputMode,
      ttsHasText: args.ttsHasText,
      ttsPracticeText: args.ttsPracticeText,
      ttsLanguage: args.ttsLanguage,
      sessions: args.sessions,
      activeSessionId: args.activeSessionId,
      activeSession: args.activeSession,
      resolveBrowserTtsVoiceForSession: args.resolveBrowserTtsVoiceForSession,
      collectBrowserTtsEnvironmentForSession: args.collectBrowserTtsEnvironmentForSession,
      persistAndPushSessionsNow: args.persistAndPushSessionsNow,
      completeAdaptiveSessionFeedback: args.completeAdaptiveSessionFeedback,
      setTtsPracticeText: args.setTtsPracticeText,
      setSessions: args.setSessions,
      setRunning: args.setRunning,
      setSessionStatus: args.setSessionStatus,
      setTtsStatus: args.setTtsStatus,
      setError: args.setError,
      setTrainingSubmitMessage: args.setTrainingSubmitMessage,
    },
  };
}

import { useFocusedTrainingLiveMetrics } from './useFocusedTrainingLiveMetrics';
import { useTtsPlaybackIntervalsRuntime } from './useTtsPlaybackIntervalsRuntime';
import { useActiveSessionStateSync } from './useActiveSessionStateSync';
import { useTtsSessionOrchestrationRuntime } from './useTtsSessionOrchestrationRuntime';
import { useFocusedTrainingRouteRuntime } from './useFocusedTrainingRouteRuntime';

type LiveMetricsArgs = Parameters<typeof useFocusedTrainingLiveMetrics>[0];
type IntervalsArgs = Parameters<typeof useTtsPlaybackIntervalsRuntime>[0];
type StateSyncArgs = Parameters<typeof useActiveSessionStateSync>[0];
type TtsOrchestrationArgs = Parameters<typeof useTtsSessionOrchestrationRuntime>[0];
type FocusedTrainingRouteArgs = Parameters<typeof useFocusedTrainingRouteRuntime>[0];

type PlaybackIntervalsDelegateArgs = Omit<IntervalsArgs, 'ttsHasText' | 'tickMs'>;
type ActiveSessionSyncDelegateArgs = Omit<
  StateSyncArgs,
  'activeVisibleAccuracy' | 'activeVisibleScore' | 'activePoints'
>;
type TtsOrchestrationDelegateArgs = Omit<TtsOrchestrationArgs, 'ttsHasText' | 'ttsTranscript'>;
type FocusedTrainingRouteDelegateArgs = Omit<
  FocusedTrainingRouteArgs,
  | 'activeVisibleScore'
  | 'activeLiveScoreHelpText'
  | 'activeLivePointsLabel'
  | 'activeLivePointsHelpText'
  | 'activeVisibleAccuracy'
  | 'activeLiveAccuracyHelpText'
  | 'ttsHasText'
  | 'ttsTranscript'
  | 'estimateTtsSpokenWordIndex'
  | 'seekTtsPlayback'
  | 'resetSession'
  | 'playTts'
  | 'resumeTts'
  | 'pauseTts'
  | 'stopTtsPlayback'
  | 'onTtsPracticeChange'
  | 'onTtsPracticeKeyDown'
  | 'submitTtsSession'
>;

type UseFocusedTrainingRuntimeArgs =
  LiveMetricsArgs &
  PlaybackIntervalsDelegateArgs &
  ActiveSessionSyncDelegateArgs &
  TtsOrchestrationDelegateArgs &
  FocusedTrainingRouteDelegateArgs & {
    config: {
      tickMs: number;
    };
  };

type FocusedTrainingRuntimeDelegateArgs = {
  liveMetrics: LiveMetricsArgs;
  playbackIntervals: PlaybackIntervalsDelegateArgs;
  activeSessionSync: ActiveSessionSyncDelegateArgs;
  ttsOrchestration: TtsOrchestrationDelegateArgs;
  focusedRoute: FocusedTrainingRouteDelegateArgs;
};

function buildFocusedTrainingRuntimeDelegateArgs(
  args: UseFocusedTrainingRuntimeArgs,
): FocusedTrainingRuntimeDelegateArgs {
  return {
    liveMetrics: {
      activeInputMode: args.activeInputMode,
      ttsText: args.ttsText,
      ttsPracticeText: args.ttsPracticeText,
      lagSec: args.lagSec,
      wpm: args.wpm,
      rate: args.rate,
    },
    playbackIntervals: {
      activeInputMode: args.activeInputMode,
      activeSessionFinished: args.activeSessionFinished,
      ttsStatus: args.ttsStatus,
      applyTtsPerformanceSampleRef: args.applyTtsPerformanceSampleRef,
      setTtsPlayerProgressTick: args.setTtsPlayerProgressTick,
    },
    activeSessionSync: {
      sessions: args.sessions,
      setSessions: args.setSessions,
      activeSession: args.activeSession,
      activeSessionId: args.activeSessionId,
      difficulty: args.difficulty,
      inputSettingsLocked: args.inputSettingsLocked,
      ttsText: args.ttsText,
      ttsLanguage: args.ttsLanguage,
      ttsPracticeText: args.ttsPracticeText,
      sessionStatus: args.sessionStatus,
      controllerState: args.controllerState,
      running: args.running,
      rate: args.rate,
      lagSec: args.lagSec,
      lagWords: args.lagWords,
      wpm: args.wpm,
      accuracy: args.accuracy,
      trend: args.trend,
      hydratingSessionIdRef: args.hydratingSessionIdRef,
      allowFinishedSessionResetRef: args.allowFinishedSessionResetRef,
      ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
      ttsUiLastPublishedAtRef: args.ttsUiLastPublishedAtRef,
      ttsPublishedUiRef: args.ttsPublishedUiRef,
      telemetryRef: args.telemetryRef,
      previousLagRef: args.previousLagRef,
      previousAccuracyRef: args.previousAccuracyRef,
      ttsStartedAtMsRef: args.ttsStartedAtMsRef,
      ttsChunkStartMsRef: args.ttsChunkStartMsRef,
      ttsChunkStartWordIndexRef: args.ttsChunkStartWordIndexRef,
      ttsChunkWordCountRef: args.ttsChunkWordCountRef,
      ttsCompletedSourceWordsRef: args.ttsCompletedSourceWordsRef,
      ttsLagOutlierCountRef: args.ttsLagOutlierCountRef,
      ttsUnsafeChunkCountRef: args.ttsUnsafeChunkCountRef,
      ttsChunkAccuracyWindowRef: args.ttsChunkAccuracyWindowRef,
      ttsLastAccuracySnapshotRef: args.ttsLastAccuracySnapshotRef,
      ttsLastControllerActionRef: args.ttsLastControllerActionRef,
      setDifficulty: args.setDifficulty,
      setInputSettingsLocked: args.setInputSettingsLocked,
      setTtsLanguage: args.setTtsLanguage,
      setTtsPracticeText: args.setTtsPracticeText,
      setSessionStatus: args.setSessionStatus,
      setTtsText: args.setTtsText,
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
      setTrend: args.setTrend,
      setControllerState: args.setControllerState,
      setExportMessage: args.setExportMessage,
      setError: args.setError,
      setTrainingSubmitMessage: args.setTrainingSubmitMessage,
      resetAdaptiveSessionFeedbackTracking: args.resetAdaptiveSessionFeedbackTracking,
    },
    ttsOrchestration: {
      activeInputMode: args.activeInputMode,
      inputSettingsLocked: args.inputSettingsLocked,
      ttsLanguage: args.ttsLanguage,
      activeSessionFinished: args.activeSessionFinished,
      telemetryRef: args.telemetryRef,
      ttsStartedAtMsRef: args.ttsStartedAtMsRef,
      ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
      setTtsPracticeText: args.setTtsPracticeText,
      ttsStatus: args.ttsStatus,
      ttsSpeechRate: args.ttsSpeechRate,
      controllerState: args.controllerState,
      rate: args.rate,
      lagSec: args.lagSec,
      lagWords: args.lagWords,
      wpm: args.wpm,
      accuracy: args.accuracy,
      trend: args.trend,
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
      activeSession: args.activeSession,
      ttsText: args.ttsText,
      ttsPacingMode: args.ttsPacingMode,
      browserTtsVoices: args.browserTtsVoices,
      ttsPlaybackProfile: args.ttsPlaybackProfile,
      perfDiagnostics: args.perfDiagnostics,
      stopTtsPlaybackRef: args.stopTtsPlaybackRef,
      ttsPausedAtWordIndexRef: args.ttsPausedAtWordIndexRef,
      ttsUnsafeChunkCountRef: args.ttsUnsafeChunkCountRef,
      ttsChunkAccuracyWindowRef: args.ttsChunkAccuracyWindowRef,
      ttsLastAccuracySnapshotRef: args.ttsLastAccuracySnapshotRef,
      ttsUtteranceRef: args.ttsUtteranceRef,
      ttsSemanticPhraseAdvanceCountRef: args.ttsSemanticPhraseAdvanceCountRef,
      ttsSemanticPhraseReplayCountRef: args.ttsSemanticPhraseReplayCountRef,
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
      ttsPracticeText: args.ttsPracticeText,
      cancelBrowserTts: args.cancelBrowserTts,
      resumeBrowserTts: args.resumeBrowserTts,
      setTtsPlayerProgressTick: args.setTtsPlayerProgressTick,
      resetAdaptiveSessionFeedbackTracking: args.resetAdaptiveSessionFeedbackTracking,
      allowFinishedSessionResetRef: args.allowFinishedSessionResetRef,
      setTrainingSubmitMessage: args.setTrainingSubmitMessage,
      setInputSettingsLocked: args.setInputSettingsLocked,
      sessions: args.sessions,
      activeSessionId: args.activeSessionId,
      resolveBrowserTtsVoiceForSession: args.resolveBrowserTtsVoiceForSession,
      persistAndPushSessionsNow: args.persistAndPushSessionsNow,
      completeAdaptiveSessionFeedback: args.completeAdaptiveSessionFeedback,
      setSessions: args.setSessions,
    },
    focusedRoute: {
      activeInputMode: args.activeInputMode,
      activeSession: args.activeSession,
      activeTrainingSubmissionMeta: args.activeTrainingSubmissionMeta,
      activeInputLabel: args.activeInputLabel,
      sessionStatus: args.sessionStatus,
      ttsStatus: args.ttsStatus,
      running: args.running,
      inputSettingsLocked: args.inputSettingsLocked,
      lagSec: args.lagSec,
      activeSessionFinished: args.activeSessionFinished,
      error: args.error,
      trainingSubmitMessage: args.trainingSubmitMessage,
      exportMessage: args.exportMessage,
      openRouterJobStatus: args.openRouterJobStatus,
      openRouterError: args.openRouterError,
      ttsSpeechRate: args.ttsSpeechRate,
      ttsLanguage: args.ttsLanguage,
      adaptiveSemanticDebug: args.adaptiveSemanticDebug,
      ttsPracticeText: args.ttsPracticeText,
      ttsPlayerProgressTick: args.ttsPlayerProgressTick,
      setInputSettingsLocked: args.setInputSettingsLocked,
      setError: args.setError,
      setExportMessage: args.setExportMessage,
      telemetryRef: args.telemetryRef,
      ttsStartedAtMsRef: args.ttsStartedAtMsRef,
      ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
      pendingSessions: args.pendingSessions,
      activeSessionId: args.activeSessionId,
      openWorkspaceForSession: args.openWorkspaceForSession,
      deleteSession: args.deleteSession,
      supabaseSyncStatus: args.supabaseSyncStatus,
      pendingSyncSummary: args.pendingSyncSummary,
      allowCustomSessionGeneration: args.allowCustomSessionGeneration,
      openRouterAccessAllowed: args.openRouterAccessAllowed,
      isOnline: args.isOnline,
      effectiveOpenRouterDefaultModel: args.effectiveOpenRouterDefaultModel,
      sessionQuotaStatus: args.sessionQuotaStatus,
      openRouterOfflineTitle: args.openRouterOfflineTitle,
      activeOpenRouterJobs: args.activeOpenRouterJobs,
      openRouterJobNotifications: args.openRouterJobNotifications,
      trainingGenerationNotices: args.trainingGenerationNotices,
      trainingGenerationNowMs: args.trainingGenerationNowMs,
      directOpenRouterBusy: args.directOpenRouterBusy,
      directIntermediateOpenRouterBusy: args.directIntermediateOpenRouterBusy,
      directAdvancedOpenRouterBusy: args.directAdvancedOpenRouterBusy,
      expressEasyOpenRouterBusy: args.expressEasyOpenRouterBusy,
      expressIntermediateOpenRouterBusy: args.expressIntermediateOpenRouterBusy,
      expressAdvancedOpenRouterBusy: args.expressAdvancedOpenRouterBusy,
      generateEasyNextSessionFromOpenRouter: args.generateEasyNextSessionFromOpenRouter,
      generateIntermediateNextSessionFromOpenRouter: args.generateIntermediateNextSessionFromOpenRouter,
      generateAdvancedNextSessionFromOpenRouter: args.generateAdvancedNextSessionFromOpenRouter,
      generateExpressEasyNextSessionFromOpenRouter: args.generateExpressEasyNextSessionFromOpenRouter,
      generateExpressIntermediateNextSessionFromOpenRouter: args.generateExpressIntermediateNextSessionFromOpenRouter,
      generateExpressAdvancedNextSessionFromOpenRouter: args.generateExpressAdvancedNextSessionFromOpenRouter,
      openOpenRouterGenerateForActiveInput: args.openOpenRouterGenerateForActiveInput,
    },
  };
}

export function useFocusedTrainingRuntime(args: UseFocusedTrainingRuntimeArgs) {
  const delegateArgs = buildFocusedTrainingRuntimeDelegateArgs(args);
  const {
    ttsHasText,
    ttsTranscript,
    activePoints,
    activeVisibleAccuracy,
    activeVisibleScore,
    activeLivePointsLabel,
    activeLiveScoreHelpText,
    activeLivePointsHelpText,
    activeLiveAccuracyHelpText,
  } = useFocusedTrainingLiveMetrics(delegateArgs.liveMetrics);

  useTtsPlaybackIntervalsRuntime({
    ...delegateArgs.playbackIntervals,
    ttsHasText,
    tickMs: args.config.tickMs,
  });

  useActiveSessionStateSync({
    ...delegateArgs.activeSessionSync,
    activeVisibleAccuracy,
    activeVisibleScore,
    activePoints,
  });

  const {
    getActiveTypingLanguage,
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
    estimateTtsSpokenWordIndex,
    playTts,
    pauseTts,
    resumeTts,
    stopTtsPlayback,
    seekTtsPlayback,
    resetSession,
    submitTtsSession,
  } = useTtsSessionOrchestrationRuntime({
    ...delegateArgs.ttsOrchestration,
    ttsTranscript,
    ttsHasText,
  });

  const { focusedTrainingProps } = useFocusedTrainingRouteRuntime({
    ...delegateArgs.focusedRoute,
    activeVisibleScore,
    activeLiveScoreHelpText,
    activeLivePointsLabel,
    activeLivePointsHelpText,
    activeVisibleAccuracy,
    activeLiveAccuracyHelpText,
    ttsHasText,
    ttsTranscript,
    estimateTtsSpokenWordIndex,
    seekTtsPlayback,
    resetSession,
    playTts,
    resumeTts,
    pauseTts,
    stopTtsPlayback,
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
    submitTtsSession,
  });

  return {
    focusedTrainingProps,
    getActiveTypingLanguage,
  };
}

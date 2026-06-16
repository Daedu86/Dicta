import { useCallback } from 'react';
import { useFocusedTrainingGenerationButtons } from './useFocusedTrainingGenerationButtons';
import { useFocusedTrainingInputTelemetryRuntime } from './useFocusedTrainingInputTelemetryRuntime';
import { useFocusedTrainingPresentationState } from './useFocusedTrainingPresentationState';
import { useFocusedTrainingViewProps } from './useFocusedTrainingViewProps';
import { useTrainingSessionLifecycle } from './useTrainingSessionLifecycle';
import type {
  UseFocusedTrainingRouteRuntimeArgs,
  UseFocusedTrainingRouteRuntimeResult,
} from './useFocusedTrainingRouteRuntimeTypes';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

export type {
  ResetSessionOptions,
  UseFocusedTrainingRouteRuntimeArgs,
  UseFocusedTrainingRouteRuntimeResult,
  WritableRef,
} from './useFocusedTrainingRouteRuntimeTypes';

export function useFocusedTrainingRouteRuntime({
  activeInputMode,
  activeSession,
  activeTrainingSubmissionMeta,
  activeInputLabel,
  sessionStatus,
  ttsStatus,
  running,
  inputSettingsLocked,
  activeVisibleScore,
  activeLiveScoreHelpText,
  activeLivePointsLabel,
  activeLivePointsHelpText,
  activeVisibleAccuracy,
  activeLiveAccuracyHelpText,
  lagSec,
  activeSessionFinished,
  ttsHasText,
  error,
  trainingSubmitMessage,
  exportMessage,
  openRouterJobStatus,
  openRouterError,
  ttsTranscript,
  estimateTtsSpokenWordIndex,
  ttsSpeechRate,
  ttsLanguage,
  adaptiveSemanticDebug,
  ttsPracticeText,
  ttsPlayerProgressTick,
  seekTtsPlayback,
  resetSession,
  playTts,
  resumeTts,
  pauseTts,
  stopTtsPlayback,
  onTtsPracticeChange,
  onTtsPracticeKeyDown,
  submitTtsSession,
  setInputSettingsLocked,
  setError,
  setExportMessage,
  telemetryRef,
  ttsStartedAtMsRef,
  ttsPracticeLiveTextRef,
  pendingSessions,
  activeSessionId,
  openWorkspaceForSession,
  deleteSession,
  supabaseSyncStatus,
  pendingSyncSummary,
  openRouterAccessAllowed,
  isOnline,
  effectiveOpenRouterDefaultModel,
  sessionQuotaStatus,
  openRouterOfflineTitle,
  activeOpenRouterJobs,
  openRouterJobNotifications,
  trainingGenerationNotices,
  trainingGenerationNowMs,
  directOpenRouterBusy,
  directIntermediateOpenRouterBusy,
  directAdvancedOpenRouterBusy,
  generateEasyNextSessionFromOpenRouter,
  generateIntermediateNextSessionFromOpenRouter,
  generateAdvancedNextSessionFromOpenRouter,
}: UseFocusedTrainingRouteRuntimeArgs): UseFocusedTrainingRouteRuntimeResult {
  const { focusedTrainingControls } = useTrainingSessionLifecycle({
    state: {
      activeInputMode,
      activeSessionPresent: Boolean(activeSession),
      activeSessionFinished,
      sessionStatus,
      running,
      ttsHasText,
      ttsStatus,
      inputSettingsLocked,
    },
    text: {
      ttsPracticeText,
    },
    actions: {
      resetSession,
      playTts,
      resumeTts,
      pauseTts,
      stopTts: stopTtsPlayback,
      onTtsPracticeChange,
      submitTtsSession,
      setInputSettingsLocked,
      setError,
      setExportMessage,
      collapseSetupPanels: () => undefined,
    },
  });

  void ttsPlayerProgressTick;

  const {
    ttsPlayerDurationSec,
    ttsPlayerProgressPercent,
    focusedProgressLabel,
    focusedSourceLabel,
    focusedTextValue,
    focusedTextPlaceholder,
    focusedTrainingMessage,
    focusedTrainingMessageTone,
  } = useFocusedTrainingPresentationState({
    ttsTranscriptWordCount: ttsTranscript?.words.length ?? 0,
    ttsHasText,
    ttsSpokenWordIndex: ttsHasText ? estimateTtsSpokenWordIndex() : 0,
    ttsSpeechRate,
    ttsLanguage,
    ttsBaseWordsPerSecond: TTS_BASE_WORDS_PER_SECOND,
    adaptiveSemanticCurrentPhraseIndex: adaptiveSemanticDebug.currentPhraseIndex,
    adaptiveSemanticTotalPhrases: adaptiveSemanticDebug.totalSemanticPhrases,
    activeSessionFinished,
    ttsPracticeText,
    error,
    trainingSubmitMessage,
    exportMessage,
    openRouterJobStatus,
    openRouterError,
  });

  const focusedImmediateInputHandler = useFocusedTrainingInputTelemetryRuntime({
    telemetryRef,
    ttsStartedAtMsRef,
    ttsPracticeLiveTextRef,
  });

  const focusedTrainingGenerationButtons = useFocusedTrainingGenerationButtons({
    openRouterAccessAllowed,
    isOnline,
    activeSession,
    effectiveOpenRouterDefaultModel,
    sessionQuotaStatus,
    openRouterOfflineTitle,
    activeOpenRouterJobs,
    openRouterJobNotifications,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    directOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
  });

  const replayFocusedTts = useCallback((): void => {
    seekTtsPlayback(Math.max(0, ttsPlayerProgressPercent / 100 - 0.08));
  }, [seekTtsPlayback, ttsPlayerProgressPercent]);

  const focusedTrainingProps = useFocusedTrainingViewProps({
    activeSession,
    submissionMeta: activeTrainingSubmissionMeta,
    activeInputLabel,
    sessionStatus,
    sourceLabel: focusedSourceLabel,
    progressLabel: focusedProgressLabel,
    statusLabel: ttsStatus,
    currentTextValue: focusedTextValue,
    onTextChange: onTtsPracticeChange,
    onImmediateTextChange: focusedImmediateInputHandler,
    onTextKeyDown: onTtsPracticeKeyDown,
    textPlaceholder: focusedTextPlaceholder,
    activeVisibleScore,
    liveScoreHelpText: activeLiveScoreHelpText,
    livePointsLabel: activeLivePointsLabel,
    livePointsHelpText: activeLivePointsHelpText,
    activeVisibleAccuracy,
    liveAccuracyHelpText: activeLiveAccuracyHelpText,
    lagSec,
    activeSessionFinished,
    focusedTrainingControls,
    ttsHasText,
    ttsPlayerDurationSec,
    onReplayFocusedTts: replayFocusedTts,
    message: focusedTrainingMessage,
    messageTone: focusedTrainingMessageTone,
    pendingSessions,
    activeSessionId,
    onOpenPendingSession: openWorkspaceForSession,
    onDeletePendingSession: deleteSession,
    syncStatus: supabaseSyncStatus,
    pendingSyncSummary,
    isOnline,
    generationButtons: focusedTrainingGenerationButtons,
  });

  return {
    focusedTrainingProps,
  };
}

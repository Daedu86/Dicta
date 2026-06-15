import { useCallback, type KeyboardEvent } from 'react';
import type { TrainingViewProps } from '../components/TrainingView';
import type {
  ControlAction,
  SessionTelemetry,
  Transcript,
} from '../types/dictation';
import { useFocusedTrainingGenerationButtons } from './useFocusedTrainingGenerationButtons';
import { useFocusedTrainingInputTelemetryRuntime } from './useFocusedTrainingInputTelemetryRuntime';
import { useFocusedTrainingPresentationState } from './useFocusedTrainingPresentationState';
import { useFocusedTrainingViewProps } from './useFocusedTrainingViewProps';
import {
  useTrainingSessionLifecycle,
} from './useTrainingSessionLifecycle';
import type {
  AdaptiveSemanticDebug,
  SessionStatus,
  StoredSession,
  TtsLanguage,
  TtsStatus,
} from './sessionTypes';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

type WritableRef<T> = {
  current: T;
};

type FocusedTrainingGenerationButtonArgs = Parameters<typeof useFocusedTrainingGenerationButtons>[0];

type ResetSessionOptions = {
  preserveInputSettingsLock?: boolean;
};

export type UseFocusedTrainingRouteRuntimeArgs = FocusedTrainingGenerationButtonArgs & {
  activeInputMode: string;
  activeSession: StoredSession | null;
  activeTrainingSubmissionMeta: TrainingViewProps<StoredSession>['submissionMeta'];
  activeInputLabel: string;
  sessionStatus: SessionStatus;
  ttsStatus: TtsStatus;
  running: boolean;
  inputSettingsLocked: boolean;
  activeVisibleScore: number;
  activeLiveScoreHelpText: string;
  activeLivePointsLabel: string;
  activeLivePointsHelpText: string;
  activeVisibleAccuracy: number;
  activeLiveAccuracyHelpText: string;
  lagSec: number;
  activeSessionFinished: boolean;
  ttsHasText: boolean;
  error: string;
  trainingSubmitMessage: string;
  exportMessage: string;
  openRouterJobStatus: string;
  openRouterError: string;
  ttsTranscript: Transcript | null;
  estimateTtsSpokenWordIndex: () => number;
  ttsSpeechRate: number;
  ttsLanguage: TtsLanguage;
  adaptiveSemanticDebug: AdaptiveSemanticDebug;
  ttsPracticeText: string;
  ttsPlayerProgressTick: number;
  seekTtsPlayback: (progressRatio: number) => void;
  resetSession: (options?: ResetSessionOptions) => void;
  playTts: () => void;
  resumeTts: () => void | Promise<void>;
  pauseTts: () => void;
  stopTtsPlayback: (action?: ControlAction) => void;
  onTtsPracticeChange: (value: string) => void;
  onTtsPracticeKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  submitTtsSession: (latestTextValue?: string) => void;
  setInputSettingsLocked: (value: boolean) => void;
  setError: (message: string) => void;
  setExportMessage: (message: string) => void;
  telemetryRef: WritableRef<SessionTelemetry | null | undefined>;
  ttsStartedAtMsRef: WritableRef<number | null>;
  ttsPracticeLiveTextRef: WritableRef<string>;
  pendingSessions: StoredSession[];
  activeSessionId: string;
  openWorkspaceForSession: TrainingViewProps<StoredSession>['onOpenPendingSession'];
  deleteSession: TrainingViewProps<StoredSession>['onDeletePendingSession'];
  supabaseSyncStatus: TrainingViewProps<StoredSession>['syncStatus'];
  pendingSyncSummary: TrainingViewProps<StoredSession>['pendingSyncSummary'];
};

export type UseFocusedTrainingRouteRuntimeResult = {
  focusedTrainingProps: TrainingViewProps<StoredSession>;
};

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
  allowCustomSessionGeneration,
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
  openOpenRouterGenerateForActiveInput,
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
    allowCustomSessionGeneration,
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
    openOpenRouterGenerateForActiveInput,
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

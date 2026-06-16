import type { KeyboardEvent } from 'react';
import type { TrainingViewProps } from '../components/TrainingView';
import type { ControlAction, SessionTelemetry, Transcript } from '../types/dictation';
import type { useFocusedTrainingGenerationButtons } from './useFocusedTrainingGenerationButtons';
import type { AdaptiveSemanticDebug, SessionStatus, StoredSession, TtsLanguage, TtsStatus } from './sessionTypes';

type FocusedTrainingGenerationButtonArgs = Parameters<typeof useFocusedTrainingGenerationButtons>[0];

export type WritableRef<T> = {
  current: T;
};

export type ResetSessionOptions = {
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

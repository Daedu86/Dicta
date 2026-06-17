import { useMemo } from 'react';
import type { TrainingViewProps } from '../components/TrainingView';
import type { StoredSession } from './sessionTypes';
import { buildFocusedTrainingViewProps } from './focusedTrainingViewPropBuilders';

export type FocusedTrainingControls = Pick<
  TrainingViewProps<StoredSession>,
  | 'canPlay'
  | 'playLabel'
  | 'onPlay'
  | 'canPause'
  | 'onPause'
  | 'canStop'
  | 'onStop'
  | 'canReset'
  | 'onReset'
  | 'canSubmit'
  | 'onSubmit'
  | 'submitLabel'
>;

export type UseFocusedTrainingViewPropsArgs = Omit<
  TrainingViewProps<StoredSession>,
  | 'liveScoreLabel'
  | 'liveAccuracyLabel'
  | 'liveLagLabel'
  | 'liveLagHelpText'
  | 'readOnly'
  | 'canPlay'
  | 'playLabel'
  | 'onPlay'
  | 'canPause'
  | 'onPause'
  | 'canReplay'
  | 'onReplay'
  | 'canStop'
  | 'onStop'
  | 'canReset'
  | 'onReset'
  | 'canSubmit'
  | 'onSubmit'
  | 'submitLabel'
  | 'textCommitDelayMs'
> & {
  activeVisibleScore: number;
  activeVisibleAccuracy: number;
  lagSec: number;
  activeSessionFinished: boolean;
  focusedTrainingControls: FocusedTrainingControls;
  ttsHasText: boolean;
  ttsPlayerDurationSec: number;
  onReplayFocusedTts: TrainingViewProps<StoredSession>['onReplay'];
};

export function useFocusedTrainingViewProps(args: UseFocusedTrainingViewPropsArgs): TrainingViewProps<StoredSession> {
  const {
    activeSession,
    submissionMeta,
    activeInputLabel,
    sessionStatus,
    sourceLabel,
    progressLabel,
    statusLabel,
    currentTextValue,
    onTextChange,
    onImmediateTextChange,
    onTextKeyDown,
    textPlaceholder,
    activeVisibleScore,
    liveScoreHelpText,
    livePointsLabel,
    livePointsHelpText,
    activeVisibleAccuracy,
    liveAccuracyHelpText,
    lagSec,
    activeSessionFinished,
    focusedTrainingControls,
    ttsHasText,
    ttsPlayerDurationSec,
    onReplayFocusedTts,
    message,
    messageTone,
    pendingSessions,
    activeSessionId,
    onOpenPendingSession,
    onDeletePendingSession,
    syncStatus,
    pendingSyncSummary,
    isOnline,
    generationButtons,
  } = args;

  return useMemo(() => buildFocusedTrainingViewProps(args), [
    activeSession,
    submissionMeta,
    activeInputLabel,
    sessionStatus,
    sourceLabel,
    progressLabel,
    statusLabel,
    currentTextValue,
    onTextChange,
    onImmediateTextChange,
    onTextKeyDown,
    textPlaceholder,
    activeVisibleScore,
    liveScoreHelpText,
    livePointsLabel,
    livePointsHelpText,
    activeVisibleAccuracy,
    liveAccuracyHelpText,
    lagSec,
    activeSessionFinished,
    focusedTrainingControls,
    ttsHasText,
    ttsPlayerDurationSec,
    onReplayFocusedTts,
    message,
    messageTone,
    pendingSessions,
    activeSessionId,
    onOpenPendingSession,
    onDeletePendingSession,
    syncStatus,
    pendingSyncSummary,
    isOnline,
    generationButtons,
  ]);
}

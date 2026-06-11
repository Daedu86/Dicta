import { useMemo } from 'react';
import type { TrainingViewProps } from '../components/TrainingView';
import type { StoredSession } from './sessionTypes';

type FocusedTrainingControls = Pick<
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

type UseFocusedTrainingViewPropsArgs = Omit<
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

export function useFocusedTrainingViewProps({
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
}: UseFocusedTrainingViewPropsArgs): TrainingViewProps<StoredSession> {
  return useMemo(
    () => ({
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
      liveScoreLabel: String(activeVisibleScore),
      liveScoreHelpText,
      livePointsLabel,
      livePointsHelpText,
      liveAccuracyLabel: `${activeVisibleAccuracy.toFixed(1)}%`,
      liveAccuracyHelpText,
      liveLagLabel: `${lagSec.toFixed(2)}s`,
      liveLagHelpText:
        'Lag compares typed progress with expected playback progress. Positive means you are behind; negative means you are ahead.',
      readOnly: activeSessionFinished,
      canPlay: focusedTrainingControls.canPlay,
      playLabel: focusedTrainingControls.playLabel,
      onPlay: focusedTrainingControls.onPlay,
      canPause: focusedTrainingControls.canPause,
      onPause: focusedTrainingControls.onPause,
      canReplay: ttsHasText && ttsPlayerDurationSec > 0,
      onReplay: onReplayFocusedTts,
      canStop: focusedTrainingControls.canStop,
      onStop: focusedTrainingControls.onStop,
      canReset: focusedTrainingControls.canReset,
      onReset: focusedTrainingControls.onReset,
      canSubmit: focusedTrainingControls.canSubmit,
      onSubmit: focusedTrainingControls.onSubmit,
      submitLabel: focusedTrainingControls.submitLabel,
      message,
      messageTone,
      textCommitDelayMs: 250,
      pendingSessions,
      activeSessionId,
      onOpenPendingSession,
      onDeletePendingSession,
      syncStatus,
      pendingSyncSummary,
      isOnline,
      generationButtons,
    }),
    [
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
    ],
  );
}

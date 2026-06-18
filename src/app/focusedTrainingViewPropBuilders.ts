import type { TrainingViewProps } from '../components/TrainingView';
import type { StoredSession } from './sessionTypes';
import type { UseFocusedTrainingViewPropsArgs } from './useFocusedTrainingViewProps';

type FocusedTrainingLiveMetricsArgs = Pick<
  UseFocusedTrainingViewPropsArgs,
  'activeVisibleScore' | 'activeVisibleAccuracy' | 'lagSec'
>;

type FocusedTrainingPlaybackArgs = Pick<
  UseFocusedTrainingViewPropsArgs,
  'focusedTrainingControls' | 'ttsHasText' | 'ttsPlayerDurationSec' | 'onReplayFocusedTts'
>;

const FOCUSED_TRAINING_TEXT_COMMIT_DELAY_MS = 1200;
const FOCUSED_TRAINING_LAG_HELP_TEXT =
  'Lag compares typed progress with expected playback progress. Positive means you are behind; negative means you are ahead.';

export function buildFocusedTrainingViewProps({
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
  liveScoreHelpText,
  livePointsLabel,
  livePointsHelpText,
  liveAccuracyHelpText,
  activeSessionFinished,
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
  ...focusedRuntime
}: UseFocusedTrainingViewPropsArgs): TrainingViewProps<StoredSession> {
  return {
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
    ...buildFocusedTrainingLiveMetrics(focusedRuntime),
    liveScoreHelpText,
    livePointsLabel,
    livePointsHelpText,
    liveAccuracyHelpText,
    readOnly: activeSessionFinished,
    ...buildFocusedTrainingPlaybackProps(focusedRuntime),
    message,
    messageTone,
    textCommitDelayMs: FOCUSED_TRAINING_TEXT_COMMIT_DELAY_MS,
    pendingSessions,
    activeSessionId,
    onOpenPendingSession,
    onDeletePendingSession,
    syncStatus,
    pendingSyncSummary,
    isOnline,
    generationButtons,
  };
}

function buildFocusedTrainingLiveMetrics({
  activeVisibleScore,
  activeVisibleAccuracy,
  lagSec,
}: FocusedTrainingLiveMetricsArgs): Pick<
  TrainingViewProps<StoredSession>,
  'liveScoreLabel' | 'liveAccuracyLabel' | 'liveLagLabel' | 'liveLagHelpText'
> {
  return {
    liveScoreLabel: String(activeVisibleScore),
    liveAccuracyLabel: `${activeVisibleAccuracy.toFixed(1)}%`,
    liveLagLabel: `${lagSec.toFixed(2)}s`,
    liveLagHelpText: FOCUSED_TRAINING_LAG_HELP_TEXT,
  };
}

function buildFocusedTrainingPlaybackProps({
  focusedTrainingControls,
  ttsHasText,
  ttsPlayerDurationSec,
  onReplayFocusedTts,
}: FocusedTrainingPlaybackArgs): Pick<
  TrainingViewProps<StoredSession>,
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
> {
  return {
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
  };
}

import type { TrainingViewProps } from '../components/TrainingView';
import { buildSessionPointsHelpText, computeSessionMaxPoints, formatSessionPointsForSession } from '../core/evaluation';
import { buildSessionScoreHelpText } from '../core/sessionScore';
import type { StoredSession } from './sessionTypes';
import type { UseFocusedTrainingViewPropsArgs } from './useFocusedTrainingViewProps';

type FocusedTrainingLiveMetricsArgs = Pick<
  UseFocusedTrainingViewPropsArgs,
  | 'activeSession'
  | 'activeSessionFinished'
  | 'activeVisibleScore'
  | 'activeVisibleAccuracy'
  | 'lagSec'
  | 'liveScoreHelpText'
  | 'livePointsLabel'
  | 'livePointsHelpText'
  | 'liveAccuracyHelpText'
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
  onTextBlur,
  onTextKeyDown,
  textPlaceholder,
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
  completedPracticeChunks,
  activePracticeChunk,
  practiceChunkActionQueued,
  practiceChunkAdvanceCountdownSeconds,
  finalPracticeChunkAudioCompleted,
  onSubmitPracticeChunk,
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
    onTextBlur,
    onTextKeyDown,
    textPlaceholder,
    ...buildFocusedTrainingLiveMetrics({
      activeSession,
      activeSessionFinished,
      ...focusedRuntime,
    }),
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
    completedPracticeChunks,
    activePracticeChunk,
    practiceChunkActionQueued,
    practiceChunkAdvanceCountdownSeconds,
    finalPracticeChunkAudioCompleted,
    onSubmitPracticeChunk,
  };
}

function buildFocusedTrainingLiveMetrics({
  activeSession,
  activeSessionFinished,
  activeVisibleScore,
  activeVisibleAccuracy,
  lagSec,
  liveScoreHelpText,
  livePointsLabel,
  livePointsHelpText,
  liveAccuracyHelpText,
}: FocusedTrainingLiveMetricsArgs): Pick<
  TrainingViewProps<StoredSession>,
  | 'liveScoreLabel'
  | 'liveScoreHelpText'
  | 'livePointsLabel'
  | 'livePointsHelpText'
  | 'liveAccuracyLabel'
  | 'liveAccuracyHelpText'
  | 'liveLagLabel'
  | 'liveLagHelpText'
> {
  if (activeSessionFinished && activeSession?.status === 'finished') {
    const { metrics } = activeSession;
    const maxPoints = computeSessionMaxPoints(activeSession);

    return {
      liveScoreLabel: String(metrics.score),
      liveScoreHelpText: buildSessionScoreHelpText(metrics),
      livePointsLabel: formatSessionPointsForSession(metrics.points, activeSession),
      livePointsHelpText: buildSessionPointsHelpText(maxPoints),
      liveAccuracyLabel: `${metrics.accuracy.toFixed(1)}%`,
      liveAccuracyHelpText,
      liveLagLabel: `${metrics.lagSec.toFixed(2)}s`,
      liveLagHelpText: FOCUSED_TRAINING_LAG_HELP_TEXT,
    };
  }

  return {
    liveScoreLabel: String(activeVisibleScore),
    liveScoreHelpText,
    livePointsLabel,
    livePointsHelpText,
    liveAccuracyLabel: `${activeVisibleAccuracy.toFixed(1)}%`,
    liveAccuracyHelpText,
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

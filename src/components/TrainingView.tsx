import { formatDifficultyLabel } from '../core/config';
import { PendingSessionLane } from './training/PendingSessionLane';
import { SyncStatusBanner } from './training/SyncStatusBanner';
import { TrainingAudioCard } from './training/TrainingAudioCard';
import { TrainingGenerationCard } from './training/TrainingGenerationCard';
import { TrainingInputCard } from './training/TrainingInputCard';
import { TrainingSessionCard } from './training/TrainingSessionCard';
import { TrainingSubmitCard } from './training/TrainingSubmitCard';
import { buildFocusedTrainingReview } from '../app/focusedTrainingReview';
import { formatSessionStatus, getSessionDisplayTitle } from './trainingViewSessionDisplay';
import { useTrainingViewInputController } from './useTrainingViewInputController';
import type { TrainingViewProps, TrainingViewSession } from './TrainingViewTypes';

export type {
  TrainingPendingSyncSummary,
  TrainingSessionInputMode,
  TrainingSessionStatus,
  TrainingSupabaseSyncStatus,
  TrainingViewProps,
  TrainingViewSession,
} from './TrainingViewTypes';

export function TrainingView<Session extends TrainingViewSession>({
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
  liveScoreLabel,
  liveScoreHelpText,
  livePointsLabel,
  livePointsHelpText,
  liveAccuracyLabel,
  liveAccuracyHelpText,
  liveLagLabel,
  liveLagHelpText,
  readOnly,
  canPlay,
  playLabel,
  onPlay,
  canPause,
  onPause,
  canReplay,
  onReplay,
  canStop,
  onStop,
  canReset,
  onReset,
  canSubmit,
  onSubmit,
  submitLabel,
  message,
  messageTone,
  generationButtons,
  textCommitDelayMs,
  pendingSessions,
  activeSessionId,
  onOpenPendingSession,
  onDeletePendingSession,
  syncStatus,
  pendingSyncSummary,
  isOnline,
}: TrainingViewProps<Session>) {
  const inputController = useTrainingViewInputController({
    currentTextValue,
    onTextChange,
    onImmediateTextChange,
    onTextKeyDown,
  });

  function handlePlay(): void {
    onPlay();
    inputController.focusTextInput();
  }

  const textAreaId = 'training-dictation-input';
  const activeDifficultyLabel = activeSession ? formatDifficultyLabel(activeSession.difficulty) : '—';
  const review = activeSession ? buildFocusedTrainingReview(activeSession.ttsText ?? '', currentTextValue) : null;

  return (
    <section className="training-view" aria-label="Focused training view">
      <SyncStatusBanner syncStatus={syncStatus} pendingSyncSummary={pendingSyncSummary} isOnline={isOnline} />

      <PendingSessionLane
        sessions={pendingSessions}
        activeSessionId={activeSessionId}
        className="training-pending-session-lane"
        onOpenSession={onOpenPendingSession}
        onDeleteSession={onDeletePendingSession}
      />

      <TrainingSessionCard
        activeInputLabel={activeInputLabel}
        sessionTitle={activeSession ? getSessionDisplayTitle(activeSession) : 'No active session'}
        submissionMeta={submissionMeta}
        activeDifficultyLabel={activeDifficultyLabel}
        progressLabel={progressLabel}
        sourceLabel={sourceLabel}
        sessionStatusLabel={formatSessionStatus(sessionStatus)}
      />

      <TrainingAudioCard
        statusLabel={statusLabel}
        canPlay={canPlay}
        playLabel={playLabel}
        onPlay={handlePlay}
        canPause={canPause}
        onPause={() => onPause(inputController.flushTextInput())}
        canReplay={canReplay}
        onReplay={onReplay}
        canStop={canStop}
        onStop={() => onStop(inputController.flushTextInput())}
        canReset={canReset}
        onReset={onReset}
      />

      <TrainingInputCard
        textAreaId={textAreaId}
        textInputRef={inputController.textInputRef}
        currentTextValue={currentTextValue}
        onTextChange={inputController.handleTextChange}
        onImmediateTextChange={inputController.handleImmediateTextChange}
        onTextKeyDown={inputController.handleTextKeyDown}
        textPlaceholder={textPlaceholder}
        readOnly={readOnly}
        textCommitDelayMs={textCommitDelayMs}
        syncKey={`${activeSession?.id ?? 'none'}:${activeSession?.inputMode ?? 'none'}`}
        liveScoreLabel={liveScoreLabel}
        liveScoreHelpText={liveScoreHelpText}
        livePointsLabel={livePointsLabel}
        livePointsHelpText={livePointsHelpText}
        liveAccuracyLabel={liveAccuracyLabel}
        liveAccuracyHelpText={liveAccuracyHelpText}
        liveLagLabel={liveLagLabel}
        liveLagHelpText={liveLagHelpText}
        showReview={Boolean(activeSession && sessionStatus === 'finished')}
        review={review}
      />

      <TrainingSubmitCard
        canSubmit={canSubmit}
        submitLabel={submitLabel}
        onSubmit={() => onSubmit(inputController.flushTextInput())}
        message={message}
        messageTone={messageTone}
      />

      <TrainingGenerationCard generationButtons={generationButtons} />
    </section>
  );
}

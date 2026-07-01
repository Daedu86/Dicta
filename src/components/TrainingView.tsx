import { useState } from 'react';
import { formatDifficultyLabel } from '../core/config';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { PendingSessionLane } from './training/PendingSessionLane';
import { SyncStatusBanner } from './training/SyncStatusBanner';
import { TrainingAudioCard } from './training/TrainingAudioCard';
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
  onTextBlur,
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
  textCommitDelayMs,
  pendingSessions,
  activeSessionId,
  onOpenPendingSession,
  onDeletePendingSession,
  syncStatus,
  pendingSyncSummary,
  isOnline,
  completedPracticeChunks,
  activePracticeChunk,
  practiceChunkActionQueued,
  practiceChunkAdvanceCountdownSeconds,
  finalPracticeChunkAudioCompleted,
  onReplayPracticeChunk,
  onSubmitPracticeChunk,
}: TrainingViewProps<Session>) {
  const [playFocusRequestId, setPlayFocusRequestId] = useState(0);
  const inputController = useTrainingViewInputController({
    currentTextValue,
    onTextChange,
    onImmediateTextChange,
    onTextKeyDown,
  });

  function handlePlay(): void {
    onPlay();
    if (activePracticeChunk) {
      setPlayFocusRequestId((currentRequestId) => currentRequestId + 1);
      inputController.focusTextInput({ scroll: false, defer: false });
      return;
    }
    inputController.focusTextInput();
  }

  const textAreaId = 'training-dictation-input';
  const activeDifficultyLabel = activeSession ? formatDifficultyLabel(activeSession.difficulty) : '—';
  const review = activeSession ? buildFocusedTrainingReview(activeSession.ttsText ?? '', currentTextValue) : null;
  const usesEmbeddedTtsControls = activeSession?.inputMode === BROWSER_TTS_SESSION_INPUT_MODE;

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
        sourceLabel={sourceLabel}
        sessionStatusLabel={formatSessionStatus(sessionStatus)}
      />

      {!usesEmbeddedTtsControls ? (
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
      ) : null}

      <TrainingInputCard
        textAreaId={textAreaId}
        textInputRef={inputController.textInputRef}
        currentTextValue={currentTextValue}
        onTextChange={inputController.handleTextChange}
        onImmediateTextChange={inputController.handleImmediateTextChange}
        onTextBlur={onTextBlur}
        onTextKeyDown={inputController.handleTextKeyDown}
        textPlaceholder={textPlaceholder}
        readOnly={readOnly}
        textCommitDelayMs={textCommitDelayMs}
        syncKey={`${activeSession?.id ?? 'none'}:${activeSession?.inputMode ?? 'none'}`}
        liveScoreLabel={liveScoreLabel}
        liveScoreHelpText={liveScoreHelpText}
        progressLabel={progressLabel}
        livePointsLabel={livePointsLabel}
        livePointsHelpText={livePointsHelpText}
        liveAccuracyLabel={liveAccuracyLabel}
        liveAccuracyHelpText={liveAccuracyHelpText}
        liveLagLabel={liveLagLabel}
        liveLagHelpText={liveLagHelpText}
        showReview={Boolean(activeSession && sessionStatus === 'finished')}
        review={review}
        reviewChunks={activeSession?.telemetry?.practiceChunks}
        completedPracticeChunks={completedPracticeChunks}
        activePracticeChunk={activePracticeChunk}
        practiceChunkActionQueued={practiceChunkActionQueued}
        practiceChunkAdvanceCountdownSeconds={practiceChunkAdvanceCountdownSeconds}
        finalPracticeChunkAudioCompleted={finalPracticeChunkAudioCompleted}
        showEmbeddedPlay={usesEmbeddedTtsControls}
        canPlayPracticeChunk={canPlay}
        playPracticeChunkLabel={playLabel}
        onPlayPracticeChunk={handlePlay}
        onReplayPracticeChunk={onReplayPracticeChunk}
        onSubmitPracticeChunk={onSubmitPracticeChunk}
        playFocusRequestId={playFocusRequestId}
      />

      <TrainingSubmitCard
        canSubmit={canSubmit}
        submitLabel={submitLabel}
        onSubmit={() => onSubmit(inputController.flushTextInput())}
        message={message}
        messageTone={messageTone}
        showAction={!activePracticeChunk}
      />
    </section>
  );
}

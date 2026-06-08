import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import type { LanguageCode } from '../core/adaptive/types';
import { formatDifficultyLabel, type Difficulty } from '../core/config';
import { formatSupportedLanguage } from '../core/languages';
import { perfDiagnostics } from '../core/perfDiagnostics';
import type { CreatedDeviceKind } from '../core/sessionDevice';
import type { LowLatencyTextareaHandle } from './LowLatencyTextarea';
import { PendingSessionLane } from './training/PendingSessionLane';
import { SyncStatusBanner } from './training/SyncStatusBanner';
import { TrainingAudioCard } from './training/TrainingAudioCard';
import { TrainingGenerationCard, type TrainingGenerationButton } from './training/TrainingGenerationCard';
import { TrainingInputCard } from './training/TrainingInputCard';
import { TrainingSessionCard, type TrainingSessionSubmissionMeta } from './training/TrainingSessionCard';
import { TrainingSubmitCard } from './training/TrainingSubmitCard';

type SessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';
type SessionInputMode = string;

type SupabaseSyncStatus = {
  enabled: boolean;
  state: 'disabled' | 'idle' | 'pulling' | 'pushing' | 'synced' | 'error';
  message: string;
  lastSyncedAt: string | null;
  imported: number;
  pushed: number;
};

type PendingSyncSummary = {
  count: number;
  hasPending: boolean;
};

type TrainingViewSession = {
  id: string;
  name: string;
  inputMode: SessionInputMode;
  inputSettingsLocked: boolean;
  ttsLanguage: LanguageCode | null;
  difficulty: Difficulty;
  status: SessionStatus;
  createdDeviceKind: CreatedDeviceKind;
  createdDeviceLabel?: string;
  dictationScript: DictationScript | null;
};

export type TrainingViewProps<Session extends TrainingViewSession = TrainingViewSession> = {
  activeSession: Session | null;
  submissionMeta: TrainingSessionSubmissionMeta | null;
  activeInputLabel: string;
  sessionStatus: SessionStatus;
  sourceLabel: string;
  progressLabel: string;
  statusLabel: string;
  currentTextValue: string;
  onTextChange: (value: string) => void;
  onImmediateTextChange?: (value: string) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textPlaceholder: string;
  liveScoreLabel: string;
  liveScoreHelpText: string;
  livePointsLabel: string;
  livePointsHelpText: string;
  liveAccuracyLabel: string;
  liveAccuracyHelpText: string;
  liveLagLabel: string;
  liveLagHelpText: string;
  readOnly: boolean;
  canPlay: boolean;
  playLabel: string;
  onPlay: () => void;
  canPause: boolean;
  onPause: (latestTextValue?: string) => void;
  canReplay: boolean;
  onReplay: () => void;
  canStop: boolean;
  onStop: (latestTextValue?: string) => void;
  canReset: boolean;
  onReset: () => void;
  canSubmit: boolean;
  onSubmit: (latestTextValue?: string) => void;
  submitLabel: string;
  message: string;
  messageTone?: 'error' | 'success' | 'hint';
  generationButtons: TrainingGenerationButton[];
  textCommitDelayMs: number;
  pendingSessions: Session[];
  activeSessionId: string | null;
  onOpenPendingSession: (session: Session) => void;
  onDeletePendingSession: (sessionId: string) => void;
  syncStatus: SupabaseSyncStatus;
  pendingSyncSummary: PendingSyncSummary;
  isOnline: boolean;
};

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
  const textInputRef = useRef<LowLatencyTextareaHandle | null>(null);
  const onTextChangeRef = useRef(onTextChange);
  const onImmediateTextChangeRef = useRef(onImmediateTextChange);
  const onTextKeyDownRef = useRef(onTextKeyDown);
  const trainingViewRenderCountRef = useRef(0);
  trainingViewRenderCountRef.current += 1;

  useEffect(() => {
    onTextChangeRef.current = onTextChange;
  }, [onTextChange]);

  useEffect(() => {
    onImmediateTextChangeRef.current = onImmediateTextChange;
  }, [onImmediateTextChange]);

  useEffect(() => {
    onTextKeyDownRef.current = onTextKeyDown;
  }, [onTextKeyDown]);

  useEffect(() => {
    perfDiagnostics.recordRender('TrainingView', trainingViewRenderCountRef.current);
  });

  const handleTextChange = useCallback((value: string) => {
    onTextChangeRef.current(value);
  }, []);

  const handleImmediateTextChange = useCallback((value: string) => {
    onImmediateTextChangeRef.current?.(value);
  }, []);

  const handleTextKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    onTextKeyDownRef.current(event);
  }, []);

  function flushTextInput(): string {
    return textInputRef.current?.flush() ?? currentTextValue;
  }

  function focusTextInput(): void {
    window.requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
  }

  function handlePlay(): void {
    onPlay();
    focusTextInput();
  }

  const textAreaId = 'training-dictation-input';
  const activeDifficultyLabel = activeSession ? formatDifficultyLabel(activeSession.difficulty) : '—';

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
        onPause={() => onPause(flushTextInput())}
        canReplay={canReplay}
        onReplay={onReplay}
        canStop={canStop}
        onStop={() => onStop(flushTextInput())}
        canReset={canReset}
        onReset={onReset}
      />

      <TrainingInputCard
        textAreaId={textAreaId}
        textInputRef={textInputRef}
        currentTextValue={currentTextValue}
        onTextChange={handleTextChange}
        onImmediateTextChange={handleImmediateTextChange}
        onTextKeyDown={handleTextKeyDown}
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
      />

      <TrainingSubmitCard
        canSubmit={canSubmit}
        submitLabel={submitLabel}
        onSubmit={() => onSubmit(flushTextInput())}
        message={message}
        messageTone={messageTone}
      />

      <TrainingGenerationCard generationButtons={generationButtons} />
    </section>
  );
}

function formatSessionStatus(value: SessionStatus): string {
  switch (value) {
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    case 'finished':
      return 'Finished';
    case 'error':
      return 'Error';
    default:
      return 'Ready';
  }
}

function getSessionDisplayTitle(session: TrainingViewSession): string {
  if (session.dictationScript) {
    return normalizeGeneratedDictationScriptTitle(session.dictationScript).title;
  }
  return session.name || 'Untitled session';
}

function normalizeGeneratedDictationScriptTitle(script: DictationScript): DictationScript {
  const title = script.title.trim();
  if (!isGenericGeneratedTitle(title)) return script;
  return {
    ...script,
    title: buildFallbackDictationScriptTitle(script),
  };
}

function isGenericGeneratedTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  return (
    normalized.length === 0 ||
    normalized === 'generated dictation' ||
    normalized === 'dictation' ||
    normalized === 'training script' ||
    normalized === 'generated script' ||
    normalized === 'untitled'
  );
}

function buildFallbackDictationScriptTitle(script: DictationScript): string {
  const firstPhrase = script.phrases.find((phrase) => phrase.text.trim().length > 0)?.text.trim() ?? '';
  const words = firstPhrase.match(/[\p{L}\p{N}]+/gu) ?? [];
  const titleWords = words.slice(0, 6);
  if (titleWords.length > 0) {
    return truncateTitle(titleWords.join(' '));
  }

  const language = formatSupportedLanguage(script.language);
  return `${language} ${String(script.inputMode)} practice`;
}

function truncateTitle(title: string): string {
  return title.length > 64 ? `${title.slice(0, 61).trim()}...` : title;
}

import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import type { LanguageCode } from '../core/adaptive/types';
import { formatDifficultyLabel, type Difficulty } from '../core/config';
import { formatSupportedLanguage } from '../core/languages';
import { perfDiagnostics } from '../core/perfDiagnostics';
import type { CreatedDeviceKind } from '../core/sessionDevice';
import { LowLatencyTextarea, type LowLatencyTextareaHandle } from './LowLatencyTextarea';
import { PendingSessionLane } from './training/PendingSessionLane';
import { SyncStatusBanner } from './training/SyncStatusBanner';

type SessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';
type SessionInputMode = 'input1' | 'input2' | 'input3' | 'input4';

type TrainingSessionSubmissionMeta = {
  positionLabel: string;
  scoreLabel: string;
  scoreHelpText: string;
  accuracyLabel: string;
  pointsLabel: string;
  pointsHelpText: string;
  durationLabel: string;
  submittedAtLabel: string;
};

type TrainingGenerationButton = {
  id: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  title: string;
  helpText?: string;
  statusMessage?: string;
  statusTone?: 'hint' | 'success' | 'error';
};

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
  transcriptionLanguage: LanguageCode | null;
  ttsLanguage: LanguageCode | null;
  kokoroLanguage: LanguageCode | null;
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
  audioRef: RefObject<HTMLAudioElement | null>;
  audioUrl: string;
  onAudioTimeUpdate: () => void;
  onAudioEnded: () => void;
  showAudioElement: boolean;
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
  audioRef,
  audioUrl,
  onAudioTimeUpdate,
  onAudioEnded,
  showAudioElement,
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

      <section className="training-card training-session-card">
        <p className="training-eyebrow">{activeInputLabel}</p>
        <h2>{activeSession ? getSessionDisplayTitle(activeSession) : 'No active session'}</h2>
        {submissionMeta ? (
          <div className="training-session-submission-meta" aria-label="Submitted session metadata">
            <span>Position {submissionMeta.positionLabel}</span>
            <span>Difficulty {activeDifficultyLabel}</span>
            <span
              title={submissionMeta.scoreHelpText}
              aria-label={`Score ${submissionMeta.scoreLabel}. ${submissionMeta.scoreHelpText}`}
            >
              Score {submissionMeta.scoreLabel}
            </span>
            <span>Accuracy {submissionMeta.accuracyLabel}</span>
            <span
              title={submissionMeta.pointsHelpText}
              aria-label={`Points ${submissionMeta.pointsLabel}. ${submissionMeta.pointsHelpText}`}
            >
              Points {submissionMeta.pointsLabel}
            </span>
            <span>Duration {submissionMeta.durationLabel}</span>
            <span>Submitted {submissionMeta.submittedAtLabel}</span>
          </div>
        ) : null}
        <div className="training-session-meta" aria-label="Current session info">
          <span>{progressLabel}</span>
          <span>{sourceLabel}</span>
          {!submissionMeta ? <span>Difficulty {activeDifficultyLabel}</span> : null}
          <span>{formatSessionStatus(sessionStatus)}</span>
        </div>
      </section>

      <section className="training-card training-audio-card" aria-label="Media player and audio controls">
        <div className="training-audio-status">
          <span>Media player</span>
          <strong>{statusLabel}</strong>
        </div>
        {showAudioElement ? (
          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            className="training-native-audio"
            onTimeUpdate={onAudioTimeUpdate}
            onEnded={onAudioEnded}
          />
        ) : null}
        <div className="training-control-grid">
          <button type="button" onClick={handlePlay} disabled={!canPlay}>
            {playLabel}
          </button>
          <button type="button" className="secondary-button" onClick={onReplay} disabled={!canReplay}>
            Replay
          </button>
          <button type="button" className="secondary-button" onClick={() => onPause(flushTextInput())} disabled={!canPause}>
            Pause
          </button>
          <button type="button" className="secondary-button" onClick={() => onStop(flushTextInput())} disabled={!canStop}>
            Stop
          </button>
          <button
            type="button"
            className="secondary-button training-reset-button"
            onClick={onReset}
            disabled={!canReset}
            title="Clear this attempt and return playback to the beginning"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="training-card training-input-card" aria-label="Dictation input">
        <div className="training-input-header">
          <label className="training-input-heading" htmlFor={textAreaId}>Type what you hear</label>
          <div className="training-live-metrics" aria-label="Live session score, points, accuracy, and lag">
            <span title={liveScoreHelpText} aria-label={`Live score ${liveScoreLabel}. ${liveScoreHelpText}`}>
              <small>Score</small>
              <strong>{liveScoreLabel}</strong>
            </span>
            <span title={livePointsHelpText} aria-label={`Live points ${livePointsLabel}. ${livePointsHelpText}`}>
              <small>Points</small>
              <strong>{livePointsLabel}</strong>
            </span>
            <span title={liveAccuracyHelpText} aria-label={`Live accuracy ${liveAccuracyLabel}. ${liveAccuracyHelpText}`}>
              <small>Accuracy</small>
              <strong>{liveAccuracyLabel}</strong>
            </span>
            <span title={liveLagHelpText} aria-label={`Live lag ${liveLagLabel}. ${liveLagHelpText}`}>
              <small>Lag</small>
              <strong>{liveLagLabel}</strong>
            </span>
          </div>
        </div>
        <LowLatencyTextarea
          id={textAreaId}
          ref={textInputRef}
          value={currentTextValue}
          onValueChange={handleTextChange}
          onImmediateValueChange={handleImmediateTextChange}
          onKeyDown={handleTextKeyDown}
          placeholder={textPlaceholder}
          readOnly={readOnly}
          rows={10}
          commitDelayMs={textCommitDelayMs}
          maxCommitDelayMs={Math.max(textCommitDelayMs * 3, 240)}
          syncKey={`${activeSession?.id ?? 'none'}:${activeSession?.inputMode ?? 'none'}`}
        />
      </section>

      <section className="training-card training-submit-card">
        <button type="button" className="training-submit-button" onClick={() => onSubmit(flushTextInput())} disabled={!canSubmit}>
          {submitLabel}
        </button>
        {message ? <p className={messageTone ?? (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'error' : 'hint')}>{message}</p> : null}
      </section>

      {generationButtons.length > 0 ? (
        <section className="training-card training-generation-card" aria-label="Generate new sessions">
          <div className="training-generation-grid">
            {generationButtons.map((button) => (
              <div key={button.id} className={`training-generation-action ${button.id === 'custom' ? 'training-generation-action-wide' : ''}`.trim()}>
                <div className="training-generation-button-row">
                  <button
                    type="button"
                    className="training-generation-button"
                    onClick={button.onClick}
                    disabled={button.disabled}
                    title={button.title}
                  >
                    {button.label}
                  </button>
                  {button.helpText ? <HelpIcon tooltip={button.helpText} ariaLabel={`Help for ${button.label}`} /> : null}
                </div>
                {button.statusMessage ? (
                  <p className={`training-generation-notice training-generation-notice-${button.statusTone ?? 'hint'}`} aria-live="polite">
                    {button.statusMessage}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function HelpIcon({ tooltip, ariaLabel = 'Help' }: { tooltip: string; ariaLabel?: string }) {
  return (
    <button
      type="button"
      className="help-icon"
      aria-label={ariaLabel}
      data-tooltip={tooltip}
      onClick={(event) => event.preventDefault()}
    >
      ?
    </button>
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

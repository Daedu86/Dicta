import type { DictationScript } from '../../core/adaptive/dictationScriptValidation';
import type { LanguageCode } from '../../core/adaptive/types';
import { formatDifficultyLabel, type Difficulty } from '../../core/config';
import { formatSupportedLanguage } from '../../core/languages';
import { formatCreatedDeviceIcon, formatCreatedDeviceTooltip, type CreatedDeviceKind } from '../../core/sessionDevice';
import { isSubmittedFinishedAttempt } from '../../core/sessionNormalization';

type SessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';
type SessionInputMode = 'input2' | 'input3';

type PendingSessionLaneSession = {
  id: string;
  name: string;
  inputMode: SessionInputMode;
  inputSettingsLocked: boolean;
  ttsLanguage: LanguageCode | null;
  kokoroLanguage: LanguageCode | null;
  difficulty: Difficulty;
  status: SessionStatus;
  createdDeviceKind: CreatedDeviceKind;
  createdDeviceLabel?: string;
  dictationScript: DictationScript | null;
};

export type PendingSessionLaneProps<Session extends PendingSessionLaneSession = PendingSessionLaneSession> = {
  sessions: Session[];
  activeSessionId: string | null;
  className?: string;
  onOpenSession: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
};

export function PendingSessionLane<Session extends PendingSessionLaneSession>({
  sessions,
  activeSessionId,
  className = '',
  onOpenSession,
  onDeleteSession,
}: PendingSessionLaneProps<Session>) {
  if (sessions.length === 0) return null;

  return (
    <section className={`pending-session-lane ${className}`.trim()} aria-label="Pending sessions">
      <div className="pending-session-lane-header">
        <div>
          <p className="dashboard-eyebrow">Pending sessions</p>
          <h3>Ready to perform</h3>
        </div>
        <span className="pending-session-count">{sessions.length}</span>
      </div>
      <div className="pending-session-strip">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`pending-session-chip ${session.id === activeSessionId ? 'pending-session-chip-active' : ''}`}
          >
            <button
              type="button"
              className="pending-session-open-button"
              onClick={() => onOpenSession(session)}
              title={`Open ${getSessionDisplayTitle(session)} in ${formatSessionInputMode(session.inputMode)}`}
            >
              <span className="pending-session-title">
                <SessionDeviceIcon session={session} />
                <span>{getSessionDisplayTitle(session)}</span>
              </span>
              <span className="pending-session-meta">
                {formatSessionInputMode(session.inputMode)} · {resolveStoredSessionLanguage(session).toUpperCase()} · {formatDifficultyLabel(session.difficulty)} · {getPendingSessionReason(session)}
              </span>
            </button>
            <button
              type="button"
              className="danger-button pending-session-delete-button"
              onClick={() => onDeleteSession(session.id)}
              aria-label={`Delete ${getSessionDisplayTitle(session)}`}
              title="Delete session"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SessionDeviceIcon({ session }: { session: PendingSessionLaneSession }) {
  const icon = formatCreatedDeviceIcon(session.createdDeviceKind);
  if (!icon) return null;
  return (
    <span className="session-device-icon" title={formatCreatedDeviceTooltip(session.createdDeviceKind, session.createdDeviceLabel)} aria-label={formatCreatedDeviceTooltip(session.createdDeviceKind, session.createdDeviceLabel)}>
      {icon}
    </span>
  );
}

function formatSessionInputMode(mode: SessionInputMode): string {
  if (mode === 'input2') return 'Browser TTS';
  if (mode === 'input3') return 'Kokoro local';
  return 'Removed legacy input';
}

function getPendingSessionReason(session: PendingSessionLaneSession): string {
  if (session.status === 'finished' && !isSubmittedFinishedAttempt(session)) {
    return 'stats pending';
  }
  if (!session.inputSettingsLocked) return 'setup pending';
  if (session.status === 'running') return 'running';
  if (session.status === 'paused') return 'paused';
  return 'perform pending';
}

function getSessionDisplayTitle(session: PendingSessionLaneSession): string {
  if (session.dictationScript) {
    return normalizeGeneratedDictationScriptTitle(session.dictationScript).title;
  }
  return session.name || 'Untitled session';
}

function resolveStoredSessionLanguage(session: PendingSessionLaneSession): LanguageCode {
  if (session.inputMode === 'input2') return session.ttsLanguage ?? 'unknown';
  if (session.inputMode === 'input3') return session.kokoroLanguage ?? 'unknown';
  return 'unknown';
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

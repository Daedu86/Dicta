import { useMemo, useState } from 'react';
import type { SessionTelemetry } from '../../types/dictation';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../core/sessionInputModes';

const INITIAL_SESSION_RENDER_LIMIT = 40;

type SessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';
type SessionInputMode = string;
type MetricsLanguageView = 'en' | 'es' | 'de' | 'fr' | 'pt' | 'all';

type AdminInventorySessionBase = {
  id: string;
  name: string;
  inputMode: SessionInputMode;
  updatedAt: string;
  ttsPracticeText: string;
  status: SessionStatus;
  telemetry: SessionTelemetry;
  [key: string]: unknown;
};

interface AdminSessionInventoryCardProps<TSession extends AdminInventorySessionBase> {
  sessions: TSession[];
  languageView: MetricsLanguageView;
  onExportSession: (session: TSession) => void;
  onCopySession: (session: TSession) => void;
}

type SessionInventoryRow<TSession extends AdminInventorySessionBase> = {
  session: TSession;
  inputModeLabel: string;
  statusLabel: string;
  updatedAtLabel: string;
  jsonSizeLabel: string;
  typedWordsLabel: string;
  telemetrySamplesLabel: string;
};

const sessionDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function countTelemetrySamples(telemetry: SessionTelemetry): number {
  return Math.max(
    telemetry.lagSeries.length,
    telemetry.wpmSeries.length,
    telemetry.accuracySeries.length,
  );
}

function countSessionTypedWords(session: AdminInventorySessionBase): number {
  const text = session.ttsPracticeText;
  return text.split(/\s+/).filter(Boolean).length;
}

function estimateJsonBytes(value: unknown): number {
  return byteSize(JSON.stringify(value));
}

function byteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KB`;
  return `${(kib / 1024).toFixed(2)} MB`;
}

function formatSessionInputMode(mode: SessionInputMode): string {
  if (mode === BROWSER_TTS_SESSION_INPUT_MODE) return 'Browser TTS';
  return 'Removed legacy input';
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

function formatSessionDate(value: string): string {
  return sessionDateFormatter.format(new Date(value));
}

function buildSessionInventoryRow<TSession extends AdminInventorySessionBase>(
  session: TSession,
): SessionInventoryRow<TSession> {
  return {
    session,
    inputModeLabel: formatSessionInputMode(session.inputMode),
    statusLabel: formatSessionStatus(session.status),
    updatedAtLabel: formatSessionDate(session.updatedAt),
    jsonSizeLabel: formatBytes(estimateJsonBytes(session)),
    typedWordsLabel: String(countSessionTypedWords(session)),
    telemetrySamplesLabel: String(countTelemetrySamples(session.telemetry)),
  };
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AdminSessionInventoryCard<TSession extends AdminInventorySessionBase>({
  sessions,
  languageView,
  onExportSession,
  onCopySession,
}: AdminSessionInventoryCardProps<TSession>) {
  const [showAllSessions, setShowAllSessions] = useState(false);
  const shouldLimitSessions = sessions.length > INITIAL_SESSION_RENDER_LIMIT;
  const visibleSessions = useMemo(
    () => (showAllSessions ? sessions : sessions.slice(0, INITIAL_SESSION_RENDER_LIMIT)),
    [sessions, showAllSessions],
  );
  const inventoryRows = useMemo(
    () => visibleSessions.map(buildSessionInventoryRow),
    [visibleSessions],
  );

  return (
    <section className="dashboard-card admin-card admin-card-wide">
      <div className="admin-card-header">
        <div>
          <h3>Session inventory ({languageView.toUpperCase()})</h3>
          <p>
            Per-session storage, practice text, and telemetry counts for the selected language.
            {shouldLimitSessions && !showAllSessions ? ` Showing first ${INITIAL_SESSION_RENDER_LIMIT} of ${sessions.length}.` : ''}
          </p>
        </div>
        {shouldLimitSessions ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowAllSessions((value) => !value)}
          >
            {showAllSessions ? `Show first ${INITIAL_SESSION_RENDER_LIMIT}` : `Show all ${sessions.length}`}
          </button>
        ) : null}
      </div>
      <div className="admin-session-list">
        {inventoryRows.map((row) => (
          <article key={row.session.id} className="admin-session-card">
            <div>
              <h4>{row.session.name || 'Untitled session'}</h4>
              <p>{row.inputModeLabel} · {row.statusLabel} · {row.updatedAtLabel}</p>
            </div>
            <div className="admin-session-metrics">
              <Metric label="JSON size" value={row.jsonSizeLabel} />
              <Metric label="Typed words" value={row.typedWordsLabel} />
              <Metric label="Telemetry" value={row.telemetrySamplesLabel} />
            </div>
            <div className="admin-actions">
              <button type="button" className="secondary-button" onClick={() => onExportSession(row.session)}>
                Export
              </button>
              <button type="button" className="secondary-button" onClick={() => onCopySession(row.session)}>
                Copy
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

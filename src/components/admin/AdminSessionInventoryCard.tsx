import type { SessionTelemetry } from '../../types/dictation';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../core/sessionInputModes';

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
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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
  return (
    <section className="dashboard-card admin-card">
      <div className="admin-card-header">
        <div>
          <h3>Session inventory ({languageView.toUpperCase()})</h3>
          <p>Per-session storage, practice text, and telemetry counts for the selected language.</p>
        </div>
      </div>
      <div className="admin-session-list">
        {sessions.map((session) => (
          <article key={session.id} className="admin-session-card">
            <div>
              <h4>{session.name || 'Untitled session'}</h4>
              <p>{formatSessionInputMode(session.inputMode)} · {formatSessionStatus(session.status)} · {formatSessionDate(session.updatedAt)}</p>
            </div>
            <div className="admin-session-metrics">
              <Metric label="JSON size" value={formatBytes(estimateJsonBytes(session))} />
              <Metric label="Typed words" value={String(countSessionTypedWords(session))} />
              <Metric label="Telemetry" value={String(countTelemetrySamples(session.telemetry))} />
            </div>
            <div className="admin-actions">
              <button type="button" className="secondary-button" onClick={() => onExportSession(session)}>
                Export
              </button>
              <button type="button" className="secondary-button" onClick={() => onCopySession(session)}>
                Copy
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

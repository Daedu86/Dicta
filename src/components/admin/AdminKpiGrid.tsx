type AdminStorageSummary = {
  sessionCount: number;
  finishedSessions: number;
  dictaLocalStorageBytes: number;
  totalTranscriptWords: number;
  telemetrySamples: number;
  telemetryActions: number;
  ttsChunks: number;
  blobAudioRefs: number;
  remoteAudioRefs: number;
};

type SupabaseSyncStatus = {
  enabled: boolean;
  state: 'disabled' | 'idle' | 'pulling' | 'pushing' | 'synced' | 'error';
  message: string;
  lastSyncedAt: string | null;
  imported: number;
  pushed: number;
};

type AdminKpiGridProps = {
  summary: AdminStorageSummary;
  syncStatus: SupabaseSyncStatus;
};

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatSupabaseSyncState(status: SupabaseSyncStatus): string {
  if (!status.enabled) return 'Off';
  if (status.state === 'pulling') return 'Pulling';
  if (status.state === 'pushing') return 'Pushing';
  if (status.state === 'error') return 'Error';
  if (status.state === 'synced') return 'Synced';
  return 'Ready';
}

function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1000000) return `${(bytes / 1000).toFixed(1)} kB`;
  if (bytes < 1000000000) return `${(bytes / 1000000).toFixed(1)} MB`;
  return `${(bytes / 1000000000).toFixed(1)} GB`;
}

export function AdminKpiGrid({ summary, syncStatus }: AdminKpiGridProps) {
  return (
    <div className="admin-kpi-grid">
      <Metric label="Sessions" value={String(summary.sessionCount)} />
      <Metric label="Finished" value={String(summary.finishedSessions)} />
      <Metric label="LocalStorage" value={formatBytes(summary.dictaLocalStorageBytes)} />
      <Metric label="Sync" value={formatSupabaseSyncState(syncStatus)} />
      <Metric label="Transcript words" value={String(summary.totalTranscriptWords)} />
      <Metric label="Telemetry samples" value={String(summary.telemetrySamples)} />
      <Metric label="Actions" value={String(summary.telemetryActions)} />
      <Metric label="TTS chunks" value={String(summary.ttsChunks)} />
      <Metric label="Audio refs" value={String(summary.blobAudioRefs + summary.remoteAudioRefs)} />
    </div>
  );
}

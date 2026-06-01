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

export type SyncStatusBannerProps = {
  syncStatus: SupabaseSyncStatus;
  pendingSyncSummary: PendingSyncSummary;
  isOnline: boolean;
};

export function SyncStatusBanner({ syncStatus, pendingSyncSummary, isOnline }: SyncStatusBannerProps) {
  const statusClass = !isOnline ? 'offline' : syncStatus.state;
  const primaryText = !isOnline
    ? 'Offline - results saved on this device'
    : syncStatus.enabled
      ? `Sync ${formatSupabaseSyncState(syncStatus).toLowerCase()}`
      : 'Cloud sync off';
  const pendingText = !syncStatus.enabled
    ? 'Local only'
    : pendingSyncSummary.hasPending
      ? `${pendingSyncSummary.count} local change${pendingSyncSummary.count === 1 ? '' : 's'} pending`
      : 'No local changes pending';
  const detailText = !syncStatus.enabled
    ? syncStatus.message
    : !isOnline
      ? 'Dictation continues locally. Sync resumes automatically when internet returns.'
      : syncStatus.lastSyncedAt
        ? `Last synced ${formatSessionDate(syncStatus.lastSyncedAt)}.`
        : 'Waiting for first sync.';

  return (
    <section className={`sync-status-banner sync-status-banner-${statusClass}`} aria-label="Offline and sync status">
      <div>
        <p className="sync-status-primary">{primaryText}</p>
        <p className="sync-status-detail">{detailText}</p>
      </div>
      <span className="sync-status-count">{pendingText}</span>
    </section>
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

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

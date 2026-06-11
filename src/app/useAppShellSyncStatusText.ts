import { useMemo } from 'react';

type SyncStatusWithSummary = {
  enabled: boolean;
  lastSyncedAt?: string | null;
};

type PendingSyncSummary = {
  hasPending: boolean;
  count: number;
};

type UseAppShellSyncStatusTextArgs<TSyncStatus extends SyncStatusWithSummary> = {
  isOnline: boolean;
  supabaseSyncStatus: TSyncStatus;
  pendingSyncSummary: PendingSyncSummary;
  formatSupabaseSyncState: (syncStatus: TSyncStatus) => string;
  formatSessionDate: (value: string) => string;
};

export function useAppShellSyncStatusText<TSyncStatus extends SyncStatusWithSummary>({
  isOnline,
  supabaseSyncStatus,
  pendingSyncSummary,
  formatSupabaseSyncState,
  formatSessionDate,
}: UseAppShellSyncStatusTextArgs<TSyncStatus>): string {
  return useMemo(() => {
    const syncStateText = isOnline ? formatSupabaseSyncState(supabaseSyncStatus) : 'Saved locally';
    const lastSyncedText = supabaseSyncStatus.lastSyncedAt ? ` · ${formatSessionDate(supabaseSyncStatus.lastSyncedAt)}` : '';
    const pendingText =
      supabaseSyncStatus.enabled && pendingSyncSummary.hasPending ? ` · ${pendingSyncSummary.count} pending` : '';

    return `${isOnline ? 'Sync' : 'Offline'}: ${syncStateText}${lastSyncedText}${pendingText}`;
  }, [
    isOnline,
    supabaseSyncStatus,
    pendingSyncSummary.hasPending,
    pendingSyncSummary.count,
    formatSupabaseSyncState,
    formatSessionDate,
  ]);
}

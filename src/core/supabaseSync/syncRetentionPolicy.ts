export const ACTIVE_SYNC_RETENTION_DAYS = 20 as const;
export const TOMBSTONE_RETENTION_DAYS = 30 as const;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getTombstoneExpiresAt(deletedAtIso: string): string {
  const deletedAtMs = Date.parse(deletedAtIso);
  const baseMs = Number.isFinite(deletedAtMs) ? deletedAtMs : Date.now();

  return new Date(baseMs + TOMBSTONE_RETENTION_DAYS * MS_PER_DAY).toISOString();
}

export function isSyncClientStale(lastSuccessfulSyncAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!lastSuccessfulSyncAt) return false;

  const lastSyncMs = Date.parse(lastSuccessfulSyncAt);
  if (!Number.isFinite(lastSyncMs)) return true;

  return lastSyncMs < nowMs - TOMBSTONE_RETENTION_DAYS * MS_PER_DAY;
}

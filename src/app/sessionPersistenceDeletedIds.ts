export const DELETED_SESSION_IDS_KEY = 'dicta.deletedSessionIds.v1';
export const DELETED_SESSION_IDS_PERSIST_LIMIT = 600;

export function loadDeletedSessionIds(storage: Storage = window.localStorage): Set<string> {
  const raw = storage.getItem(DELETED_SESSION_IDS_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === 'string' && value.length > 0));
  } catch {
    return new Set();
  }
}

export function persistDeletedSessionIds(ids: Set<string>, storage: Storage = window.localStorage): void {
  const normalized = [...ids].filter(Boolean).slice(-DELETED_SESSION_IDS_PERSIST_LIMIT);
  storage.setItem(DELETED_SESSION_IDS_KEY, JSON.stringify(normalized));
}

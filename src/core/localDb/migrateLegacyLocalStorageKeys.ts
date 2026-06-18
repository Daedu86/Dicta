export const SESSION_STORAGE_LEGACY_KEY = 'dicta.sessions.v1';
export const DELETED_SESSION_IDS_LEGACY_KEY = 'dicta.deletedSessionIds.v1';
export const ADAPTIVE_BENCHMARKS_LEGACY_KEY = 'dicta.adaptiveBenchmarks.v1';
export const ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY = 'dicta.adaptiveSessionFeedback.v1';
export const PROFILE_SCOPED_STORAGE_PREFIX = 'dicta.profileStorage.v1.';
export const LEGACY_PROFILE_SCOPED_STORAGE_ID = 'legacy-local';

export function profileScopedStorageKey(profileId: string): string {
  return `${PROFILE_SCOPED_STORAGE_PREFIX}${encodeURIComponent(profileId.trim())}`;
}

export function parseLegacyDeletedSessionIds(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === 'string' && value.length > 0));
  } catch {
    return new Set();
  }
}

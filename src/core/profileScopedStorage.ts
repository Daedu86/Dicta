export const PROFILE_SCOPED_STORAGE_MARKER_KEY = 'dicta.activeSyncProfileId.v1';
export const PROFILE_SCOPED_STORAGE_PREFIX = 'dicta.profileStorage.v1.';
export const LEGACY_PROFILE_SCOPED_STORAGE_ID = 'legacy-local';

export type ProfileScopedStorageSwitchResult = {
  changed: boolean;
  previousProfileId: string;
  activeProfileId: string;
};

export function readActiveSyncStorageProfileId(storage: Storage): string {
  return storage.getItem(PROFILE_SCOPED_STORAGE_MARKER_KEY)?.trim() ?? '';
}

export function switchProfileScopedStorage(
  storage: Storage,
  keys: readonly string[],
  nextProfileId: string,
): ProfileScopedStorageSwitchResult {
  const normalizedNextProfileId = nextProfileId.trim();
  const previousProfileId = readActiveSyncStorageProfileId(storage);
  if (previousProfileId === normalizedNextProfileId) {
    return {
      changed: false,
      previousProfileId,
      activeProfileId: previousProfileId,
    };
  }

  const previousSnapshot = captureProfileScopedStorage(storage, keys);
  if (previousProfileId) {
    storage.setItem(profileScopedStorageKey(previousProfileId), JSON.stringify(previousSnapshot));
  } else if (normalizedNextProfileId && Object.keys(previousSnapshot).length > 0) {
    const legacyStorageKey = profileScopedStorageKey(LEGACY_PROFILE_SCOPED_STORAGE_ID);
    if (!storage.getItem(legacyStorageKey)) {
      storage.setItem(legacyStorageKey, JSON.stringify(previousSnapshot));
    }
  }

  const nextSnapshot = normalizedNextProfileId ? readProfileScopedStorage(storage, normalizedNextProfileId) : {};
  restoreProfileScopedStorage(storage, keys, nextSnapshot);

  if (normalizedNextProfileId) {
    storage.setItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, normalizedNextProfileId);
  } else {
    storage.removeItem(PROFILE_SCOPED_STORAGE_MARKER_KEY);
  }

  return {
    changed: true,
    previousProfileId,
    activeProfileId: normalizedNextProfileId,
  };
}

export function profileScopedStorageKey(profileId: string): string {
  return `${PROFILE_SCOPED_STORAGE_PREFIX}${encodeURIComponent(profileId.trim())}`;
}

function captureProfileScopedStorage(storage: Storage, keys: readonly string[]): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const key of keys) {
    const value = storage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

function restoreProfileScopedStorage(storage: Storage, keys: readonly string[], snapshot: Record<string, string>): void {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      storage.setItem(key, snapshot[key]);
    } else {
      storage.removeItem(key);
    }
  }
}

function readProfileScopedStorage(storage: Storage, profileId: string): Record<string, string> {
  const raw = storage.getItem(profileScopedStorageKey(profileId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
}

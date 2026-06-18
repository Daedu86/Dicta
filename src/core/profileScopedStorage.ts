import {
  safeGetLocalStorageItem,
  safeRemoveLocalStorageItem,
  safeSetLocalStorageItem,
} from './storage/safeLocalStorage';

export const PROFILE_SCOPED_STORAGE_MARKER_KEY = 'dicta.activeSyncProfileId.v1';
export const PROFILE_SCOPED_STORAGE_PREFIX = 'dicta.profileStorage.v1.';
export const LEGACY_PROFILE_SCOPED_STORAGE_ID = 'legacy-local';

export type ProfileScopedStorageSwitchResult = {
  changed: boolean;
  previousProfileId: string;
  activeProfileId: string;
};

export function readActiveSyncStorageProfileId(storage: Storage): string {
  return safeGetLocalStorageItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, storage)?.trim() ?? '';
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
    safeSetLocalStorageItem(profileScopedStorageKey(previousProfileId), JSON.stringify(previousSnapshot), storage);
  } else if (normalizedNextProfileId && Object.keys(previousSnapshot).length > 0) {
    const legacyStorageKey = profileScopedStorageKey(LEGACY_PROFILE_SCOPED_STORAGE_ID);
    if (!safeGetLocalStorageItem(legacyStorageKey, storage)) {
      safeSetLocalStorageItem(legacyStorageKey, JSON.stringify(previousSnapshot), storage);
    }
  }

  const nextSnapshot = normalizedNextProfileId ? readProfileScopedStorage(storage, normalizedNextProfileId) : {};
  restoreProfileScopedStorage(storage, keys, nextSnapshot);

  if (normalizedNextProfileId) {
    safeSetLocalStorageItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, normalizedNextProfileId, storage);
  } else {
    safeRemoveLocalStorageItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, storage);
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
    const value = safeGetLocalStorageItem(key, storage);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

function restoreProfileScopedStorage(storage: Storage, keys: readonly string[], snapshot: Record<string, string>): void {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      safeSetLocalStorageItem(key, snapshot[key], storage);
    } else {
      safeRemoveLocalStorageItem(key, storage);
    }
  }
}

function readProfileScopedStorage(storage: Storage, profileId: string): Record<string, string> {
  const raw = safeGetLocalStorageItem(profileScopedStorageKey(profileId), storage);
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

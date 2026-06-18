import {
  ADAPTIVE_BENCHMARKS_LEGACY_KEY,
  ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY,
  DELETED_SESSION_IDS_LEGACY_KEY,
  LEGACY_PROFILE_SCOPED_STORAGE_ID,
  PROFILE_SCOPED_STORAGE_PREFIX,
  SESSION_STORAGE_LEGACY_KEY,
  parseLegacyDeletedSessionIds,
  profileScopedStorageKey,
} from './migrateLegacyLocalStorageKeys';
import { saveAdaptiveBenchmarks } from './adaptiveBenchmarkLocalStore';
import { saveAdaptiveSessionFeedback } from './adaptiveFeedbackLocalStore';
import {
  saveDeletedSessionIds,
  saveSessions,
} from './sessionLocalStore';
import {
  DICTA_INDEXEDDB_MIGRATION_MANIFEST_KEY,
  saveIndexedDbMigrationManifest,
  type IndexedDbMigrationManifest,
} from './localStorageManifest';
import { partitionSessionsByRetention } from '../../app/sessionRetentionPolicy';
import {
  safeGetLocalStorageItem,
  safeRemoveLocalStorageItem,
  safeSetLocalStorageItem,
} from '../storage/safeLocalStorage';

const BIG_LEGACY_KEYS = [
  SESSION_STORAGE_LEGACY_KEY,
  DELETED_SESSION_IDS_LEGACY_KEY,
  ADAPTIVE_BENCHMARKS_LEGACY_KEY,
  ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY,
] as const;

export type LegacyLocalStorageMigrationResult = {
  ok: boolean;
  migratedKeys: string[];
  skippedKeys: string[];
  failedKeys: string[];
};

export async function migrateLegacyLocalStorageToIndexedDb({
  profileId,
  storage = getWindowLocalStorage(),
  nowMs = Date.now(),
}: {
  profileId: string;
  storage?: Storage | null;
  nowMs?: number;
}): Promise<LegacyLocalStorageMigrationResult> {
  if (!storage || !profileId) {
    return { ok: true, migratedKeys: [], skippedKeys: [], failedKeys: [] };
  }

  const sources = collectLegacySources(profileId, storage);
  if (sources.length === 0) {
    return { ok: true, migratedKeys: [], skippedKeys: [], failedKeys: [] };
  }

  const merged = mergeLegacySources(sources);
  const skippedKeys = BIG_LEGACY_KEYS.filter((key) => merged[key] === undefined);
  const migratedKeys: string[] = [];
  const failedKeys: string[] = [];

  try {
    const deletedSessionIds = parseLegacyDeletedSessionIds(merged[DELETED_SESSION_IDS_LEGACY_KEY]);
    const sessions = parseLegacyArray(merged[SESSION_STORAGE_LEGACY_KEY]);
    if (sessions) {
      const { retainedSessions, expiredSessionIds } = partitionSessionsByRetention(sessions, nowMs);
      expiredSessionIds.forEach((sessionId) => deletedSessionIds.add(sessionId));
      await saveSessions(profileId, retainedSessions);
      migratedKeys.push(SESSION_STORAGE_LEGACY_KEY);
    }

    if (deletedSessionIds.size > 0 || merged[DELETED_SESSION_IDS_LEGACY_KEY] !== undefined) {
      await saveDeletedSessionIds(profileId, deletedSessionIds, nowMs);
      migratedKeys.push(DELETED_SESSION_IDS_LEGACY_KEY);
    }

    const benchmarks = parseLegacyObject(merged[ADAPTIVE_BENCHMARKS_LEGACY_KEY]);
    if (benchmarks) {
      await saveAdaptiveBenchmarks(profileId, benchmarks);
      migratedKeys.push(ADAPTIVE_BENCHMARKS_LEGACY_KEY);
    }

    const feedback = parseLegacyObject(merged[ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY]);
    if (feedback) {
      await saveAdaptiveSessionFeedback(profileId, feedback);
      migratedKeys.push(ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY);
    }

    const manifest: IndexedDbMigrationManifest = {
      version: 1,
      migratedAt: new Date(nowMs).toISOString(),
      migratedKeys: [...new Set(migratedKeys)],
      skippedKeys,
      failedKeys,
    };
    await saveIndexedDbMigrationManifest(manifest, storage);
    removeMigratedLegacyKeys(profileId, storage, manifest.migratedKeys);
    return { ok: true, migratedKeys: manifest.migratedKeys, skippedKeys, failedKeys };
  } catch (error) {
    console.warn('[DictaStorage] IndexedDB legacy migration failed; preserving localStorage payloads.', error);
    return {
      ok: false,
      migratedKeys,
      skippedKeys,
      failedKeys: BIG_LEGACY_KEYS.filter((key) => merged[key] !== undefined && !migratedKeys.includes(key)),
    };
  }
}

function collectLegacySources(profileId: string, storage: Storage): Array<Record<string, string>> {
  const sources: Array<Record<string, string>> = [];
  const activeSnapshot = readDirectLegacySnapshot(storage);
  if (Object.keys(activeSnapshot).length > 0) sources.push(activeSnapshot);

  const profileSnapshot = readProfileSnapshot(storage, profileId);
  if (Object.keys(profileSnapshot).length > 0) sources.push(profileSnapshot);

  const legacySnapshot = readProfileSnapshot(storage, LEGACY_PROFILE_SCOPED_STORAGE_ID);
  if (profileId === LEGACY_PROFILE_SCOPED_STORAGE_ID && Object.keys(legacySnapshot).length > 0) {
    sources.push(legacySnapshot);
  }
  return sources;
}

function mergeLegacySources(sources: Array<Record<string, string>>): Partial<Record<(typeof BIG_LEGACY_KEYS)[number], string>> {
  return Object.assign({}, ...sources) as Partial<Record<(typeof BIG_LEGACY_KEYS)[number], string>>;
}

function readDirectLegacySnapshot(storage: Storage): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const key of BIG_LEGACY_KEYS) {
    const value = safeGetLocalStorageItem(key, storage);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

function readProfileSnapshot(storage: Storage, profileId: string): Record<string, string> {
  const raw = safeGetLocalStorageItem(profileScopedStorageKey(profileId), storage);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [(typeof BIG_LEGACY_KEYS)[number], string] =>
          BIG_LEGACY_KEYS.includes(entry[0] as (typeof BIG_LEGACY_KEYS)[number]) && typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

function removeMigratedLegacyKeys(profileId: string, storage: Storage, migratedKeys: string[]): void {
  for (const key of migratedKeys) {
    safeRemoveLocalStorageItem(key, storage);
  }
  removeKeysFromProfileSnapshot(storage, profileId, migratedKeys);
  if (profileId === LEGACY_PROFILE_SCOPED_STORAGE_ID) {
    removeKeysFromProfileSnapshot(storage, LEGACY_PROFILE_SCOPED_STORAGE_ID, migratedKeys);
  }
}

function removeKeysFromProfileSnapshot(storage: Storage, profileId: string, migratedKeys: string[]): void {
  const key = profileScopedStorageKey(profileId);
  const raw = safeGetLocalStorageItem(key, storage);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    const snapshot = { ...parsed } as Record<string, unknown>;
    for (const migratedKey of migratedKeys) {
      delete snapshot[migratedKey];
    }
    const remainingEntries = Object.entries(snapshot).filter(([, value]) => typeof value === 'string');
    if (remainingEntries.length === 0) {
      safeRemoveLocalStorageItem(key, storage);
      return;
    }
    safeSetLocalStorageItem(key, JSON.stringify(Object.fromEntries(remainingEntries)), storage);
  } catch {
    return;
  }
}

function parseLegacyArray(raw: string | undefined): Array<{ id: string; status: string; updatedAt?: string; createdAt?: string; telemetry?: { finishedAt?: string } }> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is { id: string; status: string; updatedAt?: string; createdAt?: string; telemetry?: { finishedAt?: string } } =>
      Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'),
    );
  } catch {
    return null;
  }
}

function parseLegacyObject(raw: string | undefined): Record<string, Record<string, unknown>> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, Record<string, unknown>>;
  } catch {
    return null;
  }
}

function getWindowLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export {
  ADAPTIVE_BENCHMARKS_LEGACY_KEY,
  ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY,
  DELETED_SESSION_IDS_LEGACY_KEY,
  DICTA_INDEXEDDB_MIGRATION_MANIFEST_KEY,
  PROFILE_SCOPED_STORAGE_PREFIX,
  SESSION_STORAGE_LEGACY_KEY,
};

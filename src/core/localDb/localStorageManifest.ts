import { getDictaLocalDbAdapter } from './dictaLocalDb';
import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
} from '../storage/safeLocalStorage';

export const DICTA_INDEXEDDB_MIGRATION_MANIFEST_KEY = 'dicta.indexedDbMigration.v1';

export type IndexedDbMigrationManifest = {
  version: 1;
  migratedAt: string;
  migratedKeys: string[];
  skippedKeys?: string[];
  failedKeys?: string[];
};

export function readIndexedDbMigrationManifestFromLocalStorage(
  storage: Storage | null | undefined = getWindowLocalStorage(),
): IndexedDbMigrationManifest | null {
  const raw = safeGetLocalStorageItem(DICTA_INDEXEDDB_MIGRATION_MANIFEST_KEY, storage);
  if (!raw) return null;
  return normalizeManifest(raw);
}

export async function readIndexedDbMigrationManifest(): Promise<IndexedDbMigrationManifest | null> {
  const record = await getDictaLocalDbAdapter().loadManifest<IndexedDbMigrationManifest>(
    DICTA_INDEXEDDB_MIGRATION_MANIFEST_KEY,
  );
  return record?.value ?? readIndexedDbMigrationManifestFromLocalStorage();
}

export async function saveIndexedDbMigrationManifest(
  manifest: IndexedDbMigrationManifest,
  storage: Storage | null | undefined = getWindowLocalStorage(),
): Promise<void> {
  await getDictaLocalDbAdapter().saveManifest({
    key: DICTA_INDEXEDDB_MIGRATION_MANIFEST_KEY,
    updatedAt: manifest.migratedAt,
    value: manifest,
  });
  safeSetLocalStorageItem(DICTA_INDEXEDDB_MIGRATION_MANIFEST_KEY, JSON.stringify(manifest), storage);
}

function normalizeManifest(raw: string): IndexedDbMigrationManifest | null {
  try {
    const parsed = JSON.parse(raw) as Partial<IndexedDbMigrationManifest>;
    if (parsed.version !== 1 || typeof parsed.migratedAt !== 'string' || !Array.isArray(parsed.migratedKeys)) {
      return null;
    }
    return {
      version: 1,
      migratedAt: parsed.migratedAt,
      migratedKeys: parsed.migratedKeys.filter((key): key is string => typeof key === 'string'),
      skippedKeys: Array.isArray(parsed.skippedKeys)
        ? parsed.skippedKeys.filter((key): key is string => typeof key === 'string')
        : undefined,
      failedKeys: Array.isArray(parsed.failedKeys)
        ? parsed.failedKeys.filter((key): key is string => typeof key === 'string')
        : undefined,
    };
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

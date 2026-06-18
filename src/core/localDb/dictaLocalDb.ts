import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const DICTA_LOCAL_DB_NAME = 'dicta-local';
export const DICTA_LOCAL_DB_VERSION = 1;

export const DICTA_LOCAL_DB_STORES = {
  sessions: 'sessions',
  adaptiveBenchmarks: 'adaptiveBenchmarks',
  adaptiveSessionFeedback: 'adaptiveSessionFeedback',
  syncTombstones: 'syncTombstones',
  storageManifest: 'storageManifest',
} as const;

export type DictaLocalDbSessionRecord<TPayload = unknown> = {
  id: string;
  profileId: string;
  updatedAt: string;
  status: string;
  activityAt: string;
  payload: TPayload;
};

export type DictaLocalDbAdaptiveBenchmarkRecord<TPayload = unknown> = {
  id: string;
  profileId: string;
  inputMode: string;
  language: string;
  updatedAt: string;
  payload: TPayload;
};

export type DictaLocalDbAdaptiveFeedbackRecord<TPayload = unknown> = {
  id: string;
  profileId: string;
  inputMode: string;
  language: string;
  sessionId: string;
  updatedAt: string;
  payload: TPayload;
};

export type DictaLocalDbTombstoneRecord = {
  id: string;
  profileId: string;
  itemKey: string;
  itemType: 'session';
  deletedAt: string;
  tombstoneExpiresAt: string;
};

export type DictaLocalDbManifestRecord<TValue = unknown> = {
  key: string;
  updatedAt: string;
  value: TValue;
};

interface DictaLocalDbSchema extends DBSchema {
  sessions: {
    key: string;
    value: DictaLocalDbSessionRecord;
    indexes: {
      profileId: string;
      updatedAt: string;
      status: string;
      activityAt: string;
    };
  };
  adaptiveBenchmarks: {
    key: string;
    value: DictaLocalDbAdaptiveBenchmarkRecord;
    indexes: {
      profileId: string;
      updatedAt: string;
      inputMode: string;
      language: string;
    };
  };
  adaptiveSessionFeedback: {
    key: string;
    value: DictaLocalDbAdaptiveFeedbackRecord;
    indexes: {
      profileId: string;
      sessionId: string;
      updatedAt: string;
    };
  };
  syncTombstones: {
    key: string;
    value: DictaLocalDbTombstoneRecord;
    indexes: {
      profileId: string;
      deletedAt: string;
      tombstoneExpiresAt: string;
    };
  };
  storageManifest: {
    key: string;
    value: DictaLocalDbManifestRecord;
  };
}

type ProfileStoreName = 'sessions' | 'adaptiveBenchmarks' | 'adaptiveSessionFeedback' | 'syncTombstones';

let dbPromise: Promise<IDBPDatabase<DictaLocalDbSchema>> | null = null;
let testAdapter: DictaLocalDbAdapter | null = null;

export type DictaLocalDbAdapter = {
  loadSessions: (profileId: string) => Promise<DictaLocalDbSessionRecord[]>;
  replaceSessions: (profileId: string, records: DictaLocalDbSessionRecord[]) => Promise<void>;
  upsertSessions: (records: DictaLocalDbSessionRecord[]) => Promise<void>;
  deleteSession: (profileId: string, sessionId: string) => Promise<void>;
  loadAdaptiveBenchmarks: (profileId: string) => Promise<DictaLocalDbAdaptiveBenchmarkRecord[]>;
  replaceAdaptiveBenchmarks: (profileId: string, records: DictaLocalDbAdaptiveBenchmarkRecord[]) => Promise<void>;
  loadAdaptiveFeedback: (profileId: string) => Promise<DictaLocalDbAdaptiveFeedbackRecord[]>;
  replaceAdaptiveFeedback: (profileId: string, records: DictaLocalDbAdaptiveFeedbackRecord[]) => Promise<void>;
  loadTombstones: (profileId: string) => Promise<DictaLocalDbTombstoneRecord[]>;
  replaceTombstones: (profileId: string, records: DictaLocalDbTombstoneRecord[]) => Promise<void>;
  loadManifest: <TValue>(key: string) => Promise<DictaLocalDbManifestRecord<TValue> | null>;
  saveManifest: <TValue>(record: DictaLocalDbManifestRecord<TValue>) => Promise<void>;
};

export function getDictaLocalDbAdapter(): DictaLocalDbAdapter {
  return testAdapter ?? indexedDbAdapter;
}

export function setDictaLocalDbAdapterForTests(adapter: DictaLocalDbAdapter | null): void {
  testAdapter = adapter;
}

export function createMemoryDictaLocalDbAdapter(): DictaLocalDbAdapter {
  const sessions = new Map<string, DictaLocalDbSessionRecord>();
  const benchmarks = new Map<string, DictaLocalDbAdaptiveBenchmarkRecord>();
  const feedback = new Map<string, DictaLocalDbAdaptiveFeedbackRecord>();
  const tombstones = new Map<string, DictaLocalDbTombstoneRecord>();
  const manifests = new Map<string, DictaLocalDbManifestRecord>();

  return {
    loadSessions: async (profileId) => [...sessions.values()].filter((record) => record.profileId === profileId),
    replaceSessions: async (profileId, records) => {
      deleteByProfile(sessions, profileId);
      records.forEach((record) => sessions.set(record.id, record));
    },
    upsertSessions: async (records) => {
      records.forEach((record) => sessions.set(record.id, record));
    },
    deleteSession: async (profileId, sessionId) => {
      sessions.delete(sessionRecordId(profileId, sessionId));
    },
    loadAdaptiveBenchmarks: async (profileId) =>
      [...benchmarks.values()].filter((record) => record.profileId === profileId),
    replaceAdaptiveBenchmarks: async (profileId, records) => {
      deleteByProfile(benchmarks, profileId);
      records.forEach((record) => benchmarks.set(record.id, record));
    },
    loadAdaptiveFeedback: async (profileId) => [...feedback.values()].filter((record) => record.profileId === profileId),
    replaceAdaptiveFeedback: async (profileId, records) => {
      deleteByProfile(feedback, profileId);
      records.forEach((record) => feedback.set(record.id, record));
    },
    loadTombstones: async (profileId) => [...tombstones.values()].filter((record) => record.profileId === profileId),
    replaceTombstones: async (profileId, records) => {
      deleteByProfile(tombstones, profileId);
      records.forEach((record) => tombstones.set(record.id, record));
    },
    loadManifest: async <TValue>(key: string) =>
      (manifests.get(key) as DictaLocalDbManifestRecord<TValue> | undefined) ?? null,
    saveManifest: async (record) => {
      manifests.set(record.key, record);
    },
  };
}

export function sessionRecordId(profileId: string, sessionId: string): string {
  return `${profileId}:${sessionId}`;
}

export function adaptiveBenchmarkRecordId(profileId: string, inputMode: string, language: string): string {
  return `${profileId}:${inputMode}:${language}`;
}

export function adaptiveFeedbackRecordId(
  profileId: string,
  inputMode: string,
  language: string,
  sessionId: string,
): string {
  return `${profileId}:${inputMode}:${language}:${sessionId}`;
}

export function tombstoneRecordId(profileId: string, itemKey: string): string {
  return `${profileId}:session:${itemKey}`;
}

async function getDb(): Promise<IDBPDatabase<DictaLocalDbSchema>> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable in this environment.');
  }
  dbPromise ??= openDB<DictaLocalDbSchema>(DICTA_LOCAL_DB_NAME, DICTA_LOCAL_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(DICTA_LOCAL_DB_STORES.sessions)) {
        const store = db.createObjectStore(DICTA_LOCAL_DB_STORES.sessions, { keyPath: 'id' });
        store.createIndex('profileId', 'profileId');
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('status', 'status');
        store.createIndex('activityAt', 'activityAt');
      }
      if (!db.objectStoreNames.contains(DICTA_LOCAL_DB_STORES.adaptiveBenchmarks)) {
        const store = db.createObjectStore(DICTA_LOCAL_DB_STORES.adaptiveBenchmarks, { keyPath: 'id' });
        store.createIndex('profileId', 'profileId');
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('inputMode', 'inputMode');
        store.createIndex('language', 'language');
      }
      if (!db.objectStoreNames.contains(DICTA_LOCAL_DB_STORES.adaptiveSessionFeedback)) {
        const store = db.createObjectStore(DICTA_LOCAL_DB_STORES.adaptiveSessionFeedback, { keyPath: 'id' });
        store.createIndex('profileId', 'profileId');
        store.createIndex('sessionId', 'sessionId');
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(DICTA_LOCAL_DB_STORES.syncTombstones)) {
        const store = db.createObjectStore(DICTA_LOCAL_DB_STORES.syncTombstones, { keyPath: 'id' });
        store.createIndex('profileId', 'profileId');
        store.createIndex('deletedAt', 'deletedAt');
        store.createIndex('tombstoneExpiresAt', 'tombstoneExpiresAt');
      }
      if (!db.objectStoreNames.contains(DICTA_LOCAL_DB_STORES.storageManifest)) {
        db.createObjectStore(DICTA_LOCAL_DB_STORES.storageManifest, { keyPath: 'key' });
      }
    },
  });
  return dbPromise;
}

const indexedDbAdapter: DictaLocalDbAdapter = {
  loadSessions: async (profileId) =>
    getAllByProfile<DictaLocalDbSessionRecord>(DICTA_LOCAL_DB_STORES.sessions, profileId),
  replaceSessions: async (profileId, records) => replaceByProfile(DICTA_LOCAL_DB_STORES.sessions, profileId, records),
  upsertSessions: async (records) => putRecords(DICTA_LOCAL_DB_STORES.sessions, records),
  deleteSession: async (profileId, sessionId) => {
    const db = await getDb();
    await db.delete(DICTA_LOCAL_DB_STORES.sessions, sessionRecordId(profileId, sessionId));
  },
  loadAdaptiveBenchmarks: async (profileId) =>
    getAllByProfile<DictaLocalDbAdaptiveBenchmarkRecord>(DICTA_LOCAL_DB_STORES.adaptiveBenchmarks, profileId),
  replaceAdaptiveBenchmarks: async (profileId, records) =>
    replaceByProfile(DICTA_LOCAL_DB_STORES.adaptiveBenchmarks, profileId, records),
  loadAdaptiveFeedback: async (profileId) =>
    getAllByProfile<DictaLocalDbAdaptiveFeedbackRecord>(DICTA_LOCAL_DB_STORES.adaptiveSessionFeedback, profileId),
  replaceAdaptiveFeedback: async (profileId, records) =>
    replaceByProfile(DICTA_LOCAL_DB_STORES.adaptiveSessionFeedback, profileId, records),
  loadTombstones: async (profileId) =>
    getAllByProfile<DictaLocalDbTombstoneRecord>(DICTA_LOCAL_DB_STORES.syncTombstones, profileId),
  replaceTombstones: async (profileId, records) =>
    replaceByProfile(DICTA_LOCAL_DB_STORES.syncTombstones, profileId, records),
  loadManifest: async <TValue>(key: string) => {
    const db = await getDb();
    return ((await db.get(DICTA_LOCAL_DB_STORES.storageManifest, key)) as DictaLocalDbManifestRecord<TValue> | undefined) ?? null;
  },
  saveManifest: async (record) => {
    const db = await getDb();
    await db.put(DICTA_LOCAL_DB_STORES.storageManifest, record);
  },
};

async function getAllByProfile<TRecord extends { profileId: string }>(
  storeName: ProfileStoreName,
  profileId: string,
): Promise<TRecord[]> {
  const db = await getDb();
  return (await db.getAllFromIndex(storeName, 'profileId', profileId)) as unknown as TRecord[];
}

async function replaceByProfile<TRecord extends { id: string; profileId: string }>(
  storeName: ProfileStoreName,
  profileId: string,
  records: TRecord[],
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(storeName, 'readwrite');
  const existing = (await tx.store.index('profileId').getAllKeys(profileId)) as IDBValidKey[];
  await Promise.all(existing.map((key) => tx.store.delete(String(key))));
  await Promise.all(records.map((record) => tx.store.put(record as never)));
  await tx.done;
}

async function putRecords<TRecord extends { id: string }>(
  storeName: ProfileStoreName,
  records: TRecord[],
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all(records.map((record) => tx.store.put(record as never)));
  await tx.done;
}

function deleteByProfile<TRecord extends { profileId: string }>(records: Map<string, TRecord>, profileId: string): void {
  for (const [id, record] of records) {
    if (record.profileId === profileId) records.delete(id);
  }
}

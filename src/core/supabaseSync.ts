import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const DICTA_SYNC_TABLE = 'dicta_sync_items';

export type DictaSyncItemType = 'session' | 'benchmark' | 'feedback';

export type DictaSyncRow = {
  profile_id: string;
  item_type: DictaSyncItemType;
  item_key: string;
  payload: unknown;
  updated_at: string;
};

export type DictaSyncItem = {
  itemType: DictaSyncItemType;
  itemKey: string;
  payload: unknown;
  updatedAt: string;
};

export type DictaSyncConfig = {
  enabled: boolean;
  url: string;
  anonKey: string;
  profileId: string;
};

export type DictaSyncState = {
  sessions: unknown[];
  benchmarks: Record<string, Record<string, unknown>>;
  feedback: Record<string, Record<string, unknown[]>>;
};

export type DictaSyncMergeResult = DictaSyncState & {
  changed: boolean;
  imported: number;
  skipped: number;
};

export function getDictaSyncConfig(env: Record<string, string | undefined>): DictaSyncConfig {
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  const profileId = env.VITE_SUPABASE_SYNC_PROFILE_ID?.trim() ?? '';
  return {
    enabled: Boolean(url && anonKey && profileId),
    url,
    anonKey,
    profileId,
  };
}

export function createDictaSupabaseClient(config: DictaSyncConfig): SupabaseClient | null {
  if (!config.enabled) return null;
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function buildSyncItems(state: DictaSyncState): DictaSyncItem[] {
  const items: DictaSyncItem[] = [];

  for (const session of state.sessions) {
    const record = asRecord(session);
    const id = typeof record.id === 'string' ? record.id : '';
    if (!id) continue;
    items.push({
      itemType: 'session',
      itemKey: id,
      payload: session,
      updatedAt: timestampFrom(record.updatedAt) ?? new Date(0).toISOString(),
    });
  }

  for (const [inputMode, byLanguage] of Object.entries(state.benchmarks)) {
    if (!isRecord(byLanguage)) continue;
    for (const [language, benchmark] of Object.entries(byLanguage)) {
      const record = asRecord(benchmark);
      items.push({
        itemType: 'benchmark',
        itemKey: `${inputMode}:${language}`,
        payload: benchmark,
        updatedAt: timestampFrom(record.lastUpdatedAt) ?? new Date(0).toISOString(),
      });
    }
  }

  for (const byLanguage of Object.values(state.feedback)) {
    if (!isRecord(byLanguage)) continue;
    for (const feedbackList of Object.values(byLanguage)) {
      if (!Array.isArray(feedbackList)) continue;
      for (const feedback of feedbackList) {
        const record = asRecord(feedback);
        const sessionId = typeof record.sessionId === 'string' ? record.sessionId : '';
        if (!sessionId) continue;
        items.push({
          itemType: 'feedback',
          itemKey: sessionId,
          payload: feedback,
          updatedAt: timestampFrom(record.completedAt) ?? timestampFrom(record.createdAt) ?? new Date(0).toISOString(),
        });
      }
    }
  }

  return items;
}

export function toSyncRows(profileId: string, items: DictaSyncItem[]): DictaSyncRow[] {
  return items.map((item) => ({
    profile_id: profileId,
    item_type: item.itemType,
    item_key: item.itemKey,
    payload: item.payload,
    updated_at: item.updatedAt,
  }));
}

export function mergeSyncRows(local: DictaSyncState, rows: DictaSyncRow[]): DictaSyncMergeResult {
  let changed = false;
  let imported = 0;
  let skipped = 0;
  const sessionsById = new Map<string, unknown>();
  for (const session of local.sessions) {
    const id = getStringField(session, 'id');
    if (id) sessionsById.set(id, session);
  }

  const benchmarks: Record<string, Record<string, unknown>> = cloneNestedRecord(local.benchmarks);
  const feedback: Record<string, Record<string, unknown[]>> = cloneFeedbackRecord(local.feedback);

  for (const row of rows) {
    if (!isValidSyncRow(row)) {
      skipped += 1;
      continue;
    }

    if (row.item_type === 'session') {
      const remote = asRecord(row.payload);
      const id = typeof remote.id === 'string' ? remote.id : '';
      if (!id || id !== row.item_key) {
        skipped += 1;
        continue;
      }
      const localSession = sessionsById.get(id);
      if (!localSession || isRemoteNewer(row, localSession, ['updatedAt'])) {
        sessionsById.set(id, row.payload);
        changed = true;
        imported += 1;
      }
      continue;
    }

    if (row.item_type === 'benchmark') {
      const [inputMode, language] = splitBenchmarkKey(row.item_key);
      if (!inputMode || !language) {
        skipped += 1;
        continue;
      }
      const localBenchmark = benchmarks[inputMode]?.[language];
      if (!localBenchmark || isRemoteNewer(row, localBenchmark, ['lastUpdatedAt'])) {
        benchmarks[inputMode] = {
          ...(benchmarks[inputMode] ?? {}),
          [language]: row.payload,
        };
        changed = true;
        imported += 1;
      }
      continue;
    }

    const sessionId = row.item_key;
    const remoteSessionId = getStringField(row.payload, 'sessionId');
    const inputMode = getStringField(row.payload, 'inputMode');
    const language = getStringField(row.payload, 'language');
    if (!inputMode || !language || !sessionId || remoteSessionId !== sessionId) {
      skipped += 1;
      continue;
    }
    const inputFeedback = feedback[inputMode] ?? {};
    const languageFeedback = inputFeedback[language] ?? [];
    const index = languageFeedback.findIndex((item) => getStringField(item, 'sessionId') === sessionId);
    const localFeedback = index >= 0 ? languageFeedback[index] : null;
    if (!localFeedback || isRemoteNewer(row, localFeedback, ['completedAt', 'createdAt'])) {
      const nextLanguageFeedback = [...languageFeedback];
      if (index >= 0) {
        nextLanguageFeedback[index] = row.payload;
      } else {
        nextLanguageFeedback.push(row.payload);
      }
      nextLanguageFeedback.sort((a, b) => compareTimestamp(getFeedbackTimestamp(b), getFeedbackTimestamp(a)));
      feedback[inputMode] = {
        ...inputFeedback,
        [language]: nextLanguageFeedback.slice(0, 12),
      };
      changed = true;
      imported += 1;
    }
  }

  return {
    sessions: Array.from(sessionsById.values()).sort((a, b) => compareTimestamp(getStringField(b, 'updatedAt'), getStringField(a, 'updatedAt'))),
    benchmarks,
    feedback,
    changed,
    imported,
    skipped,
  };
}

export async function pullSyncRows(client: SupabaseClient, profileId: string): Promise<DictaSyncRow[]> {
  const { data, error } = await client
    .from(DICTA_SYNC_TABLE)
    .select('profile_id,item_type,item_key,payload,updated_at')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DictaSyncRow[];
}

export async function pushSyncRows(client: SupabaseClient, profileId: string, state: DictaSyncState): Promise<number> {
  const rows = toSyncRows(profileId, buildSyncItems(state));
  if (rows.length === 0) return 0;
  const { error } = await client.from(DICTA_SYNC_TABLE).upsert(rows, {
    onConflict: 'profile_id,item_type,item_key',
  });
  if (error) throw error;
  return rows.length;
}

export async function deleteSessionSyncRow(client: SupabaseClient, profileId: string, sessionId: string): Promise<void> {
  const { error } = await client
    .from(DICTA_SYNC_TABLE)
    .delete()
    .eq('profile_id', profileId)
    .eq('item_type', 'session')
    .eq('item_key', sessionId);
  if (error) throw error;
}

function isValidSyncRow(row: DictaSyncRow): boolean {
  return (
    typeof row.profile_id === 'string' &&
    (row.item_type === 'session' || row.item_type === 'benchmark' || row.item_type === 'feedback') &&
    typeof row.item_key === 'string' &&
    row.item_key.length > 0 &&
    isRecord(row.payload) &&
    Boolean(timestampFrom(row.updated_at))
  );
}

function isRemoteNewer(row: DictaSyncRow, localPayload: unknown, localFields: string[]): boolean {
  const localRecord = asRecord(localPayload);
  const localTimestamp =
    localFields.map((field) => timestampFrom(localRecord[field])).find((value): value is string => Boolean(value)) ?? new Date(0).toISOString();
  return compareTimestamp(row.updated_at, localTimestamp) > 0;
}

function getFeedbackTimestamp(value: unknown): string {
  const record = asRecord(value);
  return timestampFrom(record.completedAt) ?? timestampFrom(record.createdAt) ?? new Date(0).toISOString();
}

function timestampFrom(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function compareTimestamp(a: string, b: string): number {
  const aTime = new Date(a).getTime();
  const bTime = new Date(b).getTime();
  return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
}

function getStringField(value: unknown, field: string): string {
  const record = asRecord(value);
  return typeof record[field] === 'string' ? record[field] : '';
}

function splitBenchmarkKey(key: string): [string, string] {
  const parts = key.split(':');
  return parts.length === 2 ? [parts[0], parts[1]] : ['', ''];
}

function cloneNestedRecord(input: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, { ...value }]));
}

function cloneFeedbackRecord(input: Record<string, Record<string, unknown[]>>): Record<string, Record<string, unknown[]>> {
  return Object.fromEntries(
    Object.entries(input).map(([inputMode, byLanguage]) => [
      inputMode,
      Object.fromEntries(Object.entries(byLanguage).map(([language, list]) => [language, [...list]])),
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

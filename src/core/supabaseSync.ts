import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSubmittedFinishedAttempt } from './sessionNormalization';
import { computeSessionScore } from './sessionScore';

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
  authRequired: boolean;
  url: string;
  anonKey: string;
  profileId: string;
  legacyProfileId: string;
};

export type DictaSyncState = {
  sessions: unknown[];
  benchmarks: Record<string, Record<string, unknown>>;
  feedback: Record<string, Record<string, unknown[]>>;
};

export const DICTA_SUPABASE_AUTH_OPTIONS = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
} as const;

export type DictaSyncMergeResult = DictaSyncState & {
  changed: boolean;
  imported: number;
  skipped: number;
  deletedSessionIds: string[];
};

type CompletedFeedbackEvidence = {
  sessionId: string;
  completedAt: string;
  startedAt: string | null;
  lagSeries: number[];
  wpmSeries: number[];
  accuracySeries: number[];
  lagSec: number | null;
  wpm: number | null;
  accuracy: number | null;
  rate: number | null;
};

export type PullSyncRowsOptions = {
  updatedAfter?: string | null;
};

export type PushSyncRowsResult = {
  pushed: number;
  pushedRows: DictaSyncRow[];
};

export type PushSyncRowsOptions = {
  existingRows?: DictaSyncRow[] | null;
};

export function getDictaSyncConfig(env: Record<string, string | undefined>): DictaSyncConfig {
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  const profileId = env.VITE_SUPABASE_SYNC_PROFILE_ID?.trim() ?? '';
  return {
    enabled: Boolean(url && anonKey && profileId),
    authRequired: Boolean(url && anonKey),
    url,
    anonKey,
    profileId,
    legacyProfileId: profileId,
  };
}

export function createDictaSupabaseClient(config: DictaSyncConfig): SupabaseClient | null {
  if (!config.url || !config.anonKey) return null;
  return createClient(config.url, config.anonKey, {
    auth: DICTA_SUPABASE_AUTH_OPTIONS,
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
  const completedFeedbackBySessionId = collectCompletedFeedbackEvidence(rows);
  const sessionsById = new Map<string, unknown>();
  for (const session of local.sessions) {
    const id = getStringField(session, 'id');
    if (id) sessionsById.set(id, session);
  }

  const benchmarks: Record<string, Record<string, unknown>> = cloneNestedRecord(local.benchmarks);
  const feedback: Record<string, Record<string, unknown[]>> = cloneFeedbackRecord(local.feedback);
  const deletedSessionIds = new Set<string>();

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
      if (hasMalformedDeletedFlag(remote)) {
        skipped += 1;
        continue;
      }
      if (isSessionTombstonePayload(remote)) {
        const localSession = sessionsById.get(id);
        if (localSession && !shouldLocalSessionSurviveRemoteTombstone(row, localSession)) {
          deletedSessionIds.add(id);
          sessionsById.delete(id);
          changed = true;
          imported += 1;
        } else if (!localSession) {
          deletedSessionIds.add(id);
        }
        continue;
      }
      const localSession = sessionsById.get(id);
      if (!localSession || shouldRemoteSessionReplaceLocal(row, localSession)) {
        sessionsById.set(id, repairPendingSessionFromCompletedFeedback(row.payload, completedFeedbackBySessionId.get(id)));
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

  for (const [sessionId, session] of sessionsById) {
    const repairedSession = repairPendingSessionFromCompletedFeedback(session, completedFeedbackBySessionId.get(sessionId));
    if (repairedSession !== session) {
      sessionsById.set(sessionId, repairedSession);
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
    deletedSessionIds: [...deletedSessionIds],
  };
}

export async function pullSyncRows(client: SupabaseClient, profileId: string, options: PullSyncRowsOptions = {}): Promise<DictaSyncRow[]> {
  let query = client
    .from(DICTA_SYNC_TABLE)
    .select('profile_id,item_type,item_key,payload,updated_at')
    .eq('profile_id', profileId);

  const updatedAfter = timestampFrom(options.updatedAfter);
  if (updatedAfter) {
    query = query.gt('updated_at', updatedAfter);
  }

  const { data, error } = await query.order('updated_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DictaSyncRow[];
}

export async function pushSyncRows(client: SupabaseClient, profileId: string, state: DictaSyncState, options: PushSyncRowsOptions = {}): Promise<number> {
  const result = await pushSyncRowsDetailed(client, profileId, state, options);
  return result.pushed;
}

export async function pushSyncRowsDetailed(
  client: SupabaseClient,
  profileId: string,
  state: DictaSyncState,
  options: PushSyncRowsOptions = {},
): Promise<PushSyncRowsResult> {
  const rows = toSyncRows(profileId, buildSyncItems(state));
  if (rows.length === 0) return { pushed: 0, pushedRows: [] };
  const existingRows = options.existingRows ?? (await pullSyncRows(client, profileId));
  const pushableRows = selectPushableSyncRows(rows, existingRows);
  if (pushableRows.length === 0) return { pushed: 0, pushedRows: [] };
  const { error } = await client.from(DICTA_SYNC_TABLE).upsert(pushableRows, {
    onConflict: 'profile_id,item_type,item_key',
  });
  if (error) throw error;
  return { pushed: pushableRows.length, pushedRows: pushableRows };
}

export function selectPushableSyncRows(localRows: DictaSyncRow[], remoteRows: DictaSyncRow[]): DictaSyncRow[] {
  const remoteByKey = new Map<string, DictaSyncRow>();
  const completedFeedbackBySessionId = collectCompletedFeedbackEvidence(remoteRows);
  for (const row of remoteRows) {
    if (!isValidSyncRow(row)) continue;
    remoteByKey.set(syncRowIdentity(row), row);
  }

  return localRows.filter((localRow) => {
    if (!isValidSyncRow(localRow)) return false;
    if (
      localRow.item_type === 'session' &&
      completedFeedbackBySessionId.has(localRow.item_key) &&
      !isSubmittedFinishedSession(localRow.payload)
    ) {
      return false;
    }
    const remoteRow = remoteByKey.get(syncRowIdentity(localRow));
    if (!remoteRow) return true;
    if (localRow.item_type === 'session' && isSessionTombstonePayload(remoteRow.payload)) {
      return shouldLocalRowReplaceRemoteTombstone(localRow, remoteRow);
    }
    if (localRow.item_type === 'session' && localSubmittedSessionOutranksRemote(localRow.payload, remoteRow.payload)) {
      return true;
    }
    if (localRow.item_type === 'session' && remoteSubmittedSessionOutranksLocal(remoteRow.payload, localRow.payload)) {
      return false;
    }
    return compareTimestamp(localRow.updated_at, remoteRow.updated_at) > 0;
  });
}

export function mergeSyncRowSnapshots(currentRows: DictaSyncRow[], changedRows: DictaSyncRow[]): DictaSyncRow[] {
  if (changedRows.length === 0) return currentRows;
  const byKey = new Map<string, DictaSyncRow>();
  for (const row of currentRows) {
    if (!isValidSyncRow(row)) continue;
    byKey.set(syncRowIdentity(row), row);
  }
  for (const row of changedRows) {
    if (!isValidSyncRow(row)) continue;
    byKey.set(syncRowIdentity(row), row);
  }
  return [...byKey.values()].sort((a, b) => compareTimestamp(a.updated_at, b.updated_at));
}

export function latestSyncRowTimestamp(rows: DictaSyncRow[]): string | null {
  let latest: string | null = null;
  for (const row of rows) {
    const timestamp = timestampFrom(row.updated_at);
    if (!timestamp) continue;
    if (!latest || compareTimestamp(timestamp, latest) > 0) {
      latest = timestamp;
    }
  }
  return latest;
}

export async function deleteSessionSyncRow(client: SupabaseClient, profileId: string, sessionId: string): Promise<DictaSyncRow> {
  const deletedAt = new Date().toISOString();
  const row: DictaSyncRow = {
    profile_id: profileId,
    item_type: 'session',
    item_key: sessionId,
    payload: {
      id: sessionId,
      deleted: true,
      deletedAt,
      updatedAt: deletedAt,
    },
    updated_at: deletedAt,
  };
  const { error } = await client.from(DICTA_SYNC_TABLE).upsert(row, {
    onConflict: 'profile_id,item_type,item_key',
  });
  if (error) throw error;
  return row;
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

function shouldRemoteSessionReplaceLocal(row: DictaSyncRow, localSession: unknown): boolean {
  if (remoteSubmittedSessionOutranksLocal(row.payload, localSession)) return true;
  return isRemoteNewer(row, localSession, ['updatedAt']);
}

function shouldLocalSessionSurviveRemoteTombstone(remoteTombstoneRow: DictaSyncRow, localSession: unknown): boolean {
  const localUpdatedAt = timestampFrom(asRecord(localSession).updatedAt);
  return Boolean(
    localUpdatedAt &&
      isSubmittedFinishedSession(localSession) &&
      compareTimestamp(localUpdatedAt, remoteTombstoneRow.updated_at) > 0,
  );
}

function shouldLocalRowReplaceRemoteTombstone(localRow: DictaSyncRow, remoteTombstoneRow: DictaSyncRow): boolean {
  return (
    localRow.item_type === 'session' &&
    isSubmittedFinishedSession(localRow.payload) &&
    compareTimestamp(localRow.updated_at, remoteTombstoneRow.updated_at) > 0
  );
}

function repairPendingSessionFromCompletedFeedback(session: unknown, evidence: CompletedFeedbackEvidence | undefined): unknown {
  if (!evidence || !isRecord(session) || isSubmittedFinishedSession(session) || isSessionTombstonePayload(session)) {
    return session;
  }
  if (getStringField(session, 'status') === 'error') return session;

  const telemetry = isRecord(session.telemetry) ? session.telemetry : {};
  const metrics = isRecord(session.metrics) ? session.metrics : {};
  const nextAccuracy = evidence.accuracy ?? numberField(metrics, 'accuracy');
  const nextLagSec = evidence.lagSec ?? numberField(metrics, 'lagSec');
  const nextWpm = evidence.wpm ?? numberField(metrics, 'wpm');
  const recoveredRate = evidence.rate ?? numberField(metrics, 'rate');
  const nextRate = recoveredRate || 1;
  const existingPoints = numberField(metrics, 'points');
  const repairedPoints =
    existingPoints > 0
      ? existingPoints
      : estimatePointsFromAccuracy(session, nextAccuracy);
  const existingScore = numberField(metrics, 'score');
  const repairedScore =
    existingScore > 0
      ? existingScore
      : computeSessionScore({
          accuracy: nextAccuracy,
          lagSec: nextLagSec,
          wpm: nextWpm,
          rate: nextRate,
          points: repairedPoints,
        });
  const existingActions = Array.isArray(telemetry.actions) ? telemetry.actions : [];
  const hasSubmitAction = existingActions.some((entry) => isRecord(entry) && entry.action === 'submit');
  const startedAt = typeof telemetry.startedAt === 'string' && telemetry.startedAt
    ? telemetry.startedAt
    : evidence.startedAt ?? '';
  const submitOffsetSec =
    startedAt && timestampFrom(startedAt)
      ? Math.max(0, (new Date(evidence.completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
      : 0;

  return {
    ...session,
    status: 'finished',
    updatedAt: evidence.completedAt,
    metrics: {
      ...metrics,
      controllerState: typeof metrics.controllerState === 'string' ? metrics.controllerState : 'hold',
      rate: nextRate,
      lagSec: nextLagSec,
      lagWords: numberField(metrics, 'lagWords'),
      wpm: nextWpm,
      accuracy: nextAccuracy,
      trend: typeof metrics.trend === 'string' ? metrics.trend : 'stable',
      points: repairedPoints,
      score: repairedScore,
    },
    telemetry: {
      ...telemetry,
      startedAt,
      finishedAt: evidence.completedAt,
      lagSeries: normalizeNumberArray(telemetry.lagSeries, evidence.lagSeries),
      wpmSeries: normalizeNumberArray(telemetry.wpmSeries, evidence.wpmSeries),
      accuracySeries: normalizeNumberArray(telemetry.accuracySeries, evidence.accuracySeries),
      actions: hasSubmitAction
        ? existingActions
        : [
            ...existingActions,
            {
              t: submitOffsetSec,
              action: 'submit',
              rate: nextRate,
            },
          ],
    },
  };
}

function collectCompletedFeedbackEvidence(rows: DictaSyncRow[]): Map<string, CompletedFeedbackEvidence> {
  const bySessionId = new Map<string, CompletedFeedbackEvidence>();
  for (const row of rows) {
    if (!isValidSyncRow(row) || row.item_type !== 'feedback') continue;
    const sessionId = getStringField(row.payload, 'sessionId');
    if (!sessionId || sessionId !== row.item_key) continue;
    const completedAt =
      timestampFrom(asRecord(row.payload).completedAt) ??
      timestampFrom(asRecord(row.payload).createdAt) ??
      timestampFrom(row.updated_at);
    if (!completedAt) continue;
    const evidence = deriveCompletedFeedbackEvidence(row.payload, sessionId, completedAt);

    const previous = bySessionId.get(sessionId);
    if (!previous || compareTimestamp(completedAt, previous.completedAt) > 0) {
      bySessionId.set(sessionId, evidence);
    }
  }
  return bySessionId;
}

function deriveCompletedFeedbackEvidence(
  payload: unknown,
  sessionId: string,
  completedAt: string,
): CompletedFeedbackEvidence {
  const benchmarkAfter = asRecord(asRecord(payload).benchmarkAfter);
  const samples = getFeedbackTimelineSamples(payload, sessionId);
  const lastSample = samples.at(-1) ?? null;
  const fallbackAccuracy = normalizeAccuracy(numberFrom(benchmarkAfter.averageAccuracy));
  return {
    sessionId,
    completedAt,
    startedAt: samples[0]?.timestampMs ? new Date(samples[0].timestampMs).toISOString() : null,
    lagSeries: samples.map((sample) => sample.lagSec),
    wpmSeries: samples.map((sample) => sample.wpm),
    accuracySeries: samples.map((sample) => sample.accuracy),
    lagSec: lastSample?.lagSec ?? numberFrom(benchmarkAfter.stableAverageLagSec ?? benchmarkAfter.averageLagSec),
    wpm: lastSample?.wpm ?? numberFrom(benchmarkAfter.averageWpm),
    accuracy: lastSample?.accuracy ?? fallbackAccuracy,
    rate: lastSample?.rate ?? numberFrom(benchmarkAfter.preferredPlaybackRate),
  };
}

type FeedbackTimelineSample = {
  timestampMs: number;
  lagSec: number;
  wpm: number;
  accuracy: number;
  rate: number;
};

function getFeedbackTimelineSamples(payload: unknown, sessionId: string): FeedbackTimelineSample[] {
  const benchmarkAfter = asRecord(asRecord(payload).benchmarkAfter);
  const timeline = Array.isArray(benchmarkAfter.timeline) ? benchmarkAfter.timeline : [];
  return timeline
    .map((entry) => normalizeTimelineSample(entry, sessionId))
    .filter((sample): sample is FeedbackTimelineSample => Boolean(sample))
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function normalizeTimelineSample(entry: unknown, sessionId: string): FeedbackTimelineSample | null {
  const record = asRecord(entry);
  if (getStringField(record, 'sessionId') !== sessionId) return null;
  const timestampMs = numberFrom(record.timestampMs);
  const lagSec = numberFrom(record.stableLagSec ?? record.lagSec);
  const wpm = numberFrom(record.wpm);
  const rawAccuracy = numberFrom(record.accuracy);
  const rate = numberFrom(record.playbackRate);
  if (timestampMs === null || lagSec === null || wpm === null || rawAccuracy === null) return null;
  return {
    timestampMs,
    lagSec,
    wpm,
    accuracy: normalizeAccuracy(rawAccuracy) ?? 0,
    rate: rate ?? 1,
  };
}

function remoteSubmittedSessionOutranksLocal(remotePayload: unknown, localPayload: unknown): boolean {
  return isSubmittedFinishedSession(remotePayload) && !isSubmittedFinishedSession(localPayload);
}

function localSubmittedSessionOutranksRemote(localPayload: unknown, remotePayload: unknown): boolean {
  return isSubmittedFinishedSession(localPayload) && !isSubmittedFinishedSession(remotePayload);
}

function isSessionTombstonePayload(payload: unknown): boolean {
  return asRecord(payload).deleted === true;
}

function hasMalformedDeletedFlag(payload: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(payload, 'deleted') && typeof payload.deleted !== 'boolean';
}

function isSubmittedFinishedSession(payload: unknown): boolean {
  return isSubmittedFinishedAttempt(payload);
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

function numberField(value: unknown, field: string): number {
  return numberFrom(asRecord(value)[field]) ?? 0;
}

function numberFrom(value: unknown): number | null {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeAccuracy(value: number | null): number | null {
  if (value === null) return null;
  return value <= 1 ? value * 100 : value;
}

function normalizeNumberArray(primary: unknown, fallback: number[]): number[] {
  if (Array.isArray(primary)) {
    return primary.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  }
  return fallback;
}

function estimatePointsFromAccuracy(session: Record<string, unknown>, accuracy: number): number {
  if (accuracy <= 0) return 0;
  const sourceText =
    getStringField(session, 'ttsText') ||
    getStringField(session, 'kokoroText') ||
    getStringField(session, 'inputText');
  const wordCount = countWords(sourceText);
  return wordCount > 0 ? Math.round(wordCount * Math.max(0, Math.min(100, accuracy)) / 100) : 0;
}

function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

function syncRowIdentity(row: DictaSyncRow): string {
  return `${row.profile_id}:${row.item_type}:${row.item_key}`;
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

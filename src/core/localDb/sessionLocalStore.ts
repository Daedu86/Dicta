import {
  getDictaLocalDbAdapter,
  sessionRecordId,
  tombstoneRecordId,
  type DictaLocalDbSessionRecord,
  type DictaLocalDbTombstoneRecord,
} from './dictaLocalDb';
import {
  filterSessionsByRetention,
  getSessionRetentionActivityTimestampMs,
  partitionSessionsByRetention,
  type RetainableSession,
} from '../../app/sessionRetentionPolicy';
import { getTombstoneExpiresAt } from '../supabaseSync/syncRetentionPolicy';

export type PruneResult<TSession extends RetainableSession> = {
  retainedSessions: TSession[];
  expiredSessionIds: Set<string>;
};

export async function loadSessions<TSession extends RetainableSession>(profileId?: string): Promise<TSession[]> {
  if (!profileId) return [];
  const records = await getDictaLocalDbAdapter().loadSessions(profileId);
  return records
    .map((record) => record.payload as TSession)
    .filter((session) => session && typeof session.id === 'string')
    .sort((a, b) => compareIso(b.updatedAt, a.updatedAt));
}

export async function saveSessions<TSession extends RetainableSession>(
  profileId: string,
  sessions: readonly TSession[],
): Promise<void> {
  const retainedSessions = filterSessionsByRetention(sessions);
  await getDictaLocalDbAdapter().replaceSessions(profileId, retainedSessions.map((session) => toSessionRecord(profileId, session)));
}

export async function upsertSessions<TSession extends RetainableSession>(
  profileId: string,
  sessions: readonly TSession[],
): Promise<void> {
  const retainedSessions = filterSessionsByRetention(sessions);
  await getDictaLocalDbAdapter().upsertSessions(retainedSessions.map((session) => toSessionRecord(profileId, session)));
}

export async function deleteSession(profileId: string, sessionId: string): Promise<void> {
  await getDictaLocalDbAdapter().deleteSession(profileId, sessionId);
}

export async function pruneExpiredSessions<TSession extends RetainableSession>(
  profileId: string,
  nowMs = Date.now(),
): Promise<PruneResult<TSession>> {
  const sessions = await loadSessions<TSession>(profileId);
  const { retainedSessions, expiredSessionIds } = partitionSessionsByRetention(sessions, nowMs);
  await getDictaLocalDbAdapter().replaceSessions(profileId, retainedSessions.map((session) => toSessionRecord(profileId, session)));
  if (expiredSessionIds.size > 0) {
    await saveDeletedSessionIds(profileId, expiredSessionIds, nowMs);
  }
  return { retainedSessions, expiredSessionIds };
}

export async function loadDeletedSessionIds(profileId: string, nowMs = Date.now()): Promise<Set<string>> {
  const records = await getDictaLocalDbAdapter().loadTombstones(profileId);
  const retained = records.filter((record) => Date.parse(record.tombstoneExpiresAt) > nowMs);
  if (retained.length !== records.length) {
    await getDictaLocalDbAdapter().replaceTombstones(profileId, retained);
  }
  return new Set(retained.map((record) => record.itemKey));
}

export async function saveDeletedSessionIds(
  profileId: string,
  ids: Iterable<string>,
  nowMs = Date.now(),
): Promise<void> {
  const existing = await getDictaLocalDbAdapter().loadTombstones(profileId);
  const existingByItemKey = new Map(existing.map((record) => [record.itemKey, record]));
  const records: DictaLocalDbTombstoneRecord[] = [];
  for (const id of ids) {
    if (!id) continue;
    const existingRecord = existingByItemKey.get(id);
    const deletedAt = existingRecord?.deletedAt ?? new Date(nowMs).toISOString();
    records.push({
      id: tombstoneRecordId(profileId, id),
      profileId,
      itemKey: id,
      itemType: 'session',
      deletedAt,
      tombstoneExpiresAt: existingRecord?.tombstoneExpiresAt ?? getTombstoneExpiresAt(deletedAt),
    });
  }
  await getDictaLocalDbAdapter().replaceTombstones(profileId, records);
}

function toSessionRecord<TSession extends RetainableSession>(
  profileId: string,
  session: TSession,
): DictaLocalDbSessionRecord<TSession> {
  const activityTimestampMs = getSessionRetentionActivityTimestampMs(session);
  const activityAt = Number.isFinite(activityTimestampMs)
    ? new Date(activityTimestampMs).toISOString()
    : session.updatedAt ?? session.createdAt ?? new Date(0).toISOString();

  return {
    id: sessionRecordId(profileId, session.id),
    profileId,
    updatedAt: session.updatedAt ?? activityAt,
    status: session.status,
    activityAt,
    payload: session,
  };
}

function compareIso(left: string | undefined, right: string | undefined): number {
  return Date.parse(left ?? '') - Date.parse(right ?? '');
}

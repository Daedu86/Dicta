import { isTransientGenerationErrorSessionLike } from '../../core/adaptive/openRouterFallbackScript';
import {
  deleteSessionSyncRow,
  latestSyncRowTimestamp,
  mergeSyncRowSnapshots,
  mergeSyncRows,
  pullSyncRows,
  pushSyncRowsDetailed,
  type DictaSyncRow,
  type DictaSyncState,
} from '../../core/supabaseSync';
import { isSyncClientStale } from '../../core/supabaseSync/syncRetentionPolicy';
import { persistDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import {
  collectTransientErrorSessionIds,
  shouldUseFullSupabasePull,
} from '../sessionPersistenceSupabasePullPlan';
import type { PersistableSession } from './sessionPersistenceSyncTypes';
import type { UseSupabaseSessionPullRuntimeOptions } from './sessionPersistenceSupabasePullTypes';

const SUPABASE_SYNC_MANIFEST_KEY = 'dicta.supabaseSyncManifest.v1';

type PullReason = 'initial' | 'background';
type SupabaseClientForPull<TSession extends PersistableSession, TBenchmarks, TFeedback> = NonNullable<
  UseSupabaseSessionPullRuntimeOptions<TSession, TBenchmarks, TFeedback>['supabaseClient']
>;

type CreateSupabasePullSyncArgs<TSession extends PersistableSession, TBenchmarks, TFeedback> = Omit<
  UseSupabaseSessionPullRuntimeOptions<TSession, TBenchmarks, TFeedback>,
  'supabaseClient' | 'syncEnabled'
> & {
  client: SupabaseClientForPull<TSession, TBenchmarks, TFeedback>;
  isCancelled: () => boolean;
};

type SupabaseSyncManifestEntry = {
  lastSuccessfulSyncAt: string | null;
  lastServerVersion: number | null;
  lastFullRefreshAt: string | null;
};

type SupabaseSyncManifest = {
  byProfileId: Record<string, SupabaseSyncManifestEntry | undefined>;
};

export function createSupabasePullSync<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  client,
  profileId,
  supabaseSyncIdentity,
  normalizeRestoredSession,
  setSessions,
  setAdaptiveBenchmarks,
  setAdaptiveSessionFeedback,
  setSupabaseSyncStatus,
  setSupabaseInitialPullState,
  syncStateRef,
  deletedSessionIdsRef,
  supabasePullInFlightRef,
  supabaseKnownRemoteRowsRef,
  supabaseLastRemoteUpdatedAtRef,
  supabaseLastFullPullAtMsRef,
  supabaseApplyingRemoteRef,
  supabaseInitialPullCompleteRef,
  clearPendingCriticalSessionRows,
  pruneAdaptiveSessionFeedbackForDeletedSessions,
  isCancelled,
}: CreateSupabasePullSyncArgs<TSession, TBenchmarks, TFeedback>): (reason: PullReason) => Promise<void> {
  return async (reason) => {
    if (supabasePullInFlightRef.current) return;
    supabasePullInFlightRef.current = true;
    setSupabaseSyncStatus((current) => ({
      ...current,
      state: 'pulling',
      message: reason === 'initial' ? 'Pulling Supabase sync data...' : 'Refreshing Supabase sync data...',
    }));
    try {
      const nowMs = Date.now();
      const manifestEntry = readSupabaseSyncManifestEntry(profileId);
      const staleClientMustFullRefresh = isSyncClientStale(manifestEntry.lastSuccessfulSyncAt, nowMs);
      const shouldFullPull =
        staleClientMustFullRefresh ||
        manifestEntry.lastServerVersion === null ||
        shouldUseFullSupabasePull(reason, nowMs, supabaseLastFullPullAtMsRef.current);
      const rows = await pullSyncRows(client, profileId, {
        updatedAfter:
          shouldFullPull || manifestEntry.lastServerVersion !== null
            ? null
            : supabaseLastRemoteUpdatedAtRef.current,
        serverVersionAfter: shouldFullPull ? null : manifestEntry.lastServerVersion,
      });
      if (isCancelled()) return;
      if (shouldFullPull) supabaseLastFullPullAtMsRef.current = nowMs;
      supabaseKnownRemoteRowsRef.current = shouldFullPull
        ? rows
        : mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, rows);
      supabaseLastRemoteUpdatedAtRef.current =
        latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;

      deleteTransientErrorRows(rows, client, profileId, deletedSessionIdsRef.current);
      const mergeBaseState = staleClientMustFullRefresh ? createEmptyDictaSyncState() : syncStateRef.current;
      const merged = mergeSyncRows(mergeBaseState, rows);
      if (merged.deletedSessionIds.length > 0) {
        merged.deletedSessionIds.forEach((sessionId) => deletedSessionIdsRef.current.add(sessionId));
        persistDeletedSessionIds(deletedSessionIdsRef.current);
      }

      const filteredMergedSessions = (merged.sessions as TSession[])
        .map(normalizeRestoredSession)
        .filter((session) => !deletedSessionIdsRef.current.has(session.id) && !isTransientGenerationErrorSessionLike(session));
      const filteredMergedFeedback = pruneAdaptiveSessionFeedbackForDeletedSessions
        ? pruneAdaptiveSessionFeedbackForDeletedSessions(merged.feedback as TFeedback, deletedSessionIdsRef.current)
        : merged.feedback as TFeedback;
      if (staleClientMustFullRefresh || merged.changed || filteredMergedSessions.length !== (merged.sessions as TSession[]).length) {
        applyRemoteSupabaseMerge(filteredMergedSessions, merged.benchmarks as TBenchmarks, filteredMergedFeedback, {
          setSessions,
          setAdaptiveBenchmarks,
          setAdaptiveSessionFeedback,
          supabaseApplyingRemoteRef,
        });
      }

      markInitialPullComplete(supabaseInitialPullCompleteRef, setSupabaseInitialPullState, supabaseSyncIdentity);
      const postMergeState: DictaSyncState = {
        ...merged,
        sessions: filteredMergedSessions,
        feedback: filteredMergedFeedback as DictaSyncState['feedback'],
      };
      const pushResult = staleClientMustFullRefresh
        ? { pushed: 0, pushedRows: [] }
        : await pushSyncRowsDetailed(client, profileId, postMergeState, {
            existingRows: supabaseKnownRemoteRowsRef.current,
          });
      const { pushed, pushedRows } = pushResult;
      supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, pushedRows);
      supabaseLastRemoteUpdatedAtRef.current =
        latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
      clearPendingCriticalSessionRows((postMergeState.sessions as TSession[]).map((session) => session.id));
      if (isCancelled()) return;

      const syncCompletedAt = new Date().toISOString();
      writeSupabaseSyncManifestEntry(profileId, {
        lastSuccessfulSyncAt: syncCompletedAt,
        lastServerVersion: getLatestSyncRowServerVersion(supabaseKnownRemoteRowsRef.current),
        lastFullRefreshAt: shouldFullPull ? syncCompletedAt : manifestEntry.lastFullRefreshAt,
      });
      setSupabaseSyncStatus({
        enabled: true,
        state: 'synced',
        message: merged.imported > 0 ? `Synced. Imported ${merged.imported} remote item${merged.imported === 1 ? '' : 's'}.` : 'Synced with Supabase.',
        lastSyncedAt: syncCompletedAt,
        imported: merged.imported,
        pushed,
      });
    } catch (error) {
      if (isCancelled()) return;
      markInitialPullComplete(supabaseInitialPullCompleteRef, setSupabaseInitialPullState, supabaseSyncIdentity);
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'error',
        message: error instanceof Error ? error.message : 'Supabase sync failed.',
      }));
    } finally {
      supabasePullInFlightRef.current = false;
    }
  };
}

function deleteTransientErrorRows<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  rows: Parameters<typeof collectTransientErrorSessionIds>[0],
  client: SupabaseClientForPull<TSession, TBenchmarks, TFeedback>,
  profileId: string,
  deletedSessionIds: Set<string>,
): void {
  const transientErrorSessionIds = collectTransientErrorSessionIds(rows);
  if (transientErrorSessionIds.length === 0) return;
  transientErrorSessionIds.forEach((sessionId) => deletedSessionIds.add(sessionId));
  persistDeletedSessionIds(deletedSessionIds);
  void Promise.allSettled(transientErrorSessionIds.map((sessionId) => deleteSessionSyncRow(client, profileId, sessionId)));
}

function applyRemoteSupabaseMerge<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  sessions: TSession[],
  benchmarks: TBenchmarks,
  feedback: TFeedback,
  {
    setSessions,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
    supabaseApplyingRemoteRef,
  }: Pick<
    CreateSupabasePullSyncArgs<TSession, TBenchmarks, TFeedback>,
    'setSessions' | 'setAdaptiveBenchmarks' | 'setAdaptiveSessionFeedback' | 'supabaseApplyingRemoteRef'
  >,
): void {
  supabaseApplyingRemoteRef.current = true;
  setSessions(sessions);
  setAdaptiveBenchmarks(benchmarks);
  setAdaptiveSessionFeedback(feedback);
  window.setTimeout(() => {
    supabaseApplyingRemoteRef.current = false;
  }, 0);
}

function markInitialPullComplete<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  supabaseInitialPullCompleteRef: CreateSupabasePullSyncArgs<
    TSession,
    TBenchmarks,
    TFeedback
  >['supabaseInitialPullCompleteRef'],
  setSupabaseInitialPullState: CreateSupabasePullSyncArgs<
    TSession,
    TBenchmarks,
    TFeedback
  >['setSupabaseInitialPullState'],
  supabaseSyncIdentity: string,
): void {
  supabaseInitialPullCompleteRef.current = true;
  setSupabaseInitialPullState({
    key: supabaseSyncIdentity,
    complete: true,
  });
}

function createEmptyDictaSyncState(): DictaSyncState {
  return {
    sessions: [],
    benchmarks: {},
    feedback: {},
  };
}

function readSupabaseSyncManifestEntry(profileId: string): SupabaseSyncManifestEntry {
  return normalizeSupabaseSyncManifestEntry(readSupabaseSyncManifest().byProfileId[profileId]);
}

function writeSupabaseSyncManifestEntry(profileId: string, patch: Partial<SupabaseSyncManifestEntry>): void {
  try {
    const manifest = readSupabaseSyncManifest();
    const current = normalizeSupabaseSyncManifestEntry(manifest.byProfileId[profileId]);
    manifest.byProfileId[profileId] = normalizeSupabaseSyncManifestEntry({
      ...current,
      ...patch,
    });
    window.localStorage.setItem(SUPABASE_SYNC_MANIFEST_KEY, JSON.stringify(manifest));
  } catch (error) {
    console.warn('[supabaseSync] Failed to persist sync manifest.', error);
  }
}

function readSupabaseSyncManifest(): SupabaseSyncManifest {
  try {
    const raw = window.localStorage.getItem(SUPABASE_SYNC_MANIFEST_KEY);
    if (!raw) return { byProfileId: {} };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { byProfileId: {} };

    const byProfileId = (parsed as { byProfileId?: unknown }).byProfileId;
    if (!byProfileId || typeof byProfileId !== 'object') return { byProfileId: {} };

    return {
      byProfileId: byProfileId as Record<string, SupabaseSyncManifestEntry | undefined>,
    };
  } catch {
    return { byProfileId: {} };
  }
}

function normalizeSupabaseSyncManifestEntry(value: Partial<SupabaseSyncManifestEntry> | undefined): SupabaseSyncManifestEntry {
  return {
    lastSuccessfulSyncAt: typeof value?.lastSuccessfulSyncAt === 'string' ? value.lastSuccessfulSyncAt : null,
    lastServerVersion:
      typeof value?.lastServerVersion === 'number' && Number.isFinite(value.lastServerVersion)
        ? value.lastServerVersion
        : null,
    lastFullRefreshAt: typeof value?.lastFullRefreshAt === 'string' ? value.lastFullRefreshAt : null,
  };
}

function getLatestSyncRowServerVersion(rows: readonly DictaSyncRow[]): number | null {
  let latest: number | null = null;

  for (const row of rows) {
    const version = row.server_version;
    if (typeof version !== 'number' || !Number.isFinite(version)) continue;
    if (latest === null || version > latest) latest = version;
  }

  return latest;
}

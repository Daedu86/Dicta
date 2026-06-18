#!/usr/bin/env python3
"""
Apply Dicta retention policy update:
- 20-day active retention/window for sessions, telemetry, feedback, adaptive benchmarks.
- 30-day Supabase tombstones.
- Add tombstoneExpiresAt payload metadata.
- Add optional server_version support.
- Add local sync manifest with lastSuccessfulSyncAt / lastServerVersion.
- Block local push after a known client has been stale for longer than the tombstone window.

Run from the Dicta repo root:
  python scripts/apply_retention_20_30.py

Then:
  npm test
  npm run build
"""

from __future__ import annotations

from pathlib import Path
import re
import sys


ROOT = Path.cwd()


def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        raise FileNotFoundError(f"Missing expected file: {path}")
    return p.read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"updated {path}")


def replace(path: str, old: str, new: str, *, required: bool = True) -> None:
    content = read(path)
    if old not in content:
        if required:
            raise RuntimeError(f"Expected snippet not found in {path}:\n{old}")
        print(f"skipped {path}: snippet not found")
        return
    write(path, content.replace(old, new))


def regex_replace(path: str, pattern: str, repl: str, *, required: bool = False) -> None:
    content = read(path)
    next_content, count = re.subn(pattern, repl, content)
    if required and count == 0:
        raise RuntimeError(f"Expected regex not found in {path}: {pattern}")
    if count:
        write(path, next_content)
    else:
        print(f"skipped {path}: regex not found {pattern}")


def update_code_constants() -> None:
    replace(
        "src/core/adaptive/inputLanguageBenchmarkDefaults.ts",
        "export const ROLLING_WINDOW_DAYS = 30 as const;",
        "export const ROLLING_WINDOW_DAYS = 20 as const;",
    )

    replace(
        "src/core/adaptive/inputLanguageBenchmarkTimeline.ts",
        "export const MAX_TIMELINE_POINTS = 450;",
        "export const MAX_TIMELINE_POINTS = 300;",
    )

    replace(
        "src/app/sessionRetentionPolicy.ts",
        "export const SESSION_RETENTION_DAYS = 30;",
        "export const SESSION_RETENTION_DAYS = 20;",
    )


def add_sync_retention_policy() -> None:
    write(
        "src/core/supabaseSync/syncRetentionPolicy.ts",
        """export const ACTIVE_SYNC_RETENTION_DAYS = 20 as const;
export const TOMBSTONE_RETENTION_DAYS = 30 as const;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getTombstoneExpiresAt(deletedAtIso: string): string {
  const deletedAtMs = Date.parse(deletedAtIso);
  const baseMs = Number.isFinite(deletedAtMs) ? deletedAtMs : Date.now();

  return new Date(baseMs + TOMBSTONE_RETENTION_DAYS * MS_PER_DAY).toISOString();
}

export function isSyncClientStale(lastSuccessfulSyncAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!lastSuccessfulSyncAt) return false;

  const lastSyncMs = Date.parse(lastSuccessfulSyncAt);
  if (!Number.isFinite(lastSyncMs)) return true;

  return lastSyncMs < nowMs - TOMBSTONE_RETENTION_DAYS * MS_PER_DAY;
}
""",
    )

    replace(
        "src/core/supabaseSync.ts",
        "export { DICTA_SYNC_TABLE } from './supabaseSync/types';",
        "export { ACTIVE_SYNC_RETENTION_DAYS, TOMBSTONE_RETENTION_DAYS, getTombstoneExpiresAt, isSyncClientStale } from './supabaseSync/syncRetentionPolicy';\nexport { DICTA_SYNC_TABLE } from './supabaseSync/types';",
    )


def update_supabase_sync_types() -> None:
    replace(
        "src/core/supabaseSync/types.ts",
        """export type DictaSyncRow = {
  profile_id: string;
  item_type: DictaSyncItemType;
  item_key: string;
  payload: unknown;
  updated_at: string;
};""",
        """export type DictaSyncRow = {
  profile_id: string;
  item_type: DictaSyncItemType;
  item_key: string;
  payload: unknown;
  updated_at: string;
  server_version?: number | null;
};""",
    )

    replace(
        "src/core/supabaseSync/types.ts",
        """export type PullSyncRowsOptions = {
  updatedAfter?: string | null;
};""",
        """export type PullSyncRowsOptions = {
  updatedAfter?: string | null;
  serverVersionAfter?: number | null;
};""",
    )


def update_pull_rows() -> None:
    write(
        "src/core/supabaseSync/pullRows.ts",
        """import type { SupabaseClient } from '@supabase/supabase-js';

import { timestampFrom } from './timestamps';
import { DICTA_SYNC_TABLE, type DictaSyncRow, type PullSyncRowsOptions } from './types';

const SUPABASE_PULL_PAGE_SIZE = 1000;

export async function pullSyncRows(
  client: SupabaseClient,
  profileId: string,
  options: PullSyncRowsOptions = {},
): Promise<DictaSyncRow[]> {
  const updatedAfter = timestampFrom(options.updatedAfter);
  const serverVersionAfter =
    typeof options.serverVersionAfter === 'number' && Number.isFinite(options.serverVersionAfter)
      ? options.serverVersionAfter
      : null;
  const rows: DictaSyncRow[] = [];
  let offset = 0;

  while (true) {
    let query = client
      .from(DICTA_SYNC_TABLE)
      .select('profile_id,item_type,item_key,payload,updated_at,server_version')
      .eq('profile_id', profileId);

    if (serverVersionAfter !== null) {
      query = query.gt('server_version', serverVersionAfter);
    } else if (updatedAfter) {
      query = query.gt('updated_at', updatedAfter);
    }

    const orderedQuery =
      serverVersionAfter !== null
        ? query.order('server_version', { ascending: true }).order('updated_at', { ascending: true })
        : query.order('updated_at', { ascending: true });

    const { data, error } = await orderedQuery
      .order('item_type', { ascending: true })
      .order('item_key', { ascending: true })
      .range(offset, offset + SUPABASE_PULL_PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as DictaSyncRow[];
    rows.push(...page);

    if (page.length < SUPABASE_PULL_PAGE_SIZE) break;
    offset += SUPABASE_PULL_PAGE_SIZE;
  }

  return rows;
}
""",
    )


def update_delete_session_row() -> None:
    replace(
        "src/core/supabaseSync/deleteSessionRow.ts",
        "import { DICTA_SYNC_TABLE, type DictaSyncRow } from './types';",
        "import { getTombstoneExpiresAt } from './syncRetentionPolicy';\nimport { DICTA_SYNC_TABLE, type DictaSyncRow } from './types';",
    )

    replace(
        "src/core/supabaseSync/deleteSessionRow.ts",
        "  const deletedAt = new Date().toISOString();\n  const row: DictaSyncRow = {",
        "  const deletedAt = new Date().toISOString();\n  const tombstoneExpiresAt = getTombstoneExpiresAt(deletedAt);\n  const row: DictaSyncRow = {",
    )

    replace(
        "src/core/supabaseSync/deleteSessionRow.ts",
        """      deleted: true,
      deletedAt,
      updatedAt: deletedAt,""",
        """      deleted: true,
      deletedAt,
      tombstoneExpiresAt,
      updatedAt: deletedAt,""",
    )

    replace(
        "src/core/supabaseSync/deleteSessionRow.ts",
        """  const { error } = await client.from(DICTA_SYNC_TABLE).upsert(row, {
    onConflict: 'profile_id,item_type,item_key',
  });
  if (error) throw error;
  return row;""",
        """  const { data, error } = await client
    .from(DICTA_SYNC_TABLE)
    .upsert(row, {
      onConflict: 'profile_id,item_type,item_key',
    })
    .select('profile_id,item_type,item_key,payload,updated_at,server_version')
    .single();

  if (error) throw error;
  return (data ?? row) as DictaSyncRow;""",
    )


def update_push_rows() -> None:
    replace(
        "src/core/supabaseSync/pushRows.ts",
        """  const { error } = await client.from(DICTA_SYNC_TABLE).upsert(pushableRows, {
    onConflict: 'profile_id,item_type,item_key',
  });
  if (error) throw error;
  return { pushed: pushableRows.length, pushedRows: pushableRows };""",
        """  const { data, error } = await client
    .from(DICTA_SYNC_TABLE)
    .upsert(pushableRows, {
      onConflict: 'profile_id,item_type,item_key',
    })
    .select('profile_id,item_type,item_key,payload,updated_at,server_version');

  if (error) throw error;

  const pushedRows = (data ?? pushableRows) as DictaSyncRow[];
  return { pushed: pushedRows.length, pushedRows };""",
    )


def add_sync_manifest() -> None:
    write(
        "src/app/sessionPersistenceSync/sessionPersistenceSupabaseSyncManifest.ts",
        """import type { DictaSyncRow } from '../../core/supabaseSync';

export const SUPABASE_SYNC_MANIFEST_KEY = 'dicta.supabaseSyncManifest.v1';

export type SupabaseSyncManifestEntry = {
  lastSuccessfulSyncAt: string | null;
  lastServerVersion: number | null;
  lastFullRefreshAt: string | null;
};

type SupabaseSyncManifest = {
  byProfileId: Record<string, SupabaseSyncManifestEntry | undefined>;
};

const EMPTY_MANIFEST_ENTRY: SupabaseSyncManifestEntry = {
  lastSuccessfulSyncAt: null,
  lastServerVersion: null,
  lastFullRefreshAt: null,
};

export function readSupabaseSyncManifestEntry(
  profileId: string,
  storage: Storage = window.localStorage,
): SupabaseSyncManifestEntry {
  return normalizeManifestEntry(readSupabaseSyncManifest(storage).byProfileId[profileId]);
}

export function writeSupabaseSyncManifestEntry(
  profileId: string,
  patch: Partial<SupabaseSyncManifestEntry>,
  storage: Storage = window.localStorage,
): void {
  try {
    const manifest = readSupabaseSyncManifest(storage);
    const current = normalizeManifestEntry(manifest.byProfileId[profileId]);
    manifest.byProfileId[profileId] = normalizeManifestEntry({
      ...current,
      ...patch,
    });
    storage.setItem(SUPABASE_SYNC_MANIFEST_KEY, JSON.stringify(manifest));
  } catch (error) {
    console.warn('[supabaseSync] Failed to persist sync manifest.', error);
  }
}

export function getLatestSyncRowServerVersion(rows: readonly DictaSyncRow[]): number | null {
  let latest: number | null = null;

  for (const row of rows) {
    const version = row.server_version;
    if (typeof version !== 'number' || !Number.isFinite(version)) continue;
    if (latest === null || version > latest) latest = version;
  }

  return latest;
}

function readSupabaseSyncManifest(storage: Storage): SupabaseSyncManifest {
  try {
    const raw = storage.getItem(SUPABASE_SYNC_MANIFEST_KEY);
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

function normalizeManifestEntry(value: Partial<SupabaseSyncManifestEntry> | undefined): SupabaseSyncManifestEntry {
  return {
    lastSuccessfulSyncAt: typeof value?.lastSuccessfulSyncAt === 'string' ? value.lastSuccessfulSyncAt : null,
    lastServerVersion:
      typeof value?.lastServerVersion === 'number' && Number.isFinite(value.lastServerVersion)
        ? value.lastServerVersion
        : null,
    lastFullRefreshAt: typeof value?.lastFullRefreshAt === 'string' ? value.lastFullRefreshAt : null,
  };
}
""",
    )


def update_pull_sync_runtime() -> None:
    replace(
        "src/app/sessionPersistenceSync/sessionPersistenceSupabasePullSync.ts",
        """import {
  deleteSessionSyncRow,
  latestSyncRowTimestamp,
  mergeSyncRowSnapshots,
  mergeSyncRows,
  pullSyncRows,
  pushSyncRowsDetailed,
  type DictaSyncState,
} from '../../core/supabaseSync';""",
        """import {
  deleteSessionSyncRow,
  latestSyncRowTimestamp,
  mergeSyncRowSnapshots,
  mergeSyncRows,
  pullSyncRows,
  pushSyncRowsDetailed,
  type DictaSyncState,
} from '../../core/supabaseSync';
import { isSyncClientStale } from '../../core/supabaseSync/syncRetentionPolicy';""",
    )

    replace(
        "src/app/sessionPersistenceSync/sessionPersistenceSupabasePullSync.ts",
        """import type { PersistableSession } from './sessionPersistenceSyncTypes';
import type { UseSupabaseSessionPullRuntimeOptions } from './sessionPersistenceSupabasePullTypes';""",
        """import type { PersistableSession } from './sessionPersistenceSyncTypes';
import type { UseSupabaseSessionPullRuntimeOptions } from './sessionPersistenceSupabasePullTypes';
import {
  getLatestSyncRowServerVersion,
  readSupabaseSyncManifestEntry,
  writeSupabaseSyncManifestEntry,
} from './sessionPersistenceSupabaseSyncManifest';""",
    )

    replace(
        "src/app/sessionPersistenceSync/sessionPersistenceSupabasePullSync.ts",
        """      const nowMs = Date.now();
      const shouldFullPull = shouldUseFullSupabasePull(reason, nowMs, supabaseLastFullPullAtMsRef.current);
      const rows = await pullSyncRows(client, profileId, {
        updatedAfter: shouldFullPull ? null : supabaseLastRemoteUpdatedAtRef.current,
      });""",
        """      const nowMs = Date.now();
      const syncManifestEntry = readSupabaseSyncManifestEntry(profileId);
      const hasPriorSuccessfulSync = Boolean(syncManifestEntry.lastSuccessfulSyncAt);
      const remoteRefreshMustBlockLocalPush =
        hasPriorSuccessfulSync && isSyncClientStale(syncManifestEntry.lastSuccessfulSyncAt, nowMs);
      const shouldFullPull =
        remoteRefreshMustBlockLocalPush ||
        syncManifestEntry.lastServerVersion == null ||
        shouldUseFullSupabasePull(reason, nowMs, supabaseLastFullPullAtMsRef.current);
      const rows = await pullSyncRows(client, profileId, {
        updatedAfter:
          shouldFullPull || syncManifestEntry.lastServerVersion != null
            ? null
            : supabaseLastRemoteUpdatedAtRef.current,
        serverVersionAfter: shouldFullPull ? null : syncManifestEntry.lastServerVersion,
      });""",
    )

    replace(
        "src/app/sessionPersistenceSync/sessionPersistenceSupabasePullSync.ts",
        "      const merged = mergeSyncRows(syncStateRef.current, rows);",
        """      const localStateForMerge = remoteRefreshMustBlockLocalPush ? createEmptyDictaSyncState() : syncStateRef.current;
      const merged = mergeSyncRows(localStateForMerge, rows);""",
    )

    replace(
        "src/app/sessionPersistenceSync/sessionPersistenceSupabasePullSync.ts",
        """      const { pushed, pushedRows } = await pushSyncRowsDetailed(client, profileId, postMergeState, {
        existingRows: supabaseKnownRemoteRowsRef.current,
      });
      supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, pushedRows);
      supabaseLastRemoteUpdatedAtRef.current =
        latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
      clearPendingCriticalSessionRows((postMergeState.sessions as TSession[]).map((session) => session.id));
      if (isCancelled()) return;
      setSupabaseSyncStatus({
        enabled: true,
        state: 'synced',
        message: merged.imported > 0 ? `Synced. Imported ${merged.imported} remote item${merged.imported === 1 ? '' : 's'}.` : 'Synced with Supabase.',
        lastSyncedAt: new Date().toISOString(),
        imported: merged.imported,
        pushed,
      });""",
        """      const pushResult = remoteRefreshMustBlockLocalPush
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
        lastFullRefreshAt: shouldFullPull ? syncCompletedAt : syncManifestEntry.lastFullRefreshAt,
      });

      setSupabaseSyncStatus({
        enabled: true,
        state: 'synced',
        message: merged.imported > 0 ? `Synced. Imported ${merged.imported} remote item${merged.imported === 1 ? '' : 's'}.` : 'Synced with Supabase.',
        lastSyncedAt: syncCompletedAt,
        imported: merged.imported,
        pushed,
      });""",
    )

    replace(
        "src/app/sessionPersistenceSync/sessionPersistenceSupabasePullSync.ts",
        """function deleteTransientErrorRows<TSession extends PersistableSession, TBenchmarks, TFeedback>(""",
        """function createEmptyDictaSyncState(): DictaSyncState {
  return {
    sessions: [],
    benchmarks: {},
    feedback: {},
  };
}

function deleteTransientErrorRows<TSession extends PersistableSession, TBenchmarks, TFeedback>(""",
    )


def add_supabase_migration() -> None:
    write(
        "supabase/migrations/20260618160000_dicta_sync_retention_20_30.sql",
        """-- Dicta retention policy 20/30:
-- - active session/telemetry retention: 20 days
-- - tombstone retention: 30 days
-- - server_version supports anti-resurrection incremental sync cursors

create sequence if not exists public.dicta_sync_items_server_version_seq;

alter table public.dicta_sync_items
add column if not exists server_version bigint;

update public.dicta_sync_items
set server_version = nextval('public.dicta_sync_items_server_version_seq')
where server_version is null;

alter table public.dicta_sync_items
alter column server_version set not null;

create or replace function public.dicta_sync_items_touch_server_version()
returns trigger
language plpgsql
as $$
begin
  new.server_version := nextval('public.dicta_sync_items_server_version_seq');
  return new;
end;
$$;

drop trigger if exists dicta_sync_items_touch_server_version_trigger on public.dicta_sync_items;

create trigger dicta_sync_items_touch_server_version_trigger
before insert or update on public.dicta_sync_items
for each row
execute function public.dicta_sync_items_touch_server_version();

create index if not exists dicta_sync_items_profile_server_version_idx
on public.dicta_sync_items (profile_id, server_version);

create index if not exists dicta_sync_items_tombstone_expiry_idx
on public.dicta_sync_items (((payload->>'tombstoneExpiresAt')))
where payload->>'deleted' = 'true';

-- Remote enforcement: completed/error sessions older than 20 days become tombstones.
-- Keep ready/running/paused rows intact.
update public.dicta_sync_items
set
  payload = jsonb_build_object(
    'id', item_key,
    'deleted', true,
    'deletedAt', now(),
    'updatedAt', now(),
    'tombstoneExpiresAt', now() + interval '30 days'
  ),
  updated_at = now()
where item_type = 'session'
  and coalesce(payload->>'deleted', 'false') <> 'true'
  and coalesce(payload->>'status', '') in ('finished', 'error')
  and coalesce(
    nullif(payload #>> '{telemetry,finishedAt}', '')::timestamptz,
    nullif(payload ->> 'updatedAt', '')::timestamptz,
    nullif(payload ->> 'createdAt', '')::timestamptz
  ) < now() - interval '20 days';

-- Tombstones older than 30 days can be removed. Clients whose last successful
-- sync is older than this window must full-refresh before pushing local rows.
delete from public.dicta_sync_items
where item_type = 'session'
  and payload->>'deleted' = 'true'
  and coalesce(
    nullif(payload->>'tombstoneExpiresAt', '')::timestamptz,
    nullif(payload->>'deletedAt', '')::timestamptz + interval '30 days'
  ) < now();
""",
    )


def update_docs() -> None:
    doc_paths = [
        "README.md",
        "AGENTS.md",
        "docs/architecture.md",
        "docs/adaptive-training-cycle.md",
        "docs/listening-first-architecture.md",
        "docs/adaptive-listening-brain.md",
        "docs/listening-cycle-v3-architecture.md",
    ]

    replacements = [
        ("rollingWindowDays: 30", "rollingWindowDays: 20"),
        ("**30 days**", "**20 days**"),
        ("**30-day", "**20-day"),
        ("30-day rolling", "20-day rolling"),
        ("30-day adaptive", "20-day adaptive"),
        ("30-day benchmark", "20-day benchmark"),
        ("30-day retention", "20-day retention"),
        ("30 days based on last activity", "20 days based on last activity"),
        ("retained for 30 days", "retained for 20 days"),
        ("last 30 days", "last 20 days"),
        ("also mean 30 days", "also mean the last 20 days"),
        ("also mean the last 30 days", "also mean the last 20 days"),
    ]

    for path in doc_paths:
        p = ROOT / path
        if not p.exists():
            print(f"skipped missing doc {path}")
            continue
        content = p.read_text(encoding="utf-8")
        original = content
        for old, new in replacements:
            content = content.replace(old, new)

        # Avoid accidentally changing explicit tombstone language once the new policy is added.
        content = content.replace("90 days", "30 days")
        content = content.replace("90-day", "30-day")

        marker = "Supabase tombstones are retained for **30 days**."
        if marker not in content and path in {"README.md", "AGENTS.md", "docs/architecture.md"}:
            content += """

## Retention and sync-resurrection guard

Dicta uses a **20-day active data window** for adaptive benchmark telemetry, completed/error session payloads, saved session telemetry, and session feedback. Supabase tombstones are retained for **30 days**. A browser profile with a prior successful sync older than the 30-day tombstone window must full-refresh from Supabase before pushing local rows, using `lastSuccessfulSyncAt` and `server_version` as the anti-resurrection guard.
"""

        if content != original:
            p.write_text(content, encoding="utf-8")
            print(f"updated {path}")
        else:
            print(f"unchanged {path}")


def main() -> int:
    update_code_constants()
    add_sync_retention_policy()
    update_supabase_sync_types()
    update_pull_rows()
    update_delete_session_row()
    update_push_rows()
    add_sync_manifest()
    update_pull_sync_runtime()
    add_supabase_migration()
    update_docs()

    print()
    print("Retention 20/30 patch applied.")
    print("Next checks:")
    print("  git grep -nE \"30 days|30-day|90 days|90-day|rollingWindowDays: 30|ROLLING_WINDOW_DAYS|SESSION_RETENTION_DAYS\"")
    print("  npm test")
    print("  npm run build")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

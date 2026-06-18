from pathlib import Path
import re

ROOT = Path.cwd()

def p(path):
    return ROOT / path

def read(path):
    return p(path).read_text(encoding="utf-8")

def write(path, text):
    p(path).parent.mkdir(parents=True, exist_ok=True)
    p(path).write_text(text, encoding="utf-8")
    print(f"updated {path}")

def replace(path, old, new, required=False):
    file = p(path)
    if not file.exists():
        print(f"missing {path}")
        return
    text = read(path)
    if old not in text:
        if required:
            raise RuntimeError(f"not found in {path}: {old}")
        print(f"skip {path}: {old[:60]}")
        return
    write(path, text.replace(old, new))

def replace_many(path, pairs):
    file = p(path)
    if not file.exists():
        print(f"missing {path}")
        return
    text = read(path)
    original = text
    for old, new in pairs:
        text = text.replace(old, new)
    if text != original:
        write(path, text)
    else:
        print(f"unchanged {path}")

# 1) Core retention constants
replace(
    "src/core/adaptive/inputLanguageBenchmarkDefaults.ts",
    "export const ROLLING_WINDOW_DAYS = 30 as const;",
    "export const ROLLING_WINDOW_DAYS = 20 as const;",
    required=True,
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
    required=True,
)

# 2) User-facing source/test strings and types
source_pairs = [
    ("30 days", "20 days"),
    ("30-day", "20-day"),
    ("last 30 days", "last 20 days"),
    ("rollingWindowDays: 30", "rollingWindowDays: 20"),
    ("rollingWindowDays: 30;", "rollingWindowDays: 20;"),
    ("uses a rolling 30-day window", "uses a rolling 20-day window"),
    ("older than the 30-day retention window", "older than the 20-day retention window"),
    ("expect(SESSION_RETENTION_DAYS).toBe(30);", "expect(SESSION_RETENTION_DAYS).toBe(20);"),
]

for path in [
    "src/app/adaptiveFeedbackContext.ts",
    "src/components/adaptive-workspace/AdaptiveBenchmarkProfileCockpit.tsx",
    "src/core/adaptive/adaptiveUserSystemReportEnvironment.ts",
    "src/core/adaptive/types/benchmark.ts",
    "tests/adaptiveExportPackages.test.ts",
    "tests/helpers/adaptiveUserSystemReportHarness.ts",
    "tests/liveMetrics.test.ts",
    "tests/sessionRetentionPolicy.test.ts",
]:
    replace_many(path, source_pairs)

# 3) Docs: 20-day active window, 30-day tombstones
doc_pairs = [
    ("rollingWindowDays: 30", "rollingWindowDays: 20"),
    ("30 rolling days", "20 rolling days"),
    ("30-day rolling", "20-day rolling"),
    ("30-day adaptive", "20-day adaptive"),
    ("30-day benchmark", "20-day benchmark"),
    ("30-day retention", "20-day retention"),
    ("30-day month views", "20-day month views"),
    ("30 days based on last activity", "20 days based on last activity"),
    ("retained for 30 days", "retained for 20 days"),
    ("older than 30 days", "older than 20 days"),
    ("last 30 days", "last 20 days"),
    ("also mean 30 days", "also mean the last 20 days"),
    ("also mean the last 30 days", "also mean the last 20 days"),
    ("30 days is the retention window for application activity data", "20 days is the retention window for application activity data"),
    ("**30 days** is the retention window for application activity data", "**20 days** is the retention window for application activity data"),
    ("**90 days** is the retention window for tombstones", "**30 days** is the retention window for tombstones"),
    ("Tombstones/deletion metadata | 90 days", "Tombstones/deletion metadata | 30 days"),
    ("kept for 90 days", "kept for 30 days"),
    ("90 days", "30 days"),
    ("90-day", "30-day"),
]

for path in [
    "README.md",
    "AGENTS.md",
    "docs/architecture.md",
    "docs/data-retention-policy.md",
    "docs/adaptive-training-cycle.md",
    "docs/listening-first-architecture.md",
    "docs/adaptive-listening-brain.md",
    "docs/listening-cycle-v3-architecture.md",
]:
    replace_many(path, doc_pairs)

# 4) Add shared sync retention policy
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

# 5) Add tombstoneExpiresAt to deleted session rows
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
    "      deleted: true,\n      deletedAt,\n      updatedAt: deletedAt,",
    "      deleted: true,\n      deletedAt,\n      tombstoneExpiresAt,\n      updatedAt: deletedAt,",
)

# 6) server_version type and pull options
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

# 7) Migration
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

delete from public.dicta_sync_items
where item_type = 'session'
  and payload->>'deleted' = 'true'
  and coalesce(
    nullif(payload->>'tombstoneExpiresAt', '')::timestamptz,
    nullif(payload->>'deletedAt', '')::timestamptz + interval '30 days'
  ) < now();
""",
)

print("")
print("DONE retention 20/30 base patch")

# Dicta Storage Architecture

Dicta keeps large local working-copy payloads out of `localStorage` so browser quota failures cannot crash the React runtime.

## Why not localStorage

`localStorage` is synchronous, small, and quota-constrained. Large sessions, telemetry, adaptive benchmarks, and feedback can make `setItem` throw `QuotaExceededError`, blocking the main thread and interrupting training/dashboard flows. Dicta now treats `localStorage` as a small manifest/preferences layer only.

## Storage owners

| Data category | Storage owner | Retention | Notes |
| --- | --- | --- | --- |
| User/account identity | Supabase Auth/Profile tables | Indefinite | Not part of 20/30 cleanup. |
| Minimal settings | localStorage or profile config | Indefinite | Small only. |
| Active sessions | IndexedDB + Supabase sync payload | 20 rolling days | `finished`/`error` only; `ready`/`running`/`paused` do not expire by age. |
| Running/paused sessions | IndexedDB + Supabase | Indefinite by age | Until completed/deleted. |
| Raw telemetry | IndexedDB + Supabase embedded in session | 20 rolling days | Deleted with active session payload. |
| Adaptive feedback | IndexedDB + Supabase | 20 rolling days | Used for tuning. |
| Benchmarks/stats | IndexedDB/local aggregates + Supabase if synced | 20 rolling days | Dashboard values are derived, not hard quotas. |
| Tombstones | IndexedDB + Supabase | 30 days | Prevents resurrection. |
| Sync manifest | localStorage | Small, indefinite | `lastSuccessfulSyncAt` / `lastServerVersion`. |

## localStorage

Allowed localStorage payloads are small:

- active profile/sync marker
- UI preferences and theme
- Supabase sync manifest
- IndexedDB migration manifest
- small OpenRouter job/model pointers
- import/export compatibility keys during guarded legacy migration only

Remaining writes use safe helpers so quota or browser storage exceptions do not crash React.

## IndexedDB

The local working copy lives in the versioned `dicta-local` IndexedDB database:

- `sessions`
- `adaptiveBenchmarks`
- `adaptiveSessionFeedback`
- `syncTombstones`
- `storageManifest`

The browser runtime hydrates IndexedDB asynchronously, keeps React arrays in memory, and persists later changes back to IndexedDB after state changes. This avoids a synchronous payload parse/write during render and keeps dashboard startup local-first.

## Supabase

Supabase remains the cross-device sync ledger:

- `dicta_sync_items`
- `server_version`
- remote tombstones
- stale-client full-refresh guard

The remote contract is unchanged: local React/IndexedDB state builds the same `DictaSyncState`, pushes pending rows, pulls Supabase rows, merges them in memory, and persists the merged working copy locally. Dashboard render does not depend directly on Supabase for initial local state.

## Hydration flow

1. Read small localStorage profile and sync markers.
2. Migrate legacy large localStorage keys for the active profile if present.
3. Load sessions, benchmarks, feedback, and tombstones from IndexedDB.
4. Apply retention and tombstone filtering.
5. Publish the hydrated state to React.
6. Enable Supabase initial pull only after local hydration is ready.

## Sync flow

1. React state changes are persisted to IndexedDB.
2. The existing sync builder creates `DictaSyncState`.
3. Supabase push writes active rows and tombstones.
4. Supabase pull merges remote rows into React state.
5. The merged state is persisted back to IndexedDB.

## Retention

- Active `finished` and `error` session payloads expire after 20 rolling days by last activity.
- `ready`, `running`, and `paused` sessions are preserved regardless of age.
- Adaptive feedback and benchmark activity use the 20-day policy.
- Tombstones are retained for 30 days.
- Accounts, profiles, roles, access metadata, and minimal settings are indefinite.

## Legacy migration

The IndexedDB migration reads these legacy keys when present:

- `dicta.sessions.v1`
- `dicta.deletedSessionIds.v1`
- `dicta.adaptiveBenchmarks.v1`
- `dicta.adaptiveSessionFeedback.v1`
- matching `dicta.profileStorage.v1.*` snapshots

Migration is idempotent. Dicta writes IndexedDB first, writes the small `dicta.indexedDbMigration.v1` manifest, and only then removes migrated large legacy keys. If IndexedDB fails, legacy payloads are preserved for retry/fallback.

## IndexedDB failure

If IndexedDB is unavailable or a write fails, Dicta logs a `[DictaStorage]` warning, keeps the app running, and does not delete legacy localStorage payloads during migration. Supabase sync can still recover remote rows when authenticated.

## Diagnostics

In DevTools:

1. Inspect Application > IndexedDB > `dicta-local` for working-copy payloads.
2. Inspect Application > Local Storage for small manifests/preferences only.
3. Use Admin browser storage summary to confirm Dicta localStorage bytes stay small.
4. Search console warnings for `[DictaStorage]` when diagnosing blocked storage or quota failures.

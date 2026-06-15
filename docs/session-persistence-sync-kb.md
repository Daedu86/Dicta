# Session persistence sync modularization

Status: ACTIVE REFERENCE
Updated: 2026-06-15

The public entrypoint is `src/app/useSessionPersistenceSync.ts`. The runtime implementation lives under `src/app/sessionPersistenceSync/`.

Current owners:

- `useSessionPersistenceSyncRuntime.ts`: coordinates the sync runtime.
- `sessionPersistenceLocalStorage.ts`: local save, debounce, flush, and quota recovery.
- `sessionPersistenceProfileSwitch.ts`: profile-scoped localStorage switching.
- `sessionPersistenceSupabasePull.ts`: Supabase pull and merge.
- `sessionPersistenceSupabasePush.ts`: Supabase push/delete/background push.
- `sessionPersistenceSupabaseReset.ts`: sync identity/status reset.
- `sessionPersistenceSupabaseAccessToken.ts`: access-token ref for keepalive.
- `sessionPersistencePendingCriticalRuntime.ts`: pending critical rows and keepalive execution.
- `sessionPersistenceLifecycle.ts`: pagehide/beforeunload/visibility flush.
- `sessionPersistenceSyncActions.ts`: immediate sync actions.

Validation:

- Start with `tests/useSessionPersistenceSync.test.ts`.
- Add `tests/supabaseSync.test.ts` for Supabase behavior.
- Add `tests/profileScopedStorage.test.ts` for profile storage behavior.

Guidance: persistence sync is not a pending monolith extraction anymore. Future work should be narrow, characterized, and behavior-preserving unless the task explicitly targets sync behavior.

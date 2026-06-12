# PendingSessionLane Modularization

`PendingSessionLane` is the pending-session strip shown in the main app shell before the active runtime workspace. This pass reused the existing training component and removed the duplicate inline implementation from `src/App.tsx`.

## Boundary

Runtime boundary: browser UI only.

Adaptive profiles affected: none. No `(inputMode, language)` benchmark, telemetry, recommendation, or session-feedback behavior changed.

Security and persistence impact: none. Auth, secrets, rate limits, Supabase/RLS, server routes, localStorage persistence, sync tombstones, local-only sidecars, and PWA typing performance were not changed.

## Files

Changed files:

```text
src/App.tsx
docs/app-shell-modularization-map.md
docs/pending-session-lane-modularization.md
```

Reused component:

```text
src/components/training/PendingSessionLane.tsx
```

## Completed Patch

- Imported `PendingSessionLane` from `src/components/training/PendingSessionLane.tsx`.
- Removed the duplicate inline `PendingSessionLaneProps` type from `src/App.tsx`.
- Removed the duplicate inline `PendingSessionLane` function from `src/App.tsx`.
- Removed the pending-session-only `getPendingSessionReason` helper from `src/App.tsx`.
- Kept `pendingSessions`, `activeSessionId`, `openWorkspaceForSession`, and `deleteSession` in `src/App.tsx`.

## Preserved Behavior

- The lane still renders nothing when there are no pending sessions.
- Pending-session chips still show the title, input mode, language, difficulty, and reason.
- Opening a pending session still calls the app-owned workspace routing callback.
- Deleting a pending session still calls the app-owned delete callback.
- Session persistence, Supabase sync, tombstones, training lifecycle, OpenRouter generation, admin behavior, and adaptive pacing were not changed.

## Impact

Fresh pre-pass `src/App.tsx` size:

```text
9,636 physical lines
```

Post-pass `src/App.tsx` size:

```text
9,565 physical lines
```

Net reduction:

```text
71 lines
```

## Validation

Required validation for this code change:

```bash
npm run test -- --reporter=verbose
npm run build
```

Browser verification is a useful quick check because this is a visible shell UI extraction.

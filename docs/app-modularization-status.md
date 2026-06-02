# App modularization status

_Last updated: 2026-06-02_

## Current status

`src/App.tsx` is still large, but the latest pass successfully reduced it by closing the `AdminWorkspace` UI modularization.

Current `src/App.tsx` size on `main`:

```text
12,570 lines
```

Baseline before the AdminWorkspace extraction pass, using commit `f5e915b24c9bbbcbf29cc8362ef6325e90895952`:

```text
12,882 lines
```

Net reduction in `src/App.tsx` from the AdminWorkspace pass:

```text
312 lines
```

This is a net App.tsx reduction after adding imports and keeping the remaining sensitive orchestration in place. The extracted component source now lives under `src/components/admin/`, so the total repository line count increased while `App.tsx` became smaller and more compositional.

## Completed modularization areas

### Training UI

Status: complete enough.

The Training UI has already been modularized and should not be reopened unless a regression requires it.

### OpenRouter UI

Status: complete enough.

OpenRouter UI lives under:

```text
src/components/openrouter/
```

OpenRouter should not be reopened unless a regression requires it.

### AdminWorkspace UI

Status: complete enough / closed.

The AdminWorkspace extraction pass is closed. The closeout plan is documented in:

```text
docs/admin-workspace-modularization.md
```

Admin UI components now live under:

```text
src/components/admin/
```

Extracted Admin components:

- `AdminHeader.tsx`
- `AdminKpiGrid.tsx`
- `AdminUsersCard.tsx`
- `AdminMemberAccessCard.tsx`
- `AdminCreateUserCard.tsx`
- `AdminManualInputSessionCard.tsx`
- `AdminBrowserStorageCard.tsx`
- `AdminProjectFilesCard.tsx`
- `AdminSessionInventoryCard.tsx`

The final Admin UI extraction commit was:

```text
0f4c0e2e0c1788fa5948a75ea003602e17266355
Extract AdminSessionInventoryCard component
```

The docs closeout commit was:

```text
40944d5d28b8b719c2a33f08bac2e2278c7b42f1
Close AdminWorkspace modularization plan
```

## Guardrails preserved during AdminWorkspace extraction

The Admin pass intentionally avoided behavior changes. In particular:

- `api/admin/users.js` was not changed.
- `api/_securityEvents.js` was not changed.
- `fetch('/api/admin/users', ...)` stayed inside `createDictaUser()` in `AdminWorkspace`.
- `createDictaUser()` stayed in `AdminWorkspace`.
- `saveProfileAccess()` stayed in `AdminWorkspace`.
- `onUpdateProfileAccess(...)` did not move.
- Auth headers were not changed.
- Supabase access behavior was not changed.
- Security-event behavior was not changed.
- localStorage import/export behavior was not changed.
- `importInputRef` stayed in `AdminWorkspace`.

`AdminWorkspace` should now be treated as an orchestration layer that composes Admin UI cards and retains sensitive state/handler ownership.

## Known follow-ups

These are not blockers and should be separate from future feature work:

1. Improve `AdminSessionInventoryCard` typing by moving shared session/admin types to a stable module. The current extraction intentionally avoided exporting `StoredSession` from `App.tsx` during the UI pass.
2. Consider shared admin formatting helpers only if byte/date formatter duplication starts causing maintenance friction.
3. Consider an Admin state hook only as a separate refactor after the UI modularization remains stable.

## Recommended next block

The next likely candidate is `SessionDashboard`, because it is the next large UI-heavy block after `AdminWorkspace` in `src/App.tsx`.

Before extracting code from `SessionDashboard`, create a docs-only plan that measures its size, identifies subcomponents, and defines a safe extraction order.

Recommended next docs-only file:

```text
docs/session-dashboard-modularization.md
```

Do not begin `SessionDashboard` extraction until that plan exists.

## Validation standard for future code patches

For every future code extraction, run:

```bash
npm run test -- --reporter=verbose
npm run build
```

For docs-only status updates, runtime validation is not required, but the diff should be restricted to `docs/`.

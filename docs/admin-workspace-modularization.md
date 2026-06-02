# AdminWorkspace modularization plan

## Goal

Continue reducing `src/App.tsx` through incremental Admin UI extraction without changing runtime behavior.

`AdminWorkspace` is the next recommended extraction target after the Training UI and OpenRouter UI modularization work. The Training and OpenRouter blocks should stay closed unless a regression makes them relevant again.

## Current location

`AdminWorkspace` currently lives inside `src/App.tsx`, beginning around line 8929 and ending before `SessionDashboard`, around line 9490. It is roughly 560 lines and contains the Admin workspace UI, local form state, and several sensitive admin actions.

## Non-goals and guardrails

Do not combine modularization with behavior changes.

Do not change or move any of the following during the first extraction patches:

- `api/admin/users.js`
- `api/_securityEvents.js`
- Supabase access behavior
- auth header construction or propagation
- security-event behavior
- admin `fetch('/api/admin/users', ...)`
- `onUpdateProfileAccess(...)`
- localStorage import/export behavior
- OpenRouter access mutation behavior

The first patches should be UI-only extractions. They should not alter data flow, persistence, auth, server routes, security logging, or admin mutation semantics.

## Sensitive zones to leave in place initially

### Create user

This flow calls `fetch('/api/admin/users', ...)`, uses admin auth headers, and reaches the Supabase admin user route. Leave the logic in `AdminWorkspace` until the surrounding UI-only components are already stable.

### Member profile access

This flow calls `onUpdateProfileAccess(...)` and mutates member access fields:

- `canAccessOpenRouter`
- `assignedOpenRouterModel`
- `sessionLimit`

Leave this logic in `AdminWorkspace` until after smaller visual components have been extracted and validated.

### localStorage import

This flow calls `onImportLocalStorage(await file.text())` and participates in local state restoration. Leave import/export handling in place during the first extractions.

## Internal state and hooks to preserve

The current component owns local Admin form and access state. Preserve behavior and avoid moving these items until the relevant card extraction is explicitly planned:

- `importInputRef`
- `manualInput1Name`
- `newUserEmail`
- `newUserPassword`
- `newUserDisplayName`
- `newUserProfileId`
- `newUserRole`
- `newUserMessage`
- `newUserBusy`
- `accessDrafts`
- `accessBusyProfileId`
- `accessMessage`
- `memberProfiles`
- `memberModelOptions`

## Recommended extraction order

### 1. AdminHeader

Create:

```text
src/components/admin/AdminHeader.tsx
```

Extract only the visual Admin header:

- eyebrow: `Storage control`
- title: `Admin`
- meta text
- signed-in profile line
- language tabs
- `Back to training` button

Probable props:

- `appProfile`
- `languageView`
- `onChangeLanguage`
- `onBackToTraining`

This component must not touch:

- Supabase
- auth headers
- admin fetch calls
- profile mutation
- localStorage import/export
- OpenRouter access mutation
- security events

### 2. AdminKpiGrid

Create:

```text
src/components/admin/AdminKpiGrid.tsx
```

Extract only the Admin KPI grid:

- Sessions
- Finished
- LocalStorage
- Sync
- Transcript words
- Telemetry samples
- Actions
- TTS chunks
- Audio refs

Probable props:

- `summary`
- `syncStatus`

This component may use existing formatting helpers only if doing so does not change behavior. Keep the first patch minimal and prefer passing already-compatible data over reorganizing logic.

### 3. AdminUsersCard

Evaluate after `AdminHeader` and `AdminKpiGrid` are merged and validated. This is still mostly UI, but it includes profile filtering and visible profile rendering, so keep it separate.

### 4. AdminMemberAccessCard

Move only after the earlier UI-only extractions are stable. This area is more sensitive because it manages member OpenRouter access, model assignment, and session limits.

### 5. Remaining cards

Extract later, one at a time:

- `AdminCreateUserCard`
- `AdminManualInputSessionCard`
- `AdminBrowserStorageCard`
- `AdminProjectFilesCard`
- `AdminSessionInventory`

Each card should be extracted in its own commit unless there is a strong reason not to.

## Validation requirements

For every code patch, run:

```bash
npm run test -- --reporter=verbose
npm run build
```

For this docs-only plan commit, no runtime validation is required because no executable source files are changed.

## Commit workflow

Use small commits:

1. docs-only planning commit
2. `Extract AdminHeader`
3. `Extract AdminKpiGrid`
4. follow-up extractions one component at a time

After each code extraction, push to `origin main` and check Vercel/CI when available.

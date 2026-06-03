# App.tsx measurement after AudioPracticeCard

_Last measured: 2026-06-03_

This is a docs-only measurement after `AudioPracticeCard` was extracted.

Current `src/App.tsx` size reported by the implementation pass:

```text
9,620 lines
```

## Completed recent extraction chain

```text
src/components/runtime-workspaces/BrowserTtsSourceCard.tsx
src/components/runtime-workspaces/BrowserTtsPracticeCard.tsx
src/components/runtime-workspaces/BrowserTtsSetupCard.tsx
src/components/runtime-workspaces/KokoroSourceCard.tsx
src/components/runtime-workspaces/KokoroPracticeCard.tsx
src/components/runtime-workspaces/KokoroSetupCard.tsx
src/components/runtime-workspaces/Input4SetupCard.tsx
src/components/runtime-workspaces/AudioInputSetupCard.tsx
src/components/runtime-workspaces/AudioSourceCard.tsx
src/components/runtime-workspaces/AudioPracticeCard.tsx
src/components/runtime-workspaces/SessionCreateCard.tsx
src/components/runtime-workspaces/LiveMetricsDock.tsx
src/components/leaderboard/LeaderboardWorkspace.tsx
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

## Current reading

The default Input #1 audio runtime UI is now split into setup, source, and practice cards. Browser TTS, Kokoro, Input #4 setup, runtime live metrics, session creation, leaderboard, and adaptive advanced diagnostics are also extracted enough for this pass.

The remaining large inline `App.tsx` areas are no longer simple runtime cards. The most coherent remaining render candidate is the auth/sign-in route, but it touches Supabase auth flow state and must be planned separately.

## Remaining candidates

### 1. Auth/sign-in route

Approximate area:

```text
src/App.tsx:6600-6825
```

Observed UI:

- `syncConfig.authRequired` gate;
- main auth layout wrapper;
- Dicta access header;
- auth-loading state;
- app-profile loading state;
- local-storage preparation state;
- profile-error/sign-out branch;
- update-password form;
- forgot-password form;
- sign-in form;
- auth message/error rendering;
- `PerfDiagnosticsOverlay` remains outside/after the auth panel.

Possible target:

```text
src/components/auth/AuthWorkspace.tsx
```

Risk: medium-high.

Rationale: visually cohesive, but behavior-adjacent. It touches Supabase auth state, password update/reset flows, sign-in form state, sign-out behavior, app-profile loading, and local storage readiness.

Recommendation: create/use a dedicated `docs/auth-workspace-modularization.md` plan before moving code. If implemented, extract only the UI/render branch and keep all auth callbacks/state in `App.tsx`.

### 2. RuntimeWorkspaceHeader

Approximate area:

```text
src/App.tsx:7050-7240
```

Possible target:

```text
src/components/runtime-workspaces/RuntimeWorkspaceHeader.tsx
```

Risk: low.

Rationale: small cleanup only. The remaining header duplication is lower value than auth. Do not choose this as the next size-reduction step unless the goal is cosmetic cleanup.

### 3. AdminWorkspace second pass

Observed area:

```text
src/App.tsx after main App return
```

Risk: high.

Rationale: Admin UI cards are extracted, but `AdminWorkspace` still owns local admin form state and sensitive admin calls. It was previously marked complete enough / closed. Do not reopen without a dedicated second-pass admin state plan.

### 4. Remaining orchestration/data sections

`App.tsx` still owns large state, derived values, callbacks, controller plumbing, persistence, sync, OpenRouter job flows, and admin/auth orchestration. These should not be moved as UI modularization.

## Recommendation

Recommended next planning target:

```text
docs/auth-workspace-modularization.md
```

Recommended next code extraction only after that plan is accepted:

```text
src/components/auth/AuthWorkspace.tsx
```

Do not extract `RuntimeWorkspaceHeader` or reopen AdminWorkspace before the auth plan is evaluated.

## Stop conditions

Stop before moving code if:

- the component would own Supabase auth mutation logic;
- the component would own profile/local-storage readiness logic;
- the component would move sign-in/password-reset/password-update handlers out of `App.tsx`;
- the prop surface becomes broader than the auth JSX it replaces;
- the diff touches runtime, adaptive, OpenRouter, Admin, API routes, persistence, or sync;
- tests/build failures require behavior changes.

## Validation for future code patches

```bash
npm run test -- --reporter=verbose
npm run build
wc -l src/App.tsx
git diff --stat
git status --short
```

This measurement is docs-only; runtime validation is not required for this file.

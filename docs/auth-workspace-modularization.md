# AuthWorkspace modularization plan

_Last updated: 2026-06-04_

## Status

Complete. The auth/sign-in route branch was extracted as a UI-only component.

This plan covers the inline auth/sign-in route branch in `src/App.tsx` after the runtime, leaderboard, and adaptive diagnostics extraction passes.

Fresh pre-extraction `src/App.tsx` size:

```text
9,228 lines
```

Current `src/App.tsx` size after the AuthWorkspace extraction:

```text
9,149 lines
```

Net `App.tsx` reduction from this extraction:

```text
79 lines
```

## Proposed target

```text
src/components/auth/AuthWorkspace.tsx
```

Optional support folder:

```text
src/components/auth/
```

## Why this candidate

The post-AudioPracticeCard measurement identifies the auth/sign-in route as the next most coherent remaining render branch. It is visually cohesive and separated from the main app shell by an early return.

However, it is behavior-adjacent because it displays Supabase auth states and calls auth handlers.

## Current approximate range

```text
Historical pre-extraction range: src/App.tsx:6876-6987
```

The inline range no longer exists in `App.tsx`; the auth UI now lives in `src/components/auth/AuthWorkspace.tsx`.

## Observed UI scope

The target branch starts at the auth-required gate:

```tsx
if (syncConfig.authRequired && (...)) {
  return (
    <main className={`app auth-app ...`}>
      <section className="auth-panel">
        ...
      </section>
      <PerfDiagnosticsOverlay enabled={perfDiagnosticsEnabled} />
    </main>
  );
}
```

The auth panel includes:

- brand mark;
- `Dicta access` header;
- sign-in description;
- checking-session state;
- loading-profile state;
- local-storage preparation state;
- app profile error + sign-out branch;
- update-password form;
- forgot-password form;
- sign-in form;
- auth message/error rendering.

## Risk level

Risk: medium-high.

The UI is cohesive, but the branch touches auth state, auth view state, password reset/update flows, sign-in form state, profile loading, local storage readiness, and sign-out behavior.

The extraction is acceptable only if it remains UI-only and all auth behavior/state ownership stays in `App.tsx`.

## Boundary

Move only the auth route render branch into `AuthWorkspace`.

Keep in `App.tsx`:

- `syncConfig.authRequired` gate logic;
- `authLoading` state;
- `authView` state;
- `authSession` state;
- `appProfile` state;
- `appProfileError` state;
- `localStorageReadyForEffectiveProfile` state;
- `effectiveProfileId` derivation;
- `authEmail` state;
- `authPassword` state;
- `authNewPassword` state;
- `authNewPasswordConfirm` state;
- `authBusy` state;
- `authMessage` / `authMessageTone` / `authError` state;
- `signInWithSupabase` implementation;
- `requestSupabasePasswordReset` implementation;
- `updateSupabasePassword` implementation;
- `signOut` implementation;
- `showAuthView` implementation;
- theme state;
- profile/localStorage readiness logic;
- persistence/sync/localStorage.

Pass explicit props/callbacks to the new component.

## Do not change

Do not change:

- auth gating semantics;
- sign-in behavior;
- forgot-password behavior;
- update-password behavior;
- sign-out behavior;
- profile loading/error behavior;
- local-storage preparation behavior;
- form `autoComplete`, `required`, and `minLength` attributes;
- disabled logic;
- visible copy;
- class names;
- aria labels if present;
- titles/tooltips if present;
- theme classes;
- `PerfDiagnosticsOverlay` behavior.

## Expected prop groups

### State/data props

- `themeMode`
- `authLoading`
- `authView`
- `authSession`
- `appProfile`
- `appProfileError`
- `localStorageReadyForEffectiveProfile`
- `effectiveProfileId`
- `authEmail`
- `authPassword`
- `authNewPassword`
- `authNewPasswordConfirm`
- `authBusy`
- `authMessage`
- `authMessageTone`
- `authError`
- `perfDiagnosticsEnabled`

### Callback props

- `onSignIn`
- `onRequestPasswordReset`
- `onUpdatePassword`
- `onSignOut`
- `onShowAuthView`
- `onAuthEmailChange`
- `onAuthPasswordChange`
- `onAuthNewPasswordChange`
- `onAuthNewPasswordConfirmChange`

## Type guidance

Prefer narrow local structural types in `AuthWorkspace.tsx`.

Do not export broad App-local auth/profile types from `App.tsx`.

For `authSession` and `appProfile`, use only the fields rendered by the component. If the component only tests truthiness and renders `appProfile.displayName`, use a narrow structural shape.

## Recommended extraction strategy

### Step 1: AuthWorkspace

Create:

```text
src/components/auth/AuthWorkspace.tsx
```

Status: complete.

Move only the auth early-return JSX into the new component.

Keep the `if (syncConfig.authRequired && ...)` condition in `App.tsx`; only replace the returned JSX with `<AuthWorkspace ... />`.

Keep `PerfDiagnosticsOverlay` behavior unchanged. The extracted component imports the existing overlay and receives `perfDiagnosticsEnabled` as an explicit prop.

### Step 2: stop and measure

Status: complete.

After AuthWorkspace, stop and measure before choosing another extraction.

## Completed scope

Moved to `src/components/auth/AuthWorkspace.tsx`:

- auth layout wrapper and panel markup;
- brand mark and `Dicta access` header;
- checking-session, loading-profile, local-storage preparation, and profile-error display states;
- update-password form;
- forgot-password form;
- sign-in form;
- auth message/error rendering;
- `PerfDiagnosticsOverlay` usage through the existing overlay component.

Left in `src/App.tsx`:

- `syncConfig.authRequired` gate logic;
- Supabase session/profile state;
- auth form state;
- auth message/error state;
- local-storage profile readiness derivation;
- `signInWithSupabase`;
- `requestSupabasePasswordReset`;
- `updateSupabasePassword`;
- `signOut`;
- `showAuthView`;
- persistence, sync, localStorage, API routes, and Supabase behavior.

## Validation

For any code patch:

```bash
npm run test -- --reporter=verbose
npm run build
wc -l src/App.tsx
git diff --stat
git status --short
```

Validation result for the completed patch:

```text
npm run test -- --reporter=verbose
52 test files passed, 377 tests passed

npm run build
passed

Browser verification against the built dist app
title: Dicta
expected UI present: true
console errors: 0
```

## Stop conditions

Stop and do not extract if:

- the component needs to own Supabase auth mutation logic;
- the component needs to derive app profile readiness or local storage readiness internally;
- TypeScript requires broad App-local profile/auth types;
- the diff changes form behavior, disabled logic, or auth view switching;
- the diff touches runtime, adaptive, OpenRouter, Admin, API routes, persistence, or sync;
- tests/build failures require behavior changes.

## Recommendation

Completed:

```text
src/components/auth/AuthWorkspace.tsx
```

Stop for a fresh measurement before selecting another App.tsx extraction candidate.

# AppShellHeader modularization plan

_Last updated: 2026-06-07_

## Status

Complete. The main app shell header was extracted as a UI-only component.

The shell header now exposes only the focused mobile training entrypoint. The previous separate desktop training entrypoint has been removed from the header component, `src/App.tsx`, the public workspace-routing helper surface, and this documentation. Keep `/training` and `Training Mode (Mobile ver)` intact because they are the supported training route and button.

This plan covers the main app shell header in `src/App.tsx` after the AuthWorkspace extraction.

Fresh pre-extraction `src/App.tsx` size:

```text
9,149 lines
```

Current `src/App.tsx` size after the AppShellHeader extraction:

```text
9,069 lines
```

Net `App.tsx` reduction from this extraction:

```text
80 lines
```

## Proposed target

```text
src/components/app-shell/AppShellHeader.tsx
```

## Why this candidate

The auth route, leaderboard, runtime cards, adaptive diagnostics, and OpenRouter/Admin child cards are already extracted enough for the current pass.

The next coherent low-risk render candidate is the main app shell header:

```text
src/App.tsx:6923-7071
```

It is mostly presentational navigation/status UI and can accept the existing `SessionCreateCard` as `children`.

## Boundary

Move only the visual app shell header into `AppShellHeader`.

Keep in `App.tsx`:

- workspace routing state and `setWorkspaceMode`;
- dashboard session selection state and `setDashboardSessionId`;
- focused training navigation;
- adaptive flow workspace opening behavior;
- admin and OpenRouter access decisions;
- theme state;
- sign-out behavior;
- sync status derivation;
- build-info constants;
- session creation/import state, validation, and callbacks;
- persistence, sync, auth, server/API behavior, and adaptive state.

The component receives explicit display props and callbacks. It should not import App-local types, mutate storage, inspect Supabase auth state, or decide profile access.

## Completed scope

Moved to `src/components/app-shell/AppShellHeader.tsx`:

- brand panel wrapper;
- Dicta title/subtitle and brand mark;
- OpenRouter model status display;
- build-info status display;
- top-level navigation/action buttons;
- theme toggle button;
- sign-out button;
- sync status text rendering;
- `children` slot for the existing session creation card.

Left in `src/App.tsx`:

- all workspace route mutations;
- focused training navigation;
- adaptive flow workspace opening behavior;
- admin/OpenRouter access decisions;
- OpenRouter model status text derivation;
- sync status text derivation;
- theme state mutation;
- sign-out implementation;
- `SessionCreateCard` state, validation, and callbacks.

## Training entrypoints

Supported:

- `Training Mode (Mobile ver)` in `AppShellHeader` opens `/training`.
- `/training` renders the focused training route.

Removed:

- the app shell no longer exposes a separate desktop training button;
- `AppShellHeaderProps` no longer accepts a desktop-training callback;
- `useWorkspaceRouting` no longer returns a dedicated desktop-training navigation helper.

## Do not change

Do not change:

- visible header copy for supported buttons;
- button class names for supported buttons;
- button titles and aria labels;
- sync status text;
- OpenRouter model status text;
- admin/OpenRouter button visibility;
- theme toggle behavior;
- sign-out behavior;
- `SessionCreateCard` behavior;
- adaptive `(inputMode, language)` behavior;
- `/training` focused training behavior.

## Expected props

Data/display:

- `themeMode`
- OpenRouter status visibility, label, title, and set/unset state
- build label/title
- `showAdminButton`
- `showOpenRouterButton`
- sync status state/text
- `children`

Callbacks:

- `onOpenLeaderboard`
- `onOpenMobileTraining`
- `onOpenAdaptiveFlow`
- `onOpenAdmin`
- `onOpenOpenRouter`
- `onToggleTheme`
- `onSignOut`

## Validation

For code patches:

```bash
npm run test -- --reporter=verbose
npm run build
wc -l src/App.tsx
git diff --stat
git status --short
```

Validation result for the completed extraction patch:

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

Validation result for the training-entrypoint cleanup:

```text
npm run build
passed
npm run test -- --reporter=verbose
60 test files passed, 417 tests passed
repository search for removed desktop-training identifiers returned no current matches
```

## Stop conditions

Stop and do not extract if:

- the component needs to own workspace mode state;
- the component needs to derive auth/profile/admin access;
- the component needs to mutate localStorage;
- the component needs to own session creation state or validation;
- the diff touches runtime adapters, adaptive controller logic, Supabase/RLS, API routes, persistence, sync, or training textarea behavior.

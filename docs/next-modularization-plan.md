# CSS modularization status

Updated: 2026-06-11

Branch: `product/input-2`

## Current checkpoint

CSS runtime modularization is complete.

`src/App.css` is now intentionally tiny and acts only as the stylesheet entrypoint:

```css
@import './styles/index.css';
```

`src/styles/index.css` is the ordered cascade manifest for runtime CSS modules.

## Completed result

The former monolithic `src/App.css` has been decomposed into focused modules under `src/styles/`.

The latest completed extraction group ended at:

- `485c617 Extract 640px responsive CSS module`

At that checkpoint:

- `src/App.css` contains no runtime selectors.
- `src/App.css` contains no responsive media blocks.
- `npm run build` passed.
- `origin/product/input-2` was updated.
- Vercel deployed the commit successfully.

## CSS module ownership map

Entrypoint and cascade:

- `src/App.css`: stylesheet entrypoint only.
- `src/styles/index.css`: ordered import manifest.

Core app/shell:

- `src/styles/app-shell.css`
- `src/styles/auth.css`
- `src/styles/shared-controls.css`

Training:

- `src/styles/training-shell.css`
- `src/styles/training-header.css`
- `src/styles/training-session.css`
- `src/styles/training-interaction.css`
- `src/styles/training-responsive.css`

Workspace, TTS, sessions, transcripts:

- `src/styles/workspace-shell.css`
- `src/styles/workspace-responsive.css`
- `src/styles/tts-workspace.css`
- `src/styles/session-status.css`
- `src/styles/transcript-preview.css`
- `src/styles/transcript-review.css`

Sidebar and app chrome:

- `src/styles/sidebar-support.css`
- `src/styles/sidebar-brand.css`
- `src/styles/sidebar-controls.css`

Dashboard/admin/leaderboard:

- `src/styles/dashboard.css`
- `src/styles/dashboard-support.css`
- `src/styles/dashboard-workspace.css`
- `src/styles/today-summary.css`
- `src/styles/admin.css`
- `src/styles/leaderboard.css`
- `src/styles/leaderboard-shell.css`
- `src/styles/leaderboard-empty.css`

Adaptive UI:

- `src/styles/adaptive-workspace.css`
- `src/styles/adaptive-timeline.css`
- `src/styles/adaptive-charts.css`
- `src/styles/bottom-metrics.css`

Responsive/final overrides:

- `src/styles/wide-responsive.css`
- `src/styles/responsive-980.css`
- `src/styles/responsive-640.css`

Diagnostics:

- `src/styles/perf-overlay.css`

## Guardrails for future agents

Do not add runtime CSS back to `src/App.css`.

Use this workflow for future CSS changes:

1. Identify the owning UI boundary.
2. Edit the nearest existing module under `src/styles/`.
3. If a new boundary is needed, create `src/styles/<focused-name>.css`.
4. Add the import to `src/styles/index.css` at the correct cascade position.
5. Run `npm run build`.
6. Keep the commit CSS-focused unless the task explicitly crosses a React/TypeScript boundary.

Cascade rules:

- Do not reorder imports casually.
- Place responsive overrides after the base modules they override.
- Move complete media blocks when possible.
- Do not split mixed media blocks unless the cascade impact has been checked.
- Test visually at desktop and mobile widths when changing app shell, sidebar, training, TTS workspace, dashboard/admin, or adaptive styles.

## Historical note

This document used to track remaining extraction work. It is now a status and guardrail document. Future modularization work should focus on naming cleanup, duplicate-rule review, and import-order clarity, not on removing selectors from `src/App.css`.

<!-- app-shell-modularization-checkpoint:start -->
## App shell modularization checkpoint â€” 2026-06-10

A focused App shell reduction pass continued after the original checkpoint. Current `src/App.tsx` size after the Adaptive advanced diagnostics props extraction is **2682 lines**.

Top-level function inventory:

```text
178:function App() {
```

Detailed checkpoint: `docs/archive/app-shell-modularization-checkpoint.md`.

Before starting a new extraction, score the candidate with `docs/modularization-roi.md`.

Completed extraction groups:

- Admin workspace shell
- Session/debug/type models
- TTS pacing helpers
- Session storage/restore helpers
- Adaptive feedback context helpers
- Shared inline components
- TTS playback profile helpers
- Dictation script semantic phrase helpers
- Repeat word stats helpers
- App runtime helpers
- Dicta UI preferences, auth/profile, model preference/catalog, online/theme, and localStorage import runtime hooks
- Keyboard remap runtime hook
- Adaptive export/copy actions hook
- Supabase auth action handlers hook
- Session creation/import action handlers hook
- Workspace/session state hooks
- Direct OpenRouter generation action handlers hook
- App/workspace prop composition hooks, including Admin, Leaderboard, and Adaptive advanced diagnostics props

Next recommended pass:

1. Inspect remaining declarations and closures inside `function App()`.
2. Pick only hook-level runtime clusters with explicit inputs/outputs; the next reasonable candidate is `AdaptiveBenchmarkSection` prop composition.
3. Keep JSX extraction small and build-verified.
4. Avoid the Browser TTS playback loop until a fresh AST-level movement plan exists.

<!-- app-shell-modularization-checkpoint:end -->

## 2026-06-11 — App shell auth/model refresh checkpoint

- Completed a low-risk App shell extraction for auth headers and model catalog refresh actions.
- Added `src/app/useAuthHeaders.ts` and `src/app/useModelRefreshActions.ts`.
- `src/App.tsx` now delegates auth-header construction and model refresh orchestration to hooks while leaving Browser TTS playback/runtime untouched.
- Previous documented `src/App.tsx` line count: 3301.
- Verification completed: lint, unit tests, build, and mobile E2E.

## 2026-06-11 — App shell P0 reduction checkpoint

- Completed additional low-risk App shell extractions after the auth/model refresh checkpoint.
- Current local `src/App.tsx` line count: **3087**.
- Net documented reduction since the auth/model refresh checkpoint: **214 lines**.
- Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, and `resetSession` remained untouched.
- P0 is now meaningfully advanced but still active: continue extracting only explicit hook-level runtime clusters with clear inputs/outputs.
- Verification target for each follow-up cut remains: lint, unit tests, build, and mobile E2E.

Recent local commits at this checkpoint:

~~~text
78b287c (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract session creation workspace state from App
e4ff634 Extract Dicta Supabase runtime from App
d1bc218 Extract adaptive workspace state from App
09f5648 Extract Dicta debug export effect from App
a6228e9 Extract adaptive storage persistence effects from App
80826a6 Extract App perf diagnostics runtime
479a007 Extract adaptive diagnostics UI state from App
74cf13b Extract OpenRouter generation busy state from App
~~~

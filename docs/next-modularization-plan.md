# Next modularization plan

Status: REFERENCE / HISTORICAL CHECKPOINT
Last updated: 2026-06-13
Verified against branch: `product/input-2`
Verified against commit: update before use with current `git rev-parse --short HEAD`
Source inspection command: `git status --short && git log --oneline --decorate -5 && rg "function App|playTtsFromWord|resetSession" src/App.tsx`
Test map checked: `docs/module-test-map.md`

## Current handling

This document is no longer the source of truth for selecting the next modularization target.

Use these current documents instead:

1. `docs/modularization-roi.md` for the repo-wide scoring framework.
2. `docs/app-shell-modularization-map.md` for the active App shell candidate queue.
3. `docs/module-test-map.md` for validation mapping.
4. `docs/high-risk-runtime-boundaries.md` for runtime safety rules.

The sections below are preserved as historical checkpoint context only. Treat line counts, baseline commits, candidate rankings, and "next recommended pass" text as stale unless revalidated against current `HEAD`.

## 2026 refresh note

Do not use this document to justify low-risk extraction by default. Current modularization selection should prefer the highest-payoff candidate that can be bounded, characterized, manually smoked where needed, and rolled back cleanly.

Do not use `src/App.tsx` LOC reduction as a standalone success metric. It is only supporting evidence. A candidate needs a real ownership boundary, a test seam, clearer inputs/outputs, or lower future change risk.

For AI-assisted modularization, keep patches small and explicit. Reject or split changes that pass broad opaque App state objects, mix behavior changes with movement, touch multiple high-risk boundaries, or cannot be validated before commit.

## Historical note

This document used to track remaining extraction work. It is now a status and guardrail document. Future modularization work should focus on naming cleanup, duplicate-rule review, import-order clarity, and the active candidate queue in `docs/app-shell-modularization-map.md`, not on this checkpoint text alone.

<!-- app-shell-modularization-checkpoint:start -->
## App shell modularization checkpoint — 2026-06-10

This checkpoint is historical. It was useful when written, but later App shell extractions changed the baseline substantially. Verify current `src/App.tsx` size, line anchors, and tests before using any of the details below.

A focused App shell reduction pass continued after the original checkpoint. Current `src/App.tsx` size after the Adaptive advanced diagnostics props extraction was **2682 lines** at that checkpoint.

Top-level function inventory at that checkpoint:

```text
178:function App() {
```

Detailed checkpoint: `docs/archive/app-shell-modularization-checkpoint.md`.

Before starting a new extraction, score the candidate with `docs/modularization-roi.md` and check the active queue in `docs/app-shell-modularization-map.md`.

Completed extraction groups known at that checkpoint:

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

Historical next recommended pass at that checkpoint:

1. Inspect remaining declarations and closures inside `function App()`.
2. Pick only hook-level runtime clusters with explicit inputs/outputs. The old adaptive cockpit prop-composition target has since been removed and is no longer a valid extraction candidate.
3. Keep JSX extraction small and build-verified.
4. Avoid the Browser TTS playback loop until a fresh AST-level movement plan exists.

This recommendation is no longer current by default. Use `docs/app-shell-modularization-map.md` for the active candidate queue.

<!-- app-shell-modularization-checkpoint:end -->

## 2026-06-11 — App shell auth/model refresh checkpoint

Historical checkpoint:

- Completed a low-risk App shell extraction for auth headers and model catalog refresh actions.
- Added `src/app/useAuthHeaders.ts` and `src/app/useModelRefreshActions.ts`.
- `src/App.tsx` delegated auth-header construction and model refresh orchestration to hooks while leaving Browser TTS playback/runtime untouched.
- Previous documented `src/App.tsx` line count: 3301.
- Verification completed: lint, unit tests, build, and mobile E2E.

## 2026-06-11 — App shell P0 reduction checkpoint

Historical checkpoint:

- Completed additional low-risk App shell extractions after the auth/model refresh checkpoint.
- Local `src/App.tsx` line count at that checkpoint: **3087**.
- Net documented reduction since the auth/model refresh checkpoint: **214 lines**.
- Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, and `resetSession` remained untouched.
- P0 was meaningfully advanced but still active at that checkpoint.
- Verification target for each follow-up cut remained: lint, unit tests, build, and mobile E2E.

Recent local commits at that checkpoint:

```text
78b287c (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract session creation workspace state from App
e4ff634 Extract Dicta Supabase runtime from App
d1bc218 Extract adaptive workspace state from App
09f5648 Extract Dicta debug export effect from App
a6228e9 Extract adaptive storage persistence effects
80826a6 Extract App perf diagnostics runtime
479a007 Extract adaptive diagnostics UI state
```

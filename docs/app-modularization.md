# App.tsx Modularization Plan

`src/App.tsx` is still the main orchestration surface for Dicta. Because it owns training state, adaptive behavior, local services, sync, admin UI, routing, global app state, auth headers, polling/global lifecycle, final generated-session creation, and sensitive callbacks, modularization must stay incremental and boundary-driven.

_Last updated: 2026-06-03_

Read first:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`
4. this file

## Current size

Current `src/App.tsx` size on `main` after the LeaderboardWorkspace extraction pass:

```text
9,370 lines
```

Latest measurement:

```text
docs/app-post-leaderboard-measurement.md
```

Baseline before the AdminWorkspace extraction pass, using commit `f5e915b24c9bbbcbf29cc8362ef6325e90895952`:

```text
12,882 lines
```

## Rules

- Do not combine modularization with behavior changes.
- Do not touch adaptive pacing behavior while extracting UI or helpers.
- Do not change `(inputMode, language)` semantics during extraction.
- Each extraction should move one cohesive unit and keep imports explicit.
- Each code step should pass `npm run test -- --reporter=verbose` and `npm run build` before the next extraction.

## Completed extraction areas

### Build info display helper

Status: done.

Files:

```text
src/core/buildInfo.ts
tests/buildInfo.test.ts
```

### TrainingView and training UI cards

Status: complete enough.

Files include:

```text
src/components/TrainingView.tsx
src/components/training/PendingSessionLane.tsx
src/components/training/SyncStatusBanner.tsx
src/components/training/TrainingAudioCard.tsx
src/components/training/TrainingInputCard.tsx
src/components/training/TrainingSubmitCard.tsx
src/components/training/TrainingGenerationCard.tsx
src/components/training/TrainingSessionCard.tsx
```

Stop condition:

- Do not keep extracting training UI unless `TrainingView` accumulates new unrelated responsibilities.

### OpenRouter workspace UI

Status: complete enough.

OpenRouter UI composition lives under:

```text
src/components/openrouter/
```

Stop condition:

- Do not extract more OpenRouter UI unless there is a concrete maintenance need.
- Do not move OpenRouter job/storage lifecycle without dedicated tests and a separate design plan.

### Admin workspace UI

Status: complete enough / closed.

Detailed closeout:

```text
docs/admin-workspace-modularization.md
```

Admin UI components live under:

```text
src/components/admin/
```

Stop condition:

- Do not reopen Admin UI extraction unless there is a regression, a focused type cleanup, or a deliberate second pass on admin state management.

### SessionDashboard

Status: complete enough.

File:

```text
src/components/session-dashboard/SessionDashboard.tsx
```

Detailed closeout:

```text
docs/session-dashboard-modularization.md
```

Stop condition:

- Do not split the dashboard further unless it gains new responsibilities or a concrete maintainability issue appears.

### AdaptiveBenchmarkWorkspace

Status: complete enough for the initial adaptive workspace pass.

Files:

```text
src/components/adaptive-workspace/AdaptiveBenchmarkWorkspace.tsx
src/components/adaptive-workspace/types.ts
src/components/adaptive-workspace/adaptiveWorkspaceViewHelpers.ts
```

Current note:

- A later measurement identified the remaining inline adaptive advanced diagnostics shell as a possible next candidate, but it needs its own plan because it touches adaptive debug/telemetry display and selected benchmark state.

### Runtime input workspaces

Status: complete enough for the setup/card pass.

Dedicated plan:

```text
docs/runtime-input-workspaces-modularization.md
```

Completed runtime/setup extractions:

```text
src/components/runtime-workspaces/BrowserTtsSourceCard.tsx
src/components/runtime-workspaces/BrowserTtsPracticeCard.tsx
src/components/runtime-workspaces/BrowserTtsSetupCard.tsx
src/components/runtime-workspaces/KokoroSourceCard.tsx
src/components/runtime-workspaces/KokoroPracticeCard.tsx
src/components/runtime-workspaces/KokoroSetupCard.tsx
src/components/runtime-workspaces/Input4SetupCard.tsx
src/components/runtime-workspaces/AudioInputSetupCard.tsx
src/components/runtime-workspaces/SessionCreateCard.tsx
src/components/runtime-workspaces/LiveMetricsDock.tsx
```

Runtime follow-up posture:

- Do not automatically continue runtime extraction.
- `AudioSourceCard` is possible as a smaller follow-up, but it is behavior-adjacent because of `audioRef`, `onTimeUpdate`, and `onEnded`.
- `AudioPracticeCard` should wait until `AudioSourceCard` is stable, if it is still worthwhile.

### Leaderboard workspace

Status: complete.

File:

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

Plan/closeout:

```text
docs/leaderboard-workspace-modularization.md
```

Preserved behavior:

- leaderboard data derivation stayed in `App.tsx`;
- session filtering, sorting, and ranking stayed in `App.tsx`;
- leaderboardSections construction stayed in `App.tsx`;
- leaderboard language/expanded state stayed in `App.tsx`;
- workspace navigation state stayed in `App.tsx`;
- dashboard session selection stayed in `App.tsx`;
- session delete/export/copy behavior stayed in `App.tsx`;
- persistence, sync, and auth/profile/access state stayed in `App.tsx`.

Stop condition:

- Do not split `LeaderboardHeader`, `LeaderboardSection`, or `LeaderboardSessionRow` yet.

## Current candidates after latest measurement

See:

```text
docs/app-post-leaderboard-measurement.md
```

### 1. AdaptiveAdvancedDiagnostics

Recommended next planning target:

```text
docs/adaptive-advanced-diagnostics-modularization.md
```

Possible future component:

```text
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

Risk: medium-high.

Rationale: largest cohesive remaining render block, but it belongs to adaptive workspace internals and touches debug/telemetry display, expanded section state, selected benchmark state, latest-session summaries, and helper formatters.

### 2. AudioSourceCard

Possible smaller runtime follow-up:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

Risk: medium-high.

Rationale: smaller than adaptive diagnostics, but includes audio player ref/lifecycle callbacks. Extract only if refs/callbacks stay owned by `App.tsx`.

### 3. AuthWorkspace

Possible later plan:

```text
src/components/auth/AuthWorkspace.tsx
```

Risk: medium-high.

Rationale: cohesive auth UI, but touches Supabase auth flows and local storage readiness.

## Recommended next action

Create a dedicated plan for `AdaptiveAdvancedDiagnostics` before moving code.

Do not extract another component immediately without that plan/evaluation.

## Per-patch checklist

Before each code extraction patch:

```bash
git status
git pull origin main
npm run test -- --reporter=verbose
npm run build
```

Then make only the scoped extraction and rerun:

```bash
npm run test -- --reporter=verbose
npm run build
wc -l src/App.tsx
git diff --stat
git status --short
```

If that passes, commit before starting the next extraction.

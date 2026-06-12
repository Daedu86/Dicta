# SessionDashboard Modularization Plan

`SessionDashboard` is a browser UI dashboard for one saved training session. This extraction must not change scoring, adaptive behavior, telemetry derivation, session persistence, workspace routing, auth, localStorage, Supabase, OpenRouter, Admin UI, or Training UI.

_Initial plan created: 2026-06-02_

## Initial State

- `SessionDashboard` currently lives inline in `src/App.tsx`.
- `src/App.tsx` is about `12,568` lines before this extraction.
- The dashboard render call is owned by the main app routing branch, and the parent still owns `workspaceMode`, `dashboardSessionId`, `sessions`, and navigation callbacks.
- The component starts at `function SessionDashboard` around line `9,199` and ends before `function AdaptiveBenchmarkWorkspace` around line `9,716`.
- The inline dashboard block plus immediate dashboard subcomponents is about `516` lines.

## Objective

Extract dashboard UI into `src/components/session-dashboard/` without changing behavior.

`src/App.tsx` should stop containing the inline `function SessionDashboard` implementation and instead import the extracted component.

## Guardrails

- Do not change visible text.
- Do not change `className` values.
- Do not change visual order.
- Do not change metrics, scoring, point calculation, transcript review logic, adaptive goal derivation, telemetry cloning, chart props, or chart lazy-loading behavior.
- Do not touch Training UI, OpenRouter UI, Admin components, `api/*`, Supabase/auth/security, localStorage persistence, session sync, or app-level routing/state ownership.
- Keep shared app-level formatters in `App.tsx` if moving them would expand scope.
- Avoid exporting broad `App.tsx` types only to satisfy the extraction.

## Candidate Subcomponents

- Main `SessionDashboard`
- KPI section and `DashboardKpi`
- `TranscriptReviewWidget`
- `DashboardChart` and `ChartLoadingState`
- Dashboard-local widget helpers for copying values and showing help
- Dashboard-only helpers for transcript review, adaptive goals, coaching insights, KPI help text, and chart help text

## Extraction Order

1. Create this docs-only plan.
2. Create `src/components/session-dashboard/SessionDashboard.tsx`.
3. Move the current dashboard implementation and dashboard-only subcomponents into the new module.
4. Move dashboard-only helper types and helper functions into the new module.
5. Leave shared app-level helpers in `App.tsx` and pass them as props only where that is the narrowest option.
6. Update `src/App.tsx` to import and render the extracted `SessionDashboard`.
7. Confirm `src/App.tsx` no longer contains inline `function SessionDashboard`.
8. Run validation and update this document with closeout details.

## Required Validation

Run:

```bash
npm run test -- --reporter=verbose
npm run build
```

Also review the diff to confirm only these paths changed:

```text
src/App.tsx
src/components/session-dashboard/**
docs/session-dashboard-modularization.md
docs/app-shell-modularization-map.md
```

## Stop Conditions

- Type extraction requires a broad shared session model refactor.
- Build failures point to behavior changes outside dashboard UI.
- Diff touches Training UI, OpenRouter UI, Admin UI, `api/*`, Supabase/auth/security, localStorage persistence, or adaptive core.
- Formatter movement would require changing other app call sites.

## Final Checklist

- [x] `SessionDashboard` lives under `src/components/session-dashboard/`.
- [x] `src/App.tsx` imports the extracted component.
- [x] Inline `function SessionDashboard` is removed from `src/App.tsx`.
- [x] Dashboard-only helpers moved with the dashboard.
- [x] Shared app-level helpers stayed in `App.tsx`.
- [x] No behavior, text, class, or order changes were introduced.
- [x] `npm run test -- --reporter=verbose` passed.
- [x] `npm run build` passed.
- [x] `docs/app-shell-modularization-map.md` updated.

## Closeout

Completed extraction file:

```text
src/components/session-dashboard/SessionDashboard.tsx
```

Moved with the dashboard:

- `SessionDashboard`
- `DashboardKpi`
- `TranscriptReviewWidget`
- `DashboardChart`
- `ChartLoadingState`
- dashboard-local widget copy/help helpers
- dashboard-only `DashboardGoals`, `TranscriptReview`, and transcript token types
- dashboard-only builders for transcript review, adaptive dashboard goals, coaching insights, KPI help text, and chart help text
- dashboard chart lazy imports

Left in `App.tsx`:

- App-level workspace routing and navigation callbacks.
- `StoredSession` and broader app session state.
- Shared `formatSessionStatus`, `formatSessionDate`, and `formatSessionPlaybackDuration` helpers, passed to the extracted dashboard.
- Shared `Metric` and `HelpIcon`, because other App workspaces still use them.

Validation:

```text
npm run build
```

Result:

- `npm run test -- --reporter=verbose`: passed, 49 files and 344 tests.
- `npm run build`: passed during the early build check and final validation.

Impact:

- `src/App.tsx` before extraction: about `12,568` lines.
- `src/App.tsx` after extraction: about `12,102` lines.
- Net `App.tsx` reduction: about `466` lines.

Follow-ups:

- Consider splitting the dashboard module further only if it grows new responsibilities.
- If future dashboard work needs stricter shared session typing, create a focused shared session-view type module instead of exporting broad `App.tsx` types.

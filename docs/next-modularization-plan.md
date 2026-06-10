# Next modularization pass

Updated: 2026-06-10

## Current checkpoint

Branch: `product/input-2`

Current largest files by line count:

```text
  5314 src/App.tsx
  4784 src/App.css
  4384 package-lock.json
  1207 src/components/openrouter/OpenRouterWorkspace.tsx
  1205 src/components/adaptive-workspace/AdaptiveBenchmarkWorkspace.tsx
  1171 src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts
   909 vite.config.ts
   847 src/app/useSessionPersistenceSync.ts
   745 tests/supabaseSync.test.ts
   694 src/core/supabaseSync.ts
   671 src/core/adaptive/sessionFeedback.ts
   588 src/core/adaptive/ListeningTrainerPolicy.ts
   546 src/components/session-dashboard/SessionDashboard.tsx
   507 src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
   506 src/core/perfDiagnostics.ts
   496 tests/useSessionPersistenceSync.test.ts
   492 src/app/useAdaptiveRuntime.ts
   444 src/core/adaptive/adaptiveUserSystemReport.ts
   405 api/openrouter/jobs.js
   390 tests/adaptiveController.test.ts
```

Recent `App.tsx` helper extraction pass reduced `App.tsx` from the 5720-line checkpoint to roughly 5314 lines. The work was worthwhile because it moved coherent session restore, display, telemetry, Browser TTS comparison, and readiness helpers out of `App.tsx` without changing behavior.

## Completed or closed-enough areas

These areas should not be revisited without a concrete maintenance problem:

- `SessionDashboard` lives under `src/components/session-dashboard/`.
- OpenRouter UI composition lives under `src/components/openrouter/`.
- Adaptive advanced diagnostics has already been extracted from `App.tsx`.
- App shell/auth/pending session lane/leaderboard workspace extractions already have dedicated closeout docs.
- Recent session helper extractions now cover restore guards, restore normalization, shared restore construction, display/date/status/title formatters, telemetry helpers, Browser TTS environment comparison, and session training readiness.

## Current rule

Do not continue extracting 3-5 line helpers one at a time unless they are part of a semantic cluster or remove a misleading wrapper.

Prefer cluster-level extractions that preserve ownership boundaries.

## Recommended next App.tsx cluster

Next target: session leaderboard/submission display helpers.

Candidate helpers:

```text
formatLeaderboardSessionStatus()
formatSessionPlaybackDuration()
buildTrainingSessionSubmissionMeta()
```

Recommended order:

1. Extract `formatLeaderboardSessionStatus()` into `src/app/sessionLeaderboardFormatters.ts`.
2. Reassess `formatSessionPlaybackDuration()` separately.
3. Only move `buildTrainingSessionSubmissionMeta()` if it can use structural types without exporting broad `StoredSession`.

Stop if the patch requires exporting `StoredSession`, changing session persistence, changing adaptive scoring, changing Supabase sync, changing localStorage keys, or moving auth/session lifecycle ownership.

## Areas to avoid for now

Do not continue OpenRouter modularization unless there is a concrete new maintenance issue. `OpenRouterWorkspace.tsx` is large, but the current boundary is intentional and server/durable-job behavior is sensitive.

Do not split `AdaptiveBenchmarkWorkspace.tsx` or `AdaptiveAdvancedDiagnostics.tsx` merely because they are large. Revisit only with a specific UI-maintenance problem and preserve export/focus/feedback behavior.

Do not modularize tests merely because they are large.

Do not touch `src/core/supabaseSync.ts`, `src/app/useSessionPersistenceSync.ts`, or `api/openrouter/jobs.js` in the same pass as UI/helper extraction.

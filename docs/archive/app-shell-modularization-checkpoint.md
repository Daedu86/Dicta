# App shell modularization checkpoint

Date: 2026-06-10  
Branch: `product/input-2`  
Compacted: 2026-06-15

## Purpose

This archive is now a compact summary of the App shell modularization work. The original file kept a long checkpoint-by-checkpoint log; that detail is already preserved in Git history.

Use this document to answer:

- what was extracted
- which ownership boundaries now exist
- which areas are still risky
- where the next useful modularization pass should start

For exact chronology, use `git log --oneline --decorate` and the relevant commit diffs.

## Summary

The campaign moved large helper, state, props, persistence, OpenRouter, adaptive, diagnostics, workspace, admin, leaderboard, and local-dev route responsibilities out of `src/App.tsx` into focused modules.

The architectural direction is:

- keep top-level files as composition roots
- move pure planning, formatting, storage, route, and prop-composition logic into named owners
- keep side-effect hooks responsible for side effects
- avoid tiny wrappers unless they create a real ownership boundary
- avoid Browser TTS playback unless it gets a dedicated risk-managed pass

## Main extraction areas

### App shell and workspace composition

Important App-level owners created during the pass:

- `src/components/admin/AdminWorkspace.tsx`
- `src/app/sessionTypes.ts`
- `src/app/sessionStorage.ts`
- `src/app/adaptiveFeedbackContext.ts`
- `src/app/appRuntimeHelpers.ts`
- `src/app/AppWorkspaceContent.tsx`
- `src/app/useFocusedTrainingViewProps.ts`
- `src/app/useFocusedTrainingLiveMetrics.ts`
- `src/app/useWorkspaceModelRefreshRuntime.ts`
- focused prop-composition hooks for header, auth, admin, leaderboard, OpenRouter, session creation, diagnostics, and adaptive workspaces

Result: `src/App.tsx` stopped being the only owner of workspace rendering, derived metrics, model refresh resolution, session UI props, and shell presentation branching.

### OpenRouter generation

OpenRouter ownership was split this way:

- `src/app/openRouterDirectGenerationPresets.ts` owns standard and express direct-generation presets.
- `src/app/openRouterDirectGenerationJobPlan.ts` owns pure direct-generation job planning.
- `src/app/useOpenRouterGenerationActions.ts` keeps access checks, fetch calls, job tracking, UI state, and error handling.
- `src/app/useFocusedTrainingGenerationButtons.ts` reuses the preset catalog while keeping UI copy and disabled/status behavior local.

Tests were added for preset contracts and direct-generation job planning.

### Adaptive export and diagnostics

Adaptive export/package building was separated from browser effects:

- `src/app/adaptiveExportPackages.ts` owns pure export and prompt payload builders.
- `src/app/useAdaptiveExportActions.ts` keeps clipboard, download, DOM fallback, and status-message effects.
- `src/app/useDictaDebugExportEffect.ts` imports pure event-count builders from the package module.

Tests cover adaptive event counts, feedback export fallback behavior, benchmark prompt payload shape, and human feedback trimming.

### Local development API

`dev/dictaLocalDevApiPlugin.ts` was reduced from a large all-in-one Vite plugin into a route composition root.

Extracted owners included:

- `dev/localDevEnvStore.ts`
- `dev/localDevApiValidation.ts`
- `dev/localDevAdminFiles.ts`
- `dev/localDevOpenRouterJobs.ts`
- `dev/localDevHttpHelpers.ts`
- `dev/localDevOpenRouterClient.ts`
- `dev/localDevApiKeyRoutes.ts`
- `dev/localDevModelRoutes.ts`
- `dev/localDevChatRoutes.ts`
- `dev/localDevOpenRouterJobRoutes.ts`

Result: local route middleware, validation, env persistence, OpenRouter client construction, job state, and admin file inventory now have clearer owners.

### Cleanup and test follow-up

Completed cleanup items:

- workspace model fallback tests for null/undefined profiles
- duplicate adaptive event-key removal
- workspace profile type reuse via `DictaAppProfile`
- generic session dashboard prop boundary
- dashboard session cast removal

The OpenRouter action wrapper refactor was intentionally deferred because the explicit callbacks are low-risk and a table/`useMemo` rewrite could affect callback identity without enough benefit.

## Current architecture notes

The latest line-count snapshot shows that modularization pressure has shifted away from `src/App.tsx`.

| Area | File | Note |
| --- | --- | --- |
| App runtime | `src/app/DictaAppRuntime.tsx` | New main orchestration hotspot |
| Persistence | `src/app/useSessionPersistenceSync.ts` | Large runtime with likely extractable planning/storage seams |
| OpenRouter UI | `src/components/openrouter/OpenRouterWorkspace.tsx` | Large presentational workspace |
| Adaptive UI | Removed cockpit workspace | Historical target; the Adaptive Pace Layer cockpit/dashboard tab no longer exists |
| Supabase core | `src/core/supabaseSync.ts` | High-risk core sync module; avoid casual extraction |

Future work should not assume that `App.tsx` is still the best ROI target.

## ROI rules

Prefer extractions that create one of these boundaries:

1. pure planning or payload builders
2. storage/restore helpers
3. route handlers or route registration modules
4. derived-state helpers with direct tests
5. large presentational components with stable props
6. side-effect hooks with clear ownership

Avoid moving one-line labels, tiny callback wrappers, cosmetic JSX fragments, short prop aliases, or regex-selected blocks without understanding the runtime boundary.

## High-risk areas

Do not casually move or rewrite:

- Browser TTS playback runtime
- `playTtsFromWord`
- `resetSession`
- phrase progression
- TTS refs, timers, and telemetry
- hydration and active session persistence
- localStorage/session restore behavior
- Supabase/RLS or auth behavior
- server access checks and rate-limit enforcement
- PWA-specific behavior

These areas need a dedicated design pass, focused tests, and small commits.

## Verification pattern

For code changes:

```bash
npm run lint
npm run test -- --reporter=verbose
npm run build
npm run test:e2e:mobile
```

For doc-only changes:

```bash
git diff -- docs/archive/app-shell-modularization-checkpoint.md
wc -l docs/archive/app-shell-modularization-checkpoint.md
git status --short
```

## Recommended next step

The best next modularization target is probably `src/app/useSessionPersistenceSync.ts`, not `src/core/supabaseSync.ts`.

Reason:

- it is very large
- it already has dedicated tests
- it likely contains separable snapshot, restore, write-plan, and storage concerns
- it is safer than core Supabase sync
- it improves runtime ownership more than another tiny App-shell prop extraction

A safe next goal is to reduce `useSessionPersistenceSync.ts` from roughly 847 lines to a smaller public hook plus focused helpers, while keeping the public hook contract unchanged.

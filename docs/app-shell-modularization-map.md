Repo-wide modularization ROI decisions now live in `docs/modularization-roi.md`. Use that document as the canonical scoring framework before applying any App Shell or non-App-Shell extraction.

# App shell modularization map

Updated: 2026-06-15 after focused-training and TTS orchestration delegate-arg grouping.
Status: ACTIVE REFERENCE
Verified against branch: `product/input-2`
Verified against code baseline: post `Keep TTS playback controls word count internal`; latest contract-grouping commits: `8a9d9db`, `79164b6`, `489a141`.
Source inspection command: `git status --short && git log --oneline --decorate -10 && git grep -n -e "buildFocusedTrainingRuntimeDelegateArgs" -e "buildTtsSessionOrchestrationDelegateArgs" -e "useBrowserTtsPlaybackLoop" src/App.tsx src/app tests docs`
Test map checked: `docs/module-test-map.md`
Last candidate decision updated: 2026-06-15

## Current baseline

This document is the active App-shell checkpoint and candidate queue. It intentionally avoids deep stale line inventories. Regenerate fresh anchors before any non-trivial App shell extraction.

The values below are observational anchors, not stable APIs. Recheck them before editing.

| Item | Current value |
| --- | --- |
| Branch | `product/input-2` |
| Current `src/App.tsx` role | Composition root for auth/profile, sync, workspace routing, OpenRouter, focused training, presentation props, and route rendering. |
| Current `src/App.tsx` size anchor | About 940 lines at the inspected baseline; do not use this as a success metric. |
| Focused training runtime owner | `src/app/useFocusedTrainingRuntime.ts` |
| Focused training delegate contract | Internally grouped by `buildFocusedTrainingRuntimeDelegateArgs`; public caller shape remains compatibility-oriented. |
| TTS session orchestration owner | `src/app/useTtsSessionOrchestrationRuntime.ts` |
| TTS orchestration delegate contract | Internally grouped by `buildTtsSessionOrchestrationDelegateArgs`; public caller shape remains compatibility-oriented. |
| Browser TTS playback-loop owner | `src/app/useBrowserTtsPlaybackLoop.ts` |
| Reset-session side-effect owner | `src/app/useResetSessionRuntime.ts` |
| OpenRouter generation owner | `src/app/useOpenRouterGenerationRuntime.ts` |
| OpenRouter model owner | `src/app/useOpenRouterModelRuntime.ts` |
| App route renderer owner | `src/app/AppRouteRenderer.tsx` |
| Current App-shell posture | Consolidation phase. Prefer product fixes, runtime hardening, docs/test-map freshness, and narrow behavior characterization over more App LOC extraction. |

## Completed since the Browser TTS playback-loop checkpoint

These entries are no longer App-shell candidates. Treat them as implemented ownership boundaries, not pending refactor targets.

- `useFocusedTrainingRuntime` owns the focused-training composition layer: live metric derivation, TTS playback intervals, active-session state sync, TTS session orchestration handoff, and focused route prop assembly.
- `useFocusedTrainingRuntime` now groups its delegate arguments internally into named blocks for live metrics, playback intervals, active-session sync, TTS orchestration, and focused route handoff.
- `useTtsSessionOrchestrationRuntime` owns TTS session orchestration: keyboard remap, practice input, playback metrics, Browser TTS playback loop wiring, playback controls, reset-session runtime, and TTS submit action wiring.
- `useTtsSessionOrchestrationRuntime` now groups its delegate arguments internally into named blocks for keyboard remap, practice input, playback metrics, browser playback, playback controls, reset session, and submit session.
- `useResetSessionRuntime` owns reset-session side-effect sequencing, including playback stop ordering, ref resets, UI metric resets, session status reset, setup-lock preservation, and adaptive feedback tracking reset.
- `useOpenRouterGenerationRuntime` owns OpenRouter generation entry points and delegates direct/job planning, access checks, failure recording, job tracking, and error-session creation.
- `useOpenRouterModelRuntime` owns OpenRouter model assignment/default resolution and model refresh wiring used by the App shell.
- `useTrainingRuntimeState` owns the training state bucket that previously expanded `App.tsx` with many individual state declarations.
- `useAuthProfileRuntime` owns Supabase auth/profile state, profile access state, visible profile state, auth actions, and auth-header access.
- `useSessionPersistenceRuntime` owns local/profile-scoped persistence, Supabase sync, quotas, adaptive feedback persistence, session deletion, and immediate persistence helpers.
- `useSessionCreationRuntime` owns session creation state/actions across plain text, DictationScript import, and OpenRouter-generated scripts.
- `useWorkspaceSessionRuntime` owns workspace-level derived session collections, summaries, leaderboard/admin/session-navigation actions, dashboard navigation, and deletion routing.
- `useAppPresentationRuntime` owns App-level presentation prop composition for OpenRouter, Admin, Leaderboard, Auth, Session Create, Header, and Live Metrics surfaces.
- `AppRouteRenderer` owns route-level render branching and keeps `App.tsx` from carrying JSX branch ownership.
- Browser TTS playback remains owned by `useBrowserTtsPlaybackLoop`, with the contract path flowing through `App.tsx -> useFocusedTrainingRuntime -> useTtsSessionOrchestrationRuntime -> useBrowserTtsPlaybackLoop`.

## Current contract evaluation

### `src/App.tsx`

`App.tsx` is still large, but its current job is mostly composition. Do not start another App-shell pass only to remove lines. A new App extraction should be selected only when it creates a durable owner, a clearer contract, or a better test seam.

### `src/app/useFocusedTrainingRuntime.ts`

This is the main focused-training composition seam. Its delegate contract has been improved internally through named groups while preserving the caller-facing compatibility shape. Future edits should avoid broad opaque App-state objects and should not move new behavior into this hook unless a new owner/test seam is justified.

### `src/app/useTtsSessionOrchestrationRuntime.ts`

This is the main TTS orchestration seam. Its delegate contract has been improved internally through named groups while preserving ordering between keyboard input, practice input, metrics, playback, controls, reset, and submit. Treat it as a stable orchestrator, not as a place to keep adding logic.

Future work here should be behavior-driven hardening or characterization, not more contract churn. Pure policy or planning behavior still belongs in focused pure helpers with direct tests, not in this orchestrator.

### `src/app/useResetSessionRuntime.ts`

The previous `resetSession` side-effect candidate is resolved. It should not remain in the active App-shell queue. Future reset work is runtime hardening or bug-fixing, not App LOC extraction.

### OpenRouter runtimes

OpenRouter model and generation ownership has moved out of App. Future work should be driven by product/runtime needs: access messaging, offline state, job UX, error persistence, quota behavior, and route contracts. Do not treat OpenRouter as an App-shell extraction target unless new code regresses into `App.tsx`.

## Current recommendation

- Treat Dicta as being in consolidation phase, not broad extraction phase.
- Keep `App.tsx` as a composition root unless a new extraction has a concrete ownership/testability payoff.
- Do not select another App-shell contract-grouping pass merely for local LOC reduction or type rearrangement.
- Prefer product-visible fixes and runtime hardening over more local LOC reduction.
- Keep Browser TTS playback, reset, refs, timers, telemetry, persistence, auth/profile scoping, OpenRouter jobs, PWA/mobile, and CSS cascade under high-risk validation rules.
- Reject no-op wrappers, prop bags, string moves, and tiny callback moves even when they are low risk.

## Current high-risk anchors

These anchors are observational. Refresh them with `git grep` or `rg` before editing.

| Area | Current owner / anchor |
| --- | --- |
| Focused training composition | `src/app/useFocusedTrainingRuntime.ts` called by `src/App.tsx` |
| Focused training delegate grouping | `buildFocusedTrainingRuntimeDelegateArgs` inside `useFocusedTrainingRuntime` |
| TTS session orchestration | `src/app/useTtsSessionOrchestrationRuntime.ts` called by `useFocusedTrainingRuntime` |
| TTS orchestration delegate grouping | `buildTtsSessionOrchestrationDelegateArgs` inside `useTtsSessionOrchestrationRuntime` |
| Browser TTS playback loop | `src/app/useBrowserTtsPlaybackLoop.ts` called by `useTtsSessionOrchestrationRuntime` |
| Browser TTS playback controls | `src/app/useTtsPlaybackControls.ts` called by `useTtsSessionOrchestrationRuntime` |
| Reset session side effects | `src/app/useResetSessionRuntime.ts` called by `useTtsSessionOrchestrationRuntime` |
| TTS session submit | `src/app/useTtsSessionSubmitAction.ts` called by `useTtsSessionOrchestrationRuntime` |
| TTS metrics/sampling/telemetry/progress | `useTtsPlaybackMetricsRuntime`, `useTtsPerformanceSampler`, `useTtsTelemetryRecorder`, `useTtsUiPublisher`, and `useTtsPlaybackProgressEstimator` |
| OpenRouter generation | `src/app/useOpenRouterGenerationRuntime.ts` called by `src/App.tsx` |
| OpenRouter model selection/refresh | `src/app/useOpenRouterModelRuntime.ts` and `src/app/useWorkspaceModelRefreshRuntime.ts` |
| Auth/profile boundary | `src/app/useAuthProfileRuntime.ts`, Supabase routes, profile-scoped storage, and profile access actions |
| Session persistence/sync | `src/app/useSessionPersistenceRuntime.ts`, `useSessionPersistenceSync`, Supabase sync helpers, and profile-scoped storage |
| Route rendering | `src/app/AppRouteRenderer.tsx` and workspace route helpers |

## Active candidate queue

Scores use `docs/modularization-roi.md`: ROI is 0-100 where higher is better; risk / validation cost is 0-100 where higher means more validation burden.

Only non-implemented candidates belong in this table. Implemented candidates belong in the completed extraction log or the completed list above.

| Candidate name | Current location / line range | Proposed target | Expected net LOC movement | Runtime boundaries touched | Main behavior preserved | ROI score | Risk / validation cost score | Required tests | Required manual smoke checks | Rollback plan | Decision | Reason |
| --- | --- | --- | ---: | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| OpenRouter UX/runtime hardening | `src/app/useOpenRouterGenerationRuntime.ts`, job runtime, routes, and UI props | Product/runtime patches, not App-shell extraction | Not an App LOC goal | OpenRouter access, jobs, offline state, error sessions, quotas | Preserve generation presets, language contract, job tracking, and error persistence | 76 | 55 | `tests/openRouterChatRoute.test.ts`, `tests/openRouterJobRoute.test.ts`, `tests/openRouterJobs.test.ts`, `tests/useOpenRouterJobsRuntime.test.ts`, `tests/openRouterDirectGenerationJobPlan.test.ts`, `tests/openRouterDirectGenerationPresets.test.ts`, `tests/trainingOpenRouterLanguageContract.test.ts` | Generate direct and job-backed sessions; verify error session creation and offline/access messaging | Revert the runtime/UI patch | select as product work | Higher ROI now comes from product-visible reliability and UX, not additional App extraction. |
| Semantic phrase selector extraction | `buildSemanticPhrasesForCurrentSession` inside `useTtsSessionOrchestrationRuntime.ts` | Possible pure helper only if behavior grows | 0-5 fewer lines | phrase selection | Preserve DictationScript phrase behavior vs plain-text ordered semantic phrases | 34 | 24 | Existing `tests/semanticPhrasePlanner.test.ts` and `tests/dictationScriptValidation.test.ts` remain enough unless behavior changes | Create/import one script session and one plain-text Browser TTS session if touched | Revert helper import and inline conditional | reject | Still too small to justify extraction by itself. Extract only if phrase selection behavior grows. |

## Completed extraction log after consolidation

Implemented candidates stay here as historical evidence. Do not select them again.

| Implemented candidate | Extraction target | Preserved boundary | Notes |
| --- | --- | --- | --- |
| Active session state sync | `src/app/useActiveSessionStateSync.ts` | Active-session hydration, finished-session sync, live-session persistence state sync | App no longer owns these effects directly. |
| Browser TTS session submit action | `src/app/useTtsSessionSubmitAction.ts` | Submit validation, final sampling, finalization, persistence push, playback stop, finished statuses, feedback completion, submit message | High-risk submit sequencing now has a focused owner. |
| Browser TTS playback loop | `src/app/useBrowserTtsPlaybackLoop.ts` | `playTts` / `playTtsFromWord`, utterance config, handlers, phrase progression, telemetry, next-chunk scheduling | App no longer owns playback-loop internals. |
| TTS playback controls | `src/app/useTtsPlaybackControls.ts` | Pause/resume/stop/seek behavior, browser cancel/resume routing, telemetry actions, status transitions | Bounded Browser TTS runtime seam. |
| TTS metrics, telemetry, UI publishing, and progress estimation | `useTtsPerformanceSampler`, `useTtsTelemetryRecorder`, `useTtsUiPublisher`, `useTtsPlaybackProgressEstimator` | Runtime metric sampling, telemetry, UI publish thresholds, spoken-word progress | These remain high-risk but have focused tests. |
| Reset session runtime | `src/app/useResetSessionRuntime.ts` | Reset defaults, stop ordering, refs, UI metrics, session status, setup-lock preservation, adaptive feedback reset | The previous reset candidate is implemented and removed from the active queue. |
| TTS session orchestration runtime | `src/app/useTtsSessionOrchestrationRuntime.ts` | Keyboard/input, metrics, playback loop, controls, reset, submit | Treat as orchestrator; future work should be behavior-driven unless a new test seam is clear. |
| TTS orchestration delegate grouping | `src/app/useTtsSessionOrchestrationRuntime.ts` | Explicit delegate blocks for keyboard remap, practice input, playback metrics, browser playback, playback controls, reset session, and submit session | Implemented as internal contract cleanup; caller-facing compatibility was preserved. |
| Focused training runtime | `src/app/useFocusedTrainingRuntime.ts` | Focused-training composition, active sync, TTS orchestration handoff, route props | Broad but useful consolidation seam. |
| Focused training delegate grouping | `src/app/useFocusedTrainingRuntime.ts` | Explicit delegate blocks for live metrics, playback intervals, active-session sync, TTS orchestration, and focused route handoff | Implemented as internal contract cleanup; caller-facing compatibility was preserved. |
| OpenRouter generation/model runtimes | `useOpenRouterGenerationRuntime`, `useOpenRouterModelRuntime`, `useWorkspaceModelRefreshRuntime` | Generation actions/jobs/errors/access/model/default resolution | Product UX and runtime reliability are now higher ROI than App extraction. |
| App presentation and route rendering | `useAppPresentationRuntime`, `AppRouteRenderer` | Presentation prop composition and route render branching | App shell remains a composition root. |
| Auth/profile, session persistence, session creation, and workspace session runtimes | `useAuthProfileRuntime`, `useSessionPersistenceRuntime`, `useSessionCreationRuntime`, `useWorkspaceSessionRuntime` | Auth/profile access, persistence/sync/quota, session creation, workspace summaries/actions | These should be treated as existing owner boundaries. |

## Freshness and update rules

- If a candidate table entry is based on historical line numbers, refresh the line anchors before using it.
- If a candidate is implemented, move it from the active queue to the completed extraction log in the same documentation pass.
- If a new module is added, update `docs/module-test-map.md` in the same patch.
- If runtime behavior changes, update `docs/high-risk-runtime-boundaries.md` or the relevant product/runtime doc in a separate clearly named commit when possible.
- If the inspected current source contradicts this document, prefer the source and tests, then update this document.

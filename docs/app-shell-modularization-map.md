Repo-wide modularization ROI decisions live in `docs/modularization-roi.md`. Use that document as the scoring framework before selecting another extraction.

# App shell modularization map

Updated: 2026-06-15 after OpenRouter direct generation, job polling, and failure-policy extraction.
Status: ACTIVE REFERENCE
Verified against branch: `product/input-2`
Verified against code baseline: post `Apply OpenRouter job failure policy`.
Test map checked: `docs/module-test-map.md`

## Current baseline

This is the current App-shell checkpoint and candidate queue. Refresh source anchors before any non-trivial extraction.

| Item | Current value |
| --- | --- |
| Branch | `product/input-2` |
| Current `src/App.tsx` role | Composition root for auth/profile, sync, workspace routing, OpenRouter wiring, focused training, presentation props, and route rendering. |
| Current `src/App.tsx` size anchor | About 940 lines at the inspected baseline; do not use this as a success metric. |
| Focused training runtime owner | `src/app/useFocusedTrainingRuntime.ts` |
| TTS session orchestration owner | `src/app/useTtsSessionOrchestrationRuntime.ts` |
| Browser TTS playback-loop owner | `src/app/useBrowserTtsPlaybackLoop.ts` |
| Reset-session owner | `src/app/useResetSessionRuntime.ts` |
| OpenRouter generation entry owner | `src/app/useOpenRouterGenerationRuntime.ts` |
| OpenRouter direct generation lifecycle owner | `src/app/useOpenRouterDirectGenerationRuntime.ts` |
| OpenRouter job polling owner | `src/app/useOpenRouterJobPollingRuntime.ts` |
| OpenRouter generation failure policy owner | `src/app/openRouterGenerationFailurePolicy.ts` |
| OpenRouter model owner | `src/app/useOpenRouterModelRuntime.ts` |
| App route renderer owner | `src/app/AppRouteRenderer.tsx` |
| Current posture | Consolidation phase. Prefer product/runtime hardening and tests over App LOC extraction. |

## Completed since the Browser TTS playback-loop checkpoint

Implemented boundaries; do not re-select them as pending App-shell extractions.

- `useFocusedTrainingRuntime` owns focused-training composition and internally groups delegate args.
- `useTtsSessionOrchestrationRuntime` owns TTS orchestration and internally groups delegate args.
- `useResetSessionRuntime` owns reset-session side-effect sequencing.
- `useOpenRouterGenerationRuntime` owns OpenRouter generation entry wiring.
- `useOpenRouterDirectGenerationRuntime` owns direct generation lifecycle: access/offline/model guards, job-plan request, job tracking, busy state, and direct failure handling.
- `useOpenRouterJobPollingRuntime` owns OpenRouter job polling, terminal status settlement, generated-script validation, notices, and cleanup.
- `openRouterGenerationFailurePolicy` owns shared OpenRouter generation failure notices, display labels, and persistent/transient error decisions.
- `useOpenRouterModelRuntime` owns OpenRouter model assignment/default resolution and refresh wiring.
- `useTrainingRuntimeState` owns the training state bucket.
- `useAuthProfileRuntime` owns Supabase auth/profile state and access state.
- `useSessionPersistenceRuntime` owns local/profile-scoped persistence, Supabase sync, quotas, and deletion persistence.
- `useSessionCreationRuntime` owns session creation for plain text, DictationScript import, and generated scripts.
- `useWorkspaceSessionRuntime` owns workspace-level derived session collections and workspace actions.
- `useAppPresentationRuntime` owns App-level presentation prop composition.
- `AppRouteRenderer` owns route-level render branching.
- Browser TTS playback remains owned by `useBrowserTtsPlaybackLoop`, with the contract path `App.tsx -> useFocusedTrainingRuntime -> useTtsSessionOrchestrationRuntime -> useBrowserTtsPlaybackLoop`.

## Current recommendation

- Keep `App.tsx` as composition root unless a new extraction creates a real owner/test seam.
- Do not keep grouping contracts just for LOC reduction.
- Treat OpenRouter lifecycle ownership as mostly extracted; future OpenRouter work should be product-driven: UX, access messaging, quotas, route contracts, or error behavior.
- Keep Browser TTS, reset, refs/timers, telemetry, persistence, auth/profile scoping, OpenRouter jobs, PWA/mobile, and CSS cascade under high-risk validation rules.
- Reject no-op wrappers, prop bags, string moves, and tiny callback moves.

## Current high-risk anchors

| Area | Current owner / anchor |
| --- | --- |
| Focused training composition | `src/app/useFocusedTrainingRuntime.ts` called by `src/App.tsx` |
| TTS session orchestration | `src/app/useTtsSessionOrchestrationRuntime.ts` called by `useFocusedTrainingRuntime` |
| Browser TTS playback loop | `src/app/useBrowserTtsPlaybackLoop.ts` called by `useTtsSessionOrchestrationRuntime` |
| Browser TTS playback controls | `src/app/useTtsPlaybackControls.ts` called by `useTtsSessionOrchestrationRuntime` |
| Reset session side effects | `src/app/useResetSessionRuntime.ts` called by `useTtsSessionOrchestrationRuntime` |
| TTS session submit | `src/app/useTtsSessionSubmitAction.ts` called by `useTtsSessionOrchestrationRuntime` |
| OpenRouter generation entry | `src/app/useOpenRouterGenerationRuntime.ts` called by `src/App.tsx` |
| OpenRouter direct generation | `src/app/useOpenRouterDirectGenerationRuntime.ts` |
| OpenRouter job polling | `src/app/useOpenRouterJobPollingRuntime.ts` called by `useOpenRouterJobsRuntime` |
| OpenRouter failure policy | `src/app/openRouterGenerationFailurePolicy.ts` |
| OpenRouter model selection/refresh | `src/app/useOpenRouterModelRuntime.ts` and `src/app/useWorkspaceModelRefreshRuntime.ts` |
| Auth/profile boundary | `src/app/useAuthProfileRuntime.ts`, Supabase routes, profile-scoped storage, and profile access actions |
| Session persistence/sync | `src/app/useSessionPersistenceRuntime.ts`, `useSessionPersistenceSync`, Supabase sync helpers, and profile-scoped storage |
| Route rendering | `src/app/AppRouteRenderer.tsx` and workspace route helpers |

## Active candidate queue

Scores use `docs/modularization-roi.md`: ROI is 0-100 where higher is better; risk / validation cost is 0-100 where higher means more validation burden.

| Candidate name | Current location | Proposed target | Runtime boundaries touched | ROI | Risk | Required tests | Decision | Reason |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| Semantic phrase selector extraction | `buildSemanticPhrasesForCurrentSession` inside `useTtsSessionOrchestrationRuntime.ts` | Possible pure helper only if behavior grows | Phrase selection | 34 | 24 | `tests/semanticPhrasePlanner.test.ts`, `tests/dictationScriptValidation.test.ts` | reject | Too small by itself. Extract only if phrase selection behavior grows. |
| Product/runtime hardening | Current product issues | Targeted patches, not App-shell extraction | Depends on issue | n/a | n/a | Pick from `docs/module-test-map.md` | select case-by-case | Higher ROI now comes from concrete product/runtime fixes, not broad modularization. |

## Completed extraction log after consolidation

| Implemented candidate | Extraction target | Preserved boundary | Notes |
| --- | --- | --- | --- |
| Active session state sync | `src/app/useActiveSessionStateSync.ts` | Active-session hydration and finished-session sync | App no longer owns these effects directly. |
| Browser TTS session submit action | `src/app/useTtsSessionSubmitAction.ts` | Submit validation, final sampling, persistence push, playback stop, and finished statuses | High-risk submit sequencing has a focused owner. |
| Browser TTS playback loop | `src/app/useBrowserTtsPlaybackLoop.ts` | `playTts` / `playTtsFromWord`, utterance config, handlers, phrase progression, telemetry, next-chunk scheduling | App no longer owns playback-loop internals. |
| TTS playback controls | `src/app/useTtsPlaybackControls.ts` | Pause/resume/stop/seek behavior and status transitions | Bounded Browser TTS runtime seam. |
| TTS metrics, telemetry, UI publishing, and progress estimation | `useTtsPerformanceSampler`, `useTtsTelemetryRecorder`, `useTtsUiPublisher`, `useTtsPlaybackProgressEstimator` | Runtime metric sampling, telemetry, UI publish thresholds, spoken-word progress | Focused tests cover these seams. |
| Reset session runtime | `src/app/useResetSessionRuntime.ts` | Reset defaults, stop ordering, refs, UI metrics, setup-lock preservation, adaptive feedback reset | Removed from active queue. |
| TTS session orchestration runtime | `src/app/useTtsSessionOrchestrationRuntime.ts` | Keyboard/input, metrics, playback loop, controls, reset, submit | Treat as orchestrator. |
| TTS orchestration delegate grouping | `src/app/useTtsSessionOrchestrationRuntime.ts` | Explicit delegate blocks for keyboard remap, practice input, playback metrics, browser playback, controls, reset, submit | Internal contract cleanup. |
| Focused training runtime | `src/app/useFocusedTrainingRuntime.ts` | Focused-training composition, active sync, TTS handoff, route props | Broad but useful composition seam. |
| Focused training delegate grouping | `src/app/useFocusedTrainingRuntime.ts` | Explicit delegate blocks for live metrics, playback intervals, active-session sync, TTS orchestration, route handoff | Internal contract cleanup. |
| OpenRouter direct generation lifecycle | `src/app/useOpenRouterDirectGenerationRuntime.ts` | Direct generation guards, job-plan request, busy state, job tracking, direct failure handling | Extracted from OpenRouter generation actions. |
| OpenRouter job polling lifecycle | `src/app/useOpenRouterJobPollingRuntime.ts` | Polling, terminal settlement, generated-script validation, notices, cleanup | Extracted from OpenRouter jobs runtime. |
| OpenRouter generation failure policy | `src/app/openRouterGenerationFailurePolicy.ts` | Shared failure notices, labels, transient/persistent error decisions | Used by direct generation and job polling. |
| OpenRouter generation/model runtimes | `useOpenRouterGenerationRuntime`, `useOpenRouterModelRuntime`, `useWorkspaceModelRefreshRuntime` | Generation/model/default resolution | Product/runtime reliability is now higher ROI than App extraction. |
| App presentation and route rendering | `useAppPresentationRuntime`, `AppRouteRenderer` | Presentation prop composition and route render branching | App shell remains a composition root. |
| Auth/profile, session persistence, session creation, and workspace session runtimes | `useAuthProfileRuntime`, `useSessionPersistenceRuntime`, `useSessionCreationRuntime`, `useWorkspaceSessionRuntime` | Auth/profile access, persistence/sync/quota, session creation, workspace summaries/actions | Existing owner boundaries. |

## Freshness and update rules

- If a candidate is implemented, move it from the active queue to the completed extraction log in the same documentation pass.
- If a new module is added, update `docs/module-test-map.md` in the same patch.
- If runtime behavior changes, update `docs/high-risk-runtime-boundaries.md` or the relevant product/runtime doc separately when useful.
- If source contradicts this document, prefer source and tests, then update this document.

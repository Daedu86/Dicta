Repo-wide modularization ROI decisions live in `docs/modularization-roi.md`. Use that document as the scoring framework before selecting another extraction.

# App shell modularization map

Updated: 2026-06-16 after runtime modularization wave.  
Status: ACTIVE REFERENCE  
Verified against branch: `product/input-2`  
Verified against code baseline: post Fase 1-9 runtime modularization wave.  
Test map checked: `docs/module-test-map.md`

## Current baseline

This is the current App-shell checkpoint and candidate queue. Refresh source anchors before any non-trivial extraction.

| Item | Current value |
| --- | --- |
| Branch | `product/input-2` |
| Current `src/App.tsx` role | Shell-only React entrypoint. It imports `App.css` and renders `DictaAppRuntime`; it should stay small and must not regain runtime ownership. |
| Current `src/App.tsx` size anchor | 8 lines at the inspected baseline. |
| Current runtime export shim | `src/app/DictaAppRuntime.tsx` re-exports `DictaAppRuntime` from `DictaAppRuntimeRoot`; it should stay behavior-free. |
| Current runtime composition root | `src/app/DictaAppRuntimeRoot.tsx` wires auth/profile, sync, workspace routing, root OpenRouter wiring, focused training, presentation props, and route rendering. |
| Current `src/app/DictaAppRuntimeRoot.tsx` size anchor | About 667 lines at the inspected baseline; do not split only for LOC. |
| Current persistence/sync hotspot | `src/app/useSessionPersistenceSync.ts`, about 847 lines, protected by `tests/useSessionPersistenceSync.test.ts`. |
| Current OpenRouter workspace UI hotspot | `src/components/openrouter/OpenRouterWorkspace.tsx`; runtime helpers are split, but the UI component may still be large. |
| Focused training runtime owner | `src/app/useFocusedTrainingRuntime.ts`, reached through `useDictaRootFocusedTrainingRuntime`. |
| TTS session orchestration owner | `src/app/useTtsSessionOrchestrationRuntime.ts` |
| Browser TTS playback-loop owner | `src/app/useBrowserTtsPlaybackLoop.ts`; helper modules live beside it and the utterance contract remains in the hook. |
| Adaptive runtime owner | `src/app/useAdaptiveRuntime.ts`; public types and pure update/session helpers live in adjacent `adaptiveRuntime*` modules. |
| Adaptive controller owner | `src/core/adaptive/AdaptiveDictationController.ts`; math/mode/precision/phrase/reason helpers live in adjacent modules. |
| Browser TTS DE benchmark policy owner | `src/core/adaptive/browserTtsDeBenchmarkPolicy.ts`; it is now a facade over focused policy modules. |
| Performance diagnostics owner | `src/core/perfDiagnostics.ts`; it is now a facade over types, utilities, and runtime modules. |
| Root OpenRouter adapter owner | `src/app/useDictaRootOpenRouterRuntime.ts` |
| OpenRouter generation entry owner | `src/app/useOpenRouterGenerationRuntime.ts` |
| OpenRouter direct generation lifecycle owner | `src/app/useOpenRouterDirectGenerationRuntime.ts` |
| OpenRouter job polling owner | `src/app/useOpenRouterJobPollingRuntime.ts` |
| OpenRouter generation failure policy owner | `src/app/openRouterGenerationFailurePolicy.ts` |
| Root route composition adapter owner | `src/app/useDictaRootRouteCompositionRuntime.ts` |
| App route composition runtime owner | `src/app/useDictaAppRouteCompositionRuntime.ts` |
| App route renderer owner | `src/app/AppRouteRenderer.tsx` |
| Current posture | Consolidation phase. Prefer product/runtime hardening and tested ownership seams over broad App LOC extraction. |

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
- `useSessionPersistenceRuntime` owns local/profile-scoped persistence, Supabase sync, quotas, and deletion persistence at the app-runtime level.
- `useSessionCreationRuntime` owns session creation for plain text, DictationScript import, and generated scripts.
- `useWorkspaceSessionRuntime` owns workspace-level derived session collections and workspace actions.
- `useAppPresentationRuntime` owns App-level presentation prop composition.
- `AppRouteRenderer` owns route-level render branching.
- `useDictaAppBootRuntime` owns root boot-state buckets and refs.
- `useDictaRootOpenRouterRuntime` owns root-level OpenRouter adaptation before `useDictaOpenRouterRuntime`.
- `useDictaRootRouteCompositionRuntime` owns root-level route-composition handoff before `useDictaAppRouteCompositionRuntime`.
- Browser TTS playback remains owned by `useBrowserTtsPlaybackLoop`, with the contract path `DictaAppRuntimeRoot -> useDictaRootFocusedTrainingRuntime -> useFocusedTrainingRuntime -> useTtsSessionOrchestrationRuntime -> useBrowserTtsPlaybackLoop`.
- Runtime modularization wave completed: OpenRouter workspace runtime helpers, SessionDashboard sections, adaptive cockpit/diagnostics sections, adaptive policies, adaptive controller helpers, Browser TTS playback helpers, adaptive runtime helpers, and performance diagnostics facade.

## Current recommendation

- Keep `src/App.tsx` shell-only and keep `src/app/DictaAppRuntime.tsx` as an export shim.
- Treat `src/app/DictaAppRuntimeRoot.tsx` as the browser composition root unless a new extraction creates a real owner/test seam.
- Do not keep grouping contracts just for LOC reduction.
- Treat the completed Fase 1-9 files as closed unless a product bug requires a narrow follow-up.
- Treat session persistence/sync as the best current modularization candidate only if the next task is explicitly refactor/modularization work and the patch starts with characterization or pure planning seams.
- Treat OpenRouter workspace UI extraction as optional/product-driven; runtime ownership is already separated.
- Keep Browser TTS, reset, refs/timers, telemetry, persistence, auth/profile scoping, OpenRouter jobs, PWA/mobile, and CSS cascade under high-risk validation rules.
- Reject no-op wrappers, prop bags, string moves, and tiny callback moves.

## Current high-risk anchors

| Area | Current owner / anchor |
| --- | --- |
| Runtime root | `src/app/DictaAppRuntimeRoot.tsx`; `src/app/DictaAppRuntime.tsx` is only the export shim |
| Boot state | `src/app/useDictaAppBootRuntime.ts` |
| Focused training composition | `src/app/useFocusedTrainingRuntime.ts` called through `useDictaRootFocusedTrainingRuntime` |
| TTS session orchestration | `src/app/useTtsSessionOrchestrationRuntime.ts` called by `useFocusedTrainingRuntime` |
| Browser TTS playback loop | `src/app/useBrowserTtsPlaybackLoop.ts` called by `useTtsSessionOrchestrationRuntime` |
| Browser TTS playback controls | `src/app/useTtsPlaybackControls.ts` called by `useTtsSessionOrchestrationRuntime` |
| Reset session side effects | `src/app/useResetSessionRuntime.ts` called by `useTtsSessionOrchestrationRuntime` |
| TTS session submit | `src/app/useTtsSessionSubmitAction.ts` called by `useTtsSessionOrchestrationRuntime` |
| Root OpenRouter adaptation | `src/app/useDictaRootOpenRouterRuntime.ts` calls `useDictaOpenRouterRuntime` |
| OpenRouter generation entry | `src/app/useOpenRouterGenerationRuntime.ts` called by `useDictaOpenRouterRuntime` |
| OpenRouter direct generation | `src/app/useOpenRouterDirectGenerationRuntime.ts` |
| OpenRouter job polling | `src/app/useOpenRouterJobPollingRuntime.ts` called by `useOpenRouterJobsRuntime` |
| OpenRouter failure policy | `src/app/openRouterGenerationFailurePolicy.ts` |
| Auth/profile boundary | `src/app/useAuthProfileRuntime.ts`, Supabase routes, profile-scoped storage, and profile access actions |
| Session persistence/sync | `src/app/useSessionPersistenceRuntime.ts`, `useSessionPersistenceSync`, Supabase sync helpers, and profile-scoped storage |
| Route composition/rendering | `src/app/useDictaRootRouteCompositionRuntime.ts`, `src/app/useDictaAppRouteCompositionRuntime.ts`, `src/app/AppRouteRenderer.tsx`, and workspace route helpers |

## Active candidate queue

Scores use `docs/modularization-roi.md`: ROI is 0-100 where higher is better; risk / validation cost is 0-100 where higher means more validation burden.

| Candidate name | Current location | Proposed target | Runtime boundaries touched | ROI | Risk | Required tests | Decision | Reason |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| Session persistence planning/storage seams | `src/app/useSessionPersistenceSync.ts` | Pure helper(s) for snapshot/restore/write-plan/storage compaction before changing the public hook | Persistence, profile-scoped storage, Supabase sync adjacency | 76 | 58 | `tests/useSessionPersistenceSync.test.ts`; add focused helper tests if helpers are introduced; include `tests/supabaseSync.test.ts` and `tests/profileScopedStorage.test.ts` if behavior touches sync/profile scope | select with characterization | Large file with dedicated tests and likely separable pure seams; safer than `src/core/supabaseSync.ts`, but still high-risk. |
| OpenRouter workspace UI section extraction | `src/components/openrouter/OpenRouterWorkspace.tsx` | Presentational subcomponents only, runtime unchanged | UI/workspace props | 62 | 36 | Existing OpenRouter workspace/job tests plus manual UI diff review | investigate | Possible line reduction, but lower architectural payoff because runtime helpers are already extracted. |
| Supabase sync decomposition | `src/core/supabaseSync.ts` | TBD after characterization | RLS-sensitive sync behavior | 68 | 82 | `tests/supabaseSync.test.ts`, `tests/useSessionPersistenceSync.test.ts`, `tests/profileScopedStorage.test.ts`, manual auth/sync smoke | defer | Important but too risky for a casual next cut. Characterize first. |
| Product/runtime hardening | Current product issues | Targeted patches, not App-shell extraction | Depends on issue | n/a | n/a | Pick from `docs/module-test-map.md` | select case-by-case | Higher ROI may come from concrete product/runtime fixes, not broad modularization. |

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
| Focused training runtime | `src/app/useFocusedTrainingRuntime.ts` | Focused-training composition, active sync, TTS handoff, route props | Broad but useful composition seam. |
| OpenRouter lifecycle | `useOpenRouterDirectGenerationRuntime`, `useOpenRouterJobPollingRuntime`, `openRouterGenerationFailurePolicy`, `useOpenRouterGeneratedScriptSettlement` | Generation guards, polling, settlement, and failure policy | Product/runtime reliability is now higher ROI than another OpenRouter runtime extraction. |
| Runtime root boundaries | `useDictaAppBootRuntime`, `useDictaRootOpenRouterRuntime`, `useDictaRootRouteCompositionRuntime` | Root state buckets, root OpenRouter input-mode adaptation, and root route-composition handoff | `DictaAppRuntime.tsx` is now an export shim; boundary tests protect the root wiring. |
| OpenRouter workspace runtime helpers | `openRouterWorkspaceRuntimeHelpers.ts` | `useOpenRouterWorkspaceRuntime` public runtime shape | Extracted options, prompt/payload helpers, and export payload builders. |
| Session dashboard sections | `src/components/session-dashboard/*` | `SessionDashboard` props/export | Shell now delegates model, KPI, transcript, and charts. |
| Adaptive benchmark cockpit sections | `src/components/adaptive-workspace/AdaptiveBenchmark*Section.tsx` | `AdaptiveBenchmarkCockpitView` and export panel boundary | Shell owns runtime and export panel; sections own presentation. |
| Adaptive advanced diagnostics sections | `src/components/adaptive-workspace/AdaptiveAdvanced*Panel.tsx` | `AdaptiveAdvancedDiagnostics` props | Shell owns composition; panels own diagnostics presentation. |
| Adaptive policies | `listeningTrainerPolicy*`, `browserTtsDeBenchmark*` | Public policy exports and benchmark facade | Policy internals split without changing import surface. |
| Adaptive dictation controller helpers | `adaptiveDictationController*` | `AdaptiveDictationController` class and `decide` contract | Class still owns state/hysteresis. |
| Browser TTS playback-loop helpers | `browserTtsPlaybackLoop*` | Hook return and utterance setup contract | Boundary-sensitive utterance logic remains in the hook. |
| Adaptive runtime helpers | `adaptiveRuntime*` | `useAdaptiveRuntime` export and public types | Public types, session utils, and benchmark update builder moved out. |
| Performance diagnostics facade | `perfDiagnostics*` | `src/core/perfDiagnostics.ts` import surface | Facade preserves public exports over runtime/types/utils. |

## Freshness and update rules

- If a candidate is implemented, move it from the active queue to the completed extraction log in the same documentation pass.
- If a new module is added, update `docs/module-test-map.md` in the same patch.
- If runtime behavior changes, update `docs/high-risk-runtime-boundaries.md` or the relevant product/runtime doc separately when useful.
- If source contradicts this document, prefer source and tests, then update this document.

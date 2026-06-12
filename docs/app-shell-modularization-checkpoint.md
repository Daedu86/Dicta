# App shell modularization checkpoint

Date: 2026-06-10  
Branch: `product/input-2`  
Latest local commit at checkpoint time: `258db0a (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract App runtime helpers`

## Status

The App shell reduction pass is complete for the current stage. `src/App.tsx` is now **3879 lines**.

The key structural milestone is that `App.tsx` should now expose only the main top-level component function:

```text
178:function App() {
```

The current architecture keeps `App.tsx` as the orchestration shell while stable logic, reusable components, persistence helpers, diagnostic helpers, TTS helpers, and adaptive metrics helpers live in focused modules.

## Follow-up — 2026-06-11

The next App shell pass continued with hook-level runtime clusters and kept the same browser/App shell boundary. After extracting keyboard remapping, adaptive export/copy actions, Supabase auth action handlers, session creation/import actions, workspace/session state hooks, direct OpenRouter generation actions, OpenRouter error-session actions, focused-training generation button composition, workspace prop composition, App shell header props, auth workspace props, session create card props, Admin workspace props, Leaderboard workspace props, and Adaptive advanced diagnostics props, `src/App.tsx` is **2682 lines** in the working tree.

New modules added after this checkpoint:

- `src/app/useModelCatalogRuntime.ts`
- `src/app/useDictaLocalStorageImportRuntime.ts`
- `src/app/useKeyboardRemapRuntime.ts`
- `src/app/useAdaptiveExportActions.ts`
- `src/app/useSupabaseAuthActions.ts`
- `src/app/useSessionCreationActions.ts`
- `src/app/useWorkspaceSessionSummaries.ts`
- `src/app/useWorkspaceNavigationEffects.ts`
- `src/app/useOpenRouterGenerationBusyState.ts`
- `src/app/useOpenRouterGenerationActions.ts`
- `src/app/useAdaptiveDiagnosticsUiState.ts`
- `src/app/useAppPerfDiagnosticsRuntime.ts`
- `src/app/useAdaptiveStoragePersistenceEffects.ts`
- `src/app/useDictaDebugExportEffect.ts`
- `src/app/useAdaptiveWorkspaceState.ts`
- `src/app/useDictaSupabaseRuntime.ts`
- `src/app/useSessionCreationWorkspaceState.ts`
- `src/app/useFocusedTrainingGenerationButtons.ts`
- `src/app/useSessionCreateCardProps.ts`
- `src/app/useAuthWorkspaceProps.ts`
- `src/app/useAppShellHeaderProps.ts`
- `src/app/useOllamaWorkspaceProps.ts`
- `src/app/useOpenRouterWorkspaceProps.ts`
- `src/app/useOpenRouterErrorSessionActions.ts`
- `src/app/useAdminWorkspaceProps.ts`
- `src/app/useLeaderboardWorkspaceProps.ts`
- `src/app/useAdaptiveAdvancedDiagnosticsProps.ts`

The remaining high-risk area is still the Browser TTS playback loop. Do not extract `playTtsFromWord` or the TTS refs as a casual line move; start from a fresh boundary map and build after each cut.

## Extracted modules

| Area | File | Lines |
| --- | --- | ---: |
| App shell | `src/App.tsx` | 3879 |
| Admin shell | `src/components/admin/AdminWorkspace.tsx` | 303 |
| Session/local UI types | `src/app/sessionTypes.ts` | 127 |
| TTS pacing helpers | `src/app/ttsPacingHelpers.ts` | 36 |
| Session storage/restore helpers | `src/app/sessionStorage.ts` | 139 |
| Adaptive feedback context | `src/app/adaptiveFeedbackContext.ts` | 186 |
| Shared Metric component | `src/components/shared/Metric.tsx` | 9 |
| Shared SessionDeviceIcon component | `src/components/shared/SessionDeviceIcon.tsx` | 20 |
| TTS playback profile helpers | `src/app/ttsPlaybackProfile.ts` | 83 |
| Dictation script semantic phrase helpers | `src/app/dictationScriptSemanticPhrases.ts` | 35 |
| Repeat word stats helpers | `src/app/repeatWordStats.ts` | 98 |
| App runtime helpers | `src/app/appRuntimeHelpers.ts` | 71 |

## Completed in this pass

- Extracted `AdminWorkspace` out of `App.tsx`.
- Removed dead inline helpers and dead locked-input summary wiring.
- Extracted App-local session/debug/type models to `src/app/sessionTypes.ts`.
- Extracted TTS pacing helpers to `src/app/ttsPacingHelpers.ts`.
- Extracted session restore/storage helpers to `src/app/sessionStorage.ts`.
- Extracted adaptive feedback/activity context helpers to `src/app/adaptiveFeedbackContext.ts`.
- Extracted shared inline UI components:
  - `Metric`
  - `SessionDeviceIcon`
- Extracted TTS playback profile logic to `src/app/ttsPlaybackProfile.ts`.
- Extracted dictation script semantic phrase helpers to `src/app/dictationScriptSemanticPhrases.ts`.
- Extracted repeat-word/transcript stats helpers to `src/app/repeatWordStats.ts`.
- Extracted remaining App runtime helpers to `src/app/appRuntimeHelpers.ts`.

## Verification pattern used

Each extraction followed this cycle:

```bash
npm run build
wc -l src/App.tsx <new-file>
git diff --stat
git status --short
git commit -m "<checkpoint message>"
git push origin product/input-2
```

## Recommended next steps

Start the next pass with inspection, not extraction:

```bash
git status --short
npm run build
wc -l src/App.tsx
grep -n "^function " src/App.tsx
grep -n "^type " src/App.tsx
grep -n "^const .*=>" src/App.tsx
```

Then continue in this order:

1. **Inspect remaining inline closures inside `function App()`**  
   The top-level helper cleanup is mostly complete. The next reductions will likely require extracting hooks or workspace controller modules from inside `App()`.

2. **Prefer hook-level extraction over more file-splitting**  
   Good candidates are runtime clusters with clear state/ref boundaries, such as TTS control, live metrics, session mutation, or adaptive diagnostics.

3. **Avoid large JSX extraction until the next stable checkpoint**  
   JSX extraction is riskier than pure helper extraction. Keep visual moves small and isolated.

4. **Keep every pass build-verified**  
   Continue with small commits and `npm run build` after each extraction.

## Recent commits

```text
258db0a (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract App runtime helpers
2bb0f2f Document App shell modularization checkpoint
386749f Document App shell modularization checkpoint
43633ac Extract repeat word stats helpers
6a1ff4c Extract dictation script semantic phrases
1134055 Extract TTS playback profile helpers
f897c39 Extract shared inline components
1c8b85c Extract adaptive feedback context helpers
133201e Extract session storage helpers
11b16f9 Extract TTS pacing helpers
c98c52f Extract App session types
571b4c0 Remove dead locked input summary
a0f9f3c Remove dead App helpers
1827c3f Extract AdminWorkspace shell
```

## 2026-06-11 � Auth headers and model refresh extraction

- Extracted reusable auth-header creation into `src/app/useAuthHeaders.ts`.
- Extracted `refreshOpenRouterModels` and `refreshOllamaModels` into `src/app/useModelRefreshActions.ts`.
- Kept Browser TTS playback/runtime, `resetSession`, telemetry refs, and OpenRouter generation paths untouched.
- Current `src/App.tsx` line count after this cut: 3301.
- New hook line counts: `useAuthHeaders.ts` = 22; `useModelRefreshActions.ts` = 69.
- Verified with `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

## Follow-up — 2026-06-11 focused-training generation buttons

Latest committed baseline: `079e249 Extract focused training generation buttons`.

Current App shell metrics after this checkpoint:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2711 |
| `src/app/useOpenRouterErrorSessionActions.ts` LOC | 117 |
| `src/app/useFocusedTrainingGenerationButtons.ts` LOC | 208 |
| App.tsx inline `useState` count | 9 |
| App.tsx inline `useRef` count | 13 |
| App.tsx inline `useMemo` count | 8 |
| App.tsx inline `useEffect` count | 8 |
| App.tsx inline function declarations | 25 |

This checkpoint extracted persistent OpenRouter error-session handling and focused-training generation button composition without touching Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, or `playTtsFromWord`.

## Follow-up — 2026-06-11 App shell props checkpoint

Latest committed baseline: `3a201a2 Extract Leaderboard workspace props`.

This checkpoint covers these App shell extractions since the previous docs checkpoint: OpenRouter workspace props, Ollama workspace props, App shell header props, Auth workspace props, Session create card props, Admin workspace props, Leaderboard workspace props, and Adaptive advanced diagnostics props.

Current App shell metrics:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2682 |
| `src/app/useOpenRouterErrorSessionActions.ts` LOC | 117 |
| `src/app/useFocusedTrainingGenerationButtons.ts` LOC | 208 |
| `src/app/useOpenRouterWorkspaceProps.ts` LOC | 164 |
| `src/app/useOllamaWorkspaceProps.ts` LOC | 52 |
| `src/app/useAppShellHeaderProps.ts` LOC | 86 |
| `src/app/useAuthWorkspaceProps.ts` LOC | 90 |
| `src/app/useSessionCreateCardProps.ts` LOC | 57 |
| `src/app/useAdminWorkspaceProps.ts` LOC | 89 |
| `src/app/useLeaderboardWorkspaceProps.ts` LOC | 114 |
| `src/app/useAdaptiveAdvancedDiagnosticsProps.ts` LOC | 84 |
| App.tsx inline `useState` count | 25 |
| App.tsx inline `useRef` count | 27 |
| App.tsx inline `useMemo` count | 8 |
| App.tsx inline `useEffect` count | 8 |
| App.tsx inline function declarations | 25 |

Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, and `playTtsFromWord` remained untouched in this sequence. The next small candidate is `AdaptiveBenchmarkSection` prop composition, while adaptive policy/export action behavior should stay in its existing owners.
## Follow-up — 2026-06-11 Adaptive benchmark and live metrics props

Latest committed baseline: `ad42cef Extract live metrics dock props`.

This checkpoint covers the two most recent App shell prop-composition extractions:

- `src/app/useAdaptiveBenchmarkSectionProps.ts` owns Adaptive benchmark section prop composition, benchmark selection message reset, and benchmark/session-feedback copy/export callback wiring.
- `src/app/useLiveMetricsDockProps.ts` owns live metrics dock prop composition, metrics view setters, insights diagnostics callback wiring, collapsed-state toggling, and TTS-current-chunk presence mapping.

Current App shell metrics after this checkpoint:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2683 |
| `src/app/useAdaptiveBenchmarkSectionProps.ts` LOC | 170 |
| `src/app/useLiveMetricsDockProps.ts` LOC | 111 |

Verified both cuts with `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched in this sequence.

Next pass should start from a clean `ad42cef` baseline and inspect remaining low-risk prop-composition or non-TTS UI-state boundaries before touching runtime logic.
## Follow-up — 2026-06-11 Focused training view props

Latest committed baseline: `522a983 Extract focused training view props`.

This checkpoint adds `src/app/useFocusedTrainingViewProps.ts`, which owns focused `TrainingView` prop composition, visible score/accuracy/lag labels, focused training controls wiring, replay availability mapping, pending-session callbacks, sync summary props, and generation button props.

Current App shell metrics after this checkpoint:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2670 |
| `src/app/useFocusedTrainingViewProps.ts` LOC | 177 |

Verified with `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched. The hook receives `onReplayFocusedTts` as a callback and does not own replay logic.

Next pass should start from a clean `522a983` baseline and inspect remaining low-risk prop-composition or non-TTS UI-state boundaries before touching runtime logic.
## Follow-up — 2026-06-11 Modularization ROI reassessment

Latest committed baseline: `f0c2d4f Extract app shell sync status text`.

This checkpoint recalibrates the App shell modularization strategy. The earlier phase successfully removed large prop-composition, workspace, action, persistence, auth, OpenRouter, adaptive, leaderboard, admin, and focused-training clusters from `src/App.tsx`.

The remaining work should no longer be evaluated as "can this become a hook?" but as "does this extraction reduce App-shell complexity enough to justify another module?"

Current App shell metrics at this reassessment:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2675 |
| `src/app/useAppShellSyncStatusText.ts` LOC | 43 |

### Updated decision model

Future extractions should be ranked by ROI:

1. High ROI — derived-state or runtime/state clusters that remove meaningful App complexity, improve ownership, and create a testable seam.
2. Medium ROI — isolated effects or UI-state boundaries that reduce coupling but require careful dependency plumbing.
3. Low ROI — short labels, one-line callbacks, tiny prop wrappers, or cosmetic JSX moves.
4. Rejected for now — Browser TTS playback loop, `playTtsFromWord`, `resetSession`, phrase progression, TTS refs/timers/telemetry, or block-marker/regex-driven moves.

### Current assessment

The broad props-composition phase is mostly complete. More props hooks should be created only when they collapse a large, coherent boundary. The next useful work should target derived-state or non-playback runtime clusters.

Recommended next extraction: `useFocusedTrainingLiveMetrics`.

This candidate should own focused-training metric derivation: transcript evaluation, visible accuracy/score, points/max-points, score help text, points help text, and static accuracy help text. It is safer than session hydration/persistence because it is pure derived state and does not mutate sessions, timers, refs, playback state, or telemetry.

The expected benefit is not just line reduction. The main benefit is making listening metric derivation explicit and testable while reducing the number of derived values that `App.tsx` has to coordinate before building `focusedTrainingProps`.

Validation requirement remains unchanged: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

After the next extraction, update this checkpoint with actual `App.tsx` LOC, new hook LOC, validation results, and whether the extraction produced net App-shell reduction.

## Follow-up — 2026-06-11 Focused training live metrics

Latest committed baseline: `637e479 Extract focused training live metrics`.

This checkpoint records the first ROI-based code extraction after the broad props-composition phase.

`src/app/useFocusedTrainingLiveMetrics.ts` now owns focused-training live metric derivation: transcript building, deferred practice text evaluation, typed-word accuracy, listening-first score calculation, points/max-points labels, and metric help text.

Current App shell metrics after this extraction:

| Item                                           |      Value |
| ---------------------------------------------- | ---------: |
| `src/App.tsx` LOC                              |  2649 |
| `src/app/useFocusedTrainingLiveMetrics.ts` LOC | 88 |

ROI result:

* Positive App-shell reduction: the extraction removed more lines from `src/App.tsx` than it added back as hook wiring.
* Better ownership: focused live metric derivation is no longer interleaved with runtime effects and workspace prop composition.
* Better test seam: metric derivation now has a dedicated hook boundary.
* Runtime safety: Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should not automatically continue extracting hooks. Inspect the next candidate first and proceed only if it passes the ROI gate from the modularization map.

## Follow-up — 2026-06-11 App workspace content

Latest committed baseline: `3ef3b91 Extract app workspace content`.

This checkpoint records a presentational App-shell extraction after the focused live metrics hook.

`src/app/AppWorkspaceContent.tsx` now owns the App workspace switch: pending-session lane placement, dashboard rendering, Adaptive cockpit shell, OpenRouter access fallback, Ollama workspace, Admin access fallback, Leaderboard workspace, and the default Browser TTS prompt.

Current App shell metrics after this extraction:

| Item                                  |      Value |
| ------------------------------------- | ---------: |
| `src/App.tsx` LOC                     |  2597 |
| `src/app/AppWorkspaceContent.tsx` LOC | 128 |

ROI result:

* Positive App-shell reduction: the extraction removed the largest remaining workspace render branch from `src/App.tsx`.
* Better ownership: `App.tsx` keeps runtime state and hook orchestration, while `AppWorkspaceContent` owns workspace presentation branching.
* Better type boundary: generic workspace props remain concretely typed to `StoredSession` at the App shell boundary.
* Runtime safety: Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect before extracting. The BrowserTtsSetupCard prop block remains visible but may be too small for standalone ROI unless combined with a clearer setup-state boundary.

## Follow-up — 2026-06-11 Local dev API plugin

Latest committed baseline: `ab0c5a4 Extract local dev API plugin`.

This checkpoint records extraction of the local Vite development API from `vite.config.ts`.

`dev/dictaLocalDevApiPlugin.ts` now owns local middleware for OpenRouter models/key/chat/jobs, Ollama models/key/chat, `.env.local` key management, request body parsing/validation, local OpenRouter job storage, upstream error formatting, and admin file inventory.

Current metrics after this extraction:

| Item                                |      Value |
| ----------------------------------- | ---------: |
| `src/App.tsx` LOC                   |  2597 |
| `vite.config.ts` LOC                |  88 |
| `dev/dictaLocalDevApiPlugin.ts` LOC | 827 |

ROI result:

* Better ownership: Vite config now keeps build/plugin wiring, while the local development API has a dedicated plugin module.
* Better maintainability: local API route helpers, request parsing, key persistence, OpenRouter/Ollama proxy behavior, and admin file inventory are no longer nested inside `defineConfig`.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect before extracting. The remaining App render tail is small; further App-shell work should require a stronger boundary than a prop-only wrapper.

## Follow-up — 2026-06-11 Local dev env store

Latest committed baseline: `d9143ee Extract local dev env store`.

This checkpoint records extraction of `.env.local` API key persistence from `dev/dictaLocalDevApiPlugin.ts`.

`dev/localDevEnvStore.ts` now owns local OpenRouter/Ollama API key lookup, `.env.local` parsing, JSON/string quote handling, key upsert, and key removal. `dev/dictaLocalDevApiPlugin.ts` keeps route validation, request handling, upstream proxy behavior, job handling, and admin file inventory.

Current metrics after this extraction:

| Item                               | Value |
| ---------------------------------- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC | 712 |
| `dev/localDevEnvStore.ts` LOC       | 83 |

ROI result:

* Better ownership: local key persistence is separated from local API middleware routing.
* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 712 LOC.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect the remaining local dev API plugin before extracting model/prompt validation or admin file inventory.

## Follow-up — 2026-06-11 Local dev API validation

Latest committed baseline: `513affe Extract local dev API validation`.

This checkpoint records extraction of local OpenRouter/Ollama input validation from `dev/dictaLocalDevApiPlugin.ts`.

`dev/localDevApiValidation.ts` now owns API key validation, OpenRouter free-model normalization, Ollama model normalization, prompt length bounds, and `max_tokens` bounds. `dev/dictaLocalDevApiPlugin.ts` keeps route handling, request parsing, upstream proxy behavior, local job handling, and admin file inventory.

Current metrics after this extraction:

| Item                                  | Value |
| ------------------------------------- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC   | 655 |
| `dev/localDevApiValidation.ts` LOC    | 105 |
| `dev/localDevEnvStore.ts` LOC         | 83 |

ROI result:

* Better ownership: local route middleware now delegates validation and normalization to a focused module.
* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 655 LOC.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect the remaining local dev API plugin before extracting admin file inventory or OpenRouter job route helpers.

## Follow-up — 2026-06-11 Local dev admin file inventory

Latest committed baseline: `68f8530 Extract local dev admin file inventory`.

This checkpoint records extraction of local admin file inventory from `dev/dictaLocalDevApiPlugin.ts`.

`dev/localDevAdminFiles.ts` now owns fixture/public asset folder inventory, recursive file discovery, extension counts, transcript counts, and byte totals. `dev/dictaLocalDevApiPlugin.ts` keeps the `/api/admin/files` middleware route and delegates inventory construction.

Current metrics after this extraction:

| Item                                  | Value |
| ------------------------------------- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC   | 599 |
| `dev/localDevAdminFiles.ts` LOC       | 86 |
| `dev/localDevApiValidation.ts` LOC    | 105 |
| `dev/localDevEnvStore.ts` LOC         | 83 |

ROI result:

* Better ownership: admin file inventory is separated from local API middleware routing.
* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 599 LOC.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect the remaining local dev API plugin before extracting OpenRouter job route helpers.

## Follow-up — 2026-06-11 Local OpenRouter job store

Latest committed baseline: `a3970d6 Extract local OpenRouter job store`.

This checkpoint records extraction of the local OpenRouter job store from `dev/dictaLocalDevApiPlugin.ts`.

`dev/localDevOpenRouterJobs.ts` now owns the in-memory job map, active job counting, queued job creation, and job state transitions for running, succeeded, and failed OpenRouter jobs. `dev/dictaLocalDevApiPlugin.ts` keeps the `/api/openrouter/jobs` middleware route, request parsing, validation, upstream OpenRouter call, and response handling.

Current metrics after this extraction:

| Item                                  | Value |
| ------------------------------------- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC   | 567 |
| `dev/localDevOpenRouterJobs.ts` LOC   | 94 |
| `dev/localDevAdminFiles.ts` LOC       | 86 |
| `dev/localDevApiValidation.ts` LOC    | 105 |
| `dev/localDevEnvStore.ts` LOC         | 83 |

ROI result:

* Better ownership: local job lifecycle state is separated from local API middleware routing.
* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 567 LOC.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect before extracting more from `/api/openrouter/jobs`; the remaining route still owns request parsing and the upstream OpenRouter call.

## Follow-up — 2026-06-11 Local dev Ollama helpers

Latest committed baseline: `5acd4de Extract local dev Ollama helpers`.

This checkpoint records extraction of local Ollama helper logic from `dev/dictaLocalDevApiPlugin.ts`.

`dev/localDevOllamaHelpers.ts` now owns Ollama upstream error text extraction, user-facing Ollama auth/quota/error formatting, and Ollama model payload normalization with the recommended model fallback. `dev/dictaLocalDevApiPlugin.ts` keeps the Ollama middleware routes, key lookup, request parsing, upstream fetch calls, and response handling.

Current metrics after this extraction:

| Item                                  | Value |
| ------------------------------------- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC   | 505 |
| `dev/localDevOllamaHelpers.ts` LOC    | 77 |
| `dev/localDevOpenRouterJobs.ts` LOC   | 94 |
| `dev/localDevAdminFiles.ts` LOC       | 86 |
| `dev/localDevApiValidation.ts` LOC    | 105 |
| `dev/localDevEnvStore.ts` LOC         | 83 |

ROI result:

* Better ownership: Ollama-specific model/error helper behavior is separated from local API middleware routing.
* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 505 LOC.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect before extracting more shared request/response helpers; the remaining plugin still owns route orchestration.

## Follow-up — 2026-06-11 Local dev HTTP helpers

Latest committed baseline: `e0b2782 Extract local dev HTTP helpers`.

This checkpoint records extraction of shared local development HTTP helper logic from `dev/dictaLocalDevApiPlugin.ts`.

`dev/localDevHttpHelpers.ts` now owns local HTTP error construction, local error response formatting, request body size enforcement, JSON request parsing, and API key suffix masking. `dev/dictaLocalDevApiPlugin.ts` keeps middleware route orchestration, local dev store wiring, OpenRouter/Ollama/admin route handling, upstream fetch calls, and response payload ownership.

Current metrics after this extraction:

| Item                                  | Value |
| ------------------------------------- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC   | 462 |
| `dev/localDevHttpHelpers.ts` LOC      | 65 |
| `dev/localDevOllamaHelpers.ts` LOC    | 77 |
| `dev/localDevOpenRouterJobs.ts` LOC   | 94 |
| `dev/localDevAdminFiles.ts` LOC       | 86 |
| `dev/localDevApiValidation.ts` LOC    | 105 |
| `dev/localDevEnvStore.ts` LOC         | 83 |

ROI result:

* Better ownership: shared HTTP utility behavior is separated from local API route orchestration.
* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 462 LOC.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect before extracting full route handlers; the remaining plugin is now mostly route orchestration and upstream fetch wiring.

## Follow-up — 2026-06-11 Local OpenRouter client helper

Latest committed baseline: `d9b918e Extract local OpenRouter client helper`.

This checkpoint records extraction of the shared local OpenRouter chat-completion request helper from `dev/dictaLocalDevApiPlugin.ts`.

`dev/localDevOpenRouterClient.ts` now owns the local OpenRouter chat-completion `fetch` call, request headers, referer fallback, title header, message payload shape, and `max_tokens` request body mapping. `dev/dictaLocalDevApiPlugin.ts` keeps OpenRouter route orchestration, API key lookup, request validation, direct chat response passthrough, and job-result parsing.

Current metrics after this extraction:

| Item                                  | Value |
| ------------------------------------- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC   | 449 |
| `dev/localDevOpenRouterClient.ts` LOC | 30 |
| `dev/localDevHttpHelpers.ts` LOC      | 65 |
| `dev/localDevOllamaHelpers.ts` LOC    | 77 |
| `dev/localDevOpenRouterJobs.ts` LOC   | 94 |
| `dev/localDevAdminFiles.ts` LOC       | 86 |
| `dev/localDevApiValidation.ts` LOC    | 105 |
| `dev/localDevEnvStore.ts` LOC         | 83 |

ROI result:

* Better ownership: duplicated local OpenRouter upstream request construction is separated from route orchestration.
* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 449 LOC.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect before extracting full route handlers; the remaining plugin is mostly local dev route orchestration and response handling.

## Follow-up — 2026-06-11 Local Ollama client helper

Latest committed baseline: `9c5cf1b Extract local Ollama client helper`.

This checkpoint records extraction of local Ollama upstream request helpers from `dev/dictaLocalDevApiPlugin.ts`.

`dev/localDevOllamaClient.ts` now owns the local Ollama models `fetch`, Ollama chat `fetch`, authorization/accept headers, non-streaming chat payload shape, and `num_predict` request mapping. `dev/dictaLocalDevApiPlugin.ts` keeps Ollama route orchestration, API key lookup, validation, upstream response passthrough, and user-facing error formatting.

Current metrics after this extraction:

| Item                                  | Value |
| ------------------------------------- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC   | 435 |
| `dev/localDevOllamaClient.ts` LOC     | 39 |
| `dev/localDevOpenRouterClient.ts` LOC | 30 |
| `dev/localDevHttpHelpers.ts` LOC      | 65 |
| `dev/localDevOllamaHelpers.ts` LOC    | 77 |
| `dev/localDevOpenRouterJobs.ts` LOC   | 94 |
| `dev/localDevAdminFiles.ts` LOC       | 86 |
| `dev/localDevApiValidation.ts` LOC    | 105 |
| `dev/localDevEnvStore.ts` LOC         | 83 |

ROI result:

* Better ownership: duplicated local Ollama upstream request construction is separated from route orchestration.
* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 435 LOC.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect before extracting full route handlers; the remaining plugin is now mostly local dev route orchestration, API-key branching, and response handling.

## Follow-up — 2026-06-11 Local dev API key routes

Latest committed baseline: `36e3312 Extract local dev API key routes`.

This checkpoint records extraction of duplicated local API-key route handling from `dev/dictaLocalDevApiPlugin.ts`.

`dev/localDevApiKeyRoutes.ts` now owns registration for local API-key status, save, and delete routes for OpenRouter and Ollama. `dev/dictaLocalDevApiPlugin.ts` keeps provider-specific store wiring, validation wiring, model/chat/job/admin route orchestration, and upstream response handling.

Current metrics after this extraction:

| Item | Value |
| ---- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC | 347 |
| `dev/localDevApiKeyRoutes.ts` LOC | 86 |
| `dev/localDevOllamaClient.ts` LOC | 39 |
| `dev/localDevOpenRouterClient.ts` LOC | 30 |
| `dev/localDevHttpHelpers.ts` LOC | 65 |
| `dev/localDevOllamaHelpers.ts` LOC | 77 |
| `dev/localDevOpenRouterJobs.ts` LOC | 94 |
| `dev/localDevAdminFiles.ts` LOC | 86 |
| `dev/localDevApiValidation.ts` LOC | 105 |
| `dev/localDevEnvStore.ts` LOC | 83 |

ROI result:

* Better ownership: `localDevApiKeyRoutes.ts` is separated from local API route orchestration.
* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 347 LOC.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect before extracting larger route handlers; the remaining plugin is now mostly provider model/chat/job/admin route orchestration.

## Follow-up — 2026-06-12 Local dev model and chat routes

Latest committed baseline: `4e99044 Extract local dev chat routes`.

This checkpoint records two local-dev route extractions.

Recent commit context:

* `4e99044 (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract local dev chat routes`
* `73b67dd Extract local dev model routes`
* `b9158f5 Document local dev API key routes extraction`
* `36e3312 Extract local dev API key routes`

Route ownership after this extraction:

* `dev/localDevModelRoutes.ts` owns local OpenRouter/Ollama model route registration and provider model proxy response handling.
* `dev/localDevChatRoutes.ts` owns local OpenRouter/Ollama chat route registration, request parsing, validation wiring, and provider chat proxy response handling.
* `dev/dictaLocalDevApiPlugin.ts` remains the local-dev route composition root and keeps API-key, job, admin, and provider wiring orchestration.

Current metrics after these extractions:

| Item | Value |
| ---- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC | 217 |
| `dev/localDevChatRoutes.ts` LOC | 134 |
| `dev/localDevModelRoutes.ts` LOC | 90 |
| `dev/localDevApiKeyRoutes.ts` LOC | 86 |
| `dev/localDevOllamaClient.ts` LOC | 39 |
| `dev/localDevOpenRouterClient.ts` LOC | 30 |
| `dev/localDevHttpHelpers.ts` LOC | 65 |
| `dev/localDevOllamaHelpers.ts` LOC | 77 |
| `dev/localDevOpenRouterJobs.ts` LOC | 94 |
| `dev/localDevAdminFiles.ts` LOC | 86 |
| `dev/localDevApiValidation.ts` LOC | 105 |
| `dev/localDevEnvStore.ts` LOC | 83 |

ROI result:

* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 217 LOC.
* Better ownership: model and chat route handlers are now separated from the plugin composition root.
* Safer follow-up path: the remaining larger candidates are OpenRouter job route orchestration and smaller admin/file route wiring.
* Validation passed before the code commits: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect before extracting the OpenRouter job routes because they include async job lifecycle handling.

## Follow-up — 2026-06-12 Local dev OpenRouter job routes

Latest committed baseline: `74caa63 Extract local dev OpenRouter job routes`.

This checkpoint records extraction of local OpenRouter async job route handling from `dev/dictaLocalDevApiPlugin.ts`.

Recent commit context:

* `74caa63 (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract local dev OpenRouter job routes`
* `9bb48ee Document local dev model and chat routes extraction`
* `4e99044 Extract local dev chat routes`
* `73b67dd Extract local dev model routes`

Route ownership after this extraction:

* `dev/localDevOpenRouterJobRoutes.ts` owns `/api/openrouter/jobs`, including job status lookup, active-job limit enforcement, request parsing, queued job creation, and async job lifecycle transitions.
* `dev/localDevOpenRouterJobs.ts` continues to own the in-memory job store, job types, and job state mutation helpers.
* `dev/dictaLocalDevApiPlugin.ts` remains the local-dev route composition root and now primarily wires route modules plus remaining admin/file behavior.

Current metrics after this extraction:

| Item | Value |
| ---- | ----: |
| `dev/dictaLocalDevApiPlugin.ts` LOC | 120 |
| `dev/localDevOpenRouterJobRoutes.ts` LOC | 149 |
| `dev/localDevChatRoutes.ts` LOC | 134 |
| `dev/localDevModelRoutes.ts` LOC | 90 |
| `dev/localDevApiKeyRoutes.ts` LOC | 86 |
| `dev/localDevOllamaClient.ts` LOC | 39 |
| `dev/localDevOpenRouterClient.ts` LOC | 30 |
| `dev/localDevHttpHelpers.ts` LOC | 65 |
| `dev/localDevOllamaHelpers.ts` LOC | 77 |
| `dev/localDevOpenRouterJobs.ts` LOC | 94 |
| `dev/localDevAdminFiles.ts` LOC | 86 |
| `dev/localDevApiValidation.ts` LOC | 105 |
| `dev/localDevEnvStore.ts` LOC | 83 |

ROI result:

* Lower plugin size: `dictaLocalDevApiPlugin.ts` dropped to 120 LOC.
* Better ownership: async OpenRouter job orchestration is now separated from the plugin composition root.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.
* Runtime safety: App runtime, Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.

Next work should inspect remaining plugin LOC before another extraction. The likely remaining candidate is admin/file route wiring, but ROI may be lower now that the plugin is only about 120 LOC.

## Follow-up — 2026-06-12 OpenRouter direct generation presets

Latest committed baseline: `ce8b0dc Extract OpenRouter direct generation presets`.

This checkpoint records extraction of direct OpenRouter generation preset policy from `src/app/useOpenRouterGenerationActions.ts`.

Recent commit context:

* `ce8b0dc (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract OpenRouter direct generation presets`
* `23cb0a6 Document local dev OpenRouter job routes extraction`
* `74caa63 Extract local dev OpenRouter job routes`
* `9bb48ee Document local dev model and chat routes extraction`
* `4e99044 Extract local dev chat routes`

Ownership after this extraction:

* `src/app/openRouterDirectGenerationPresets.ts` owns the easy, medium, hard, express easy, express medium, and express hard direct generation presets.
* `src/app/useOpenRouterGenerationActions.ts` keeps the OpenRouter generation side effects, access checks, job request flow, and state updates.
* `src/app/useFocusedTrainingGenerationButtons.ts` can now be inspected for a follow-up reuse pass against the shared preset catalog.

Current metrics after this extraction:

| Item | Value |
| ---- | ----: |
| `src/App.tsx` LOC | 2597 |
| `src/app/useOpenRouterGenerationActions.ts` LOC | 403 |
| `src/app/openRouterDirectGenerationPresets.ts` LOC | 78 |
| `src/app/useFocusedTrainingGenerationButtons.ts` LOC | 208 |

ROI result:

* Better ownership: generation policy/presets are separated from OpenRouter request side effects.
* Lower duplication risk: future changes to direct generation labels, target difficulty, duration, intent, or difficulty instructions have one source of truth.
* No runtime-sensitive areas touched: Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

Next work should inspect whether `useFocusedTrainingGenerationButtons.ts` can reuse `openRouterDirectGenerationPresets` without introducing an over-abstract button builder.

## Follow-up — 2026-06-12 OpenRouter preset reuse in generation buttons

Latest committed baseline: `4ca95c0 Reuse OpenRouter direct generation presets in buttons`.

This checkpoint records reuse of `src/app/openRouterDirectGenerationPresets.ts` inside `src/app/useFocusedTrainingGenerationButtons.ts`.

Recent commit context:

* `4ca95c0 (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Reuse OpenRouter direct generation presets in buttons`
* `76a5582 Document OpenRouter direct generation presets extraction`
* `ce8b0dc Extract OpenRouter direct generation presets`
* `23cb0a6 Document local dev OpenRouter job routes extraction`
* `74caa63 Extract local dev OpenRouter job routes`

Ownership after this extraction:

* `src/app/openRouterDirectGenerationPresets.ts` remains the source of truth for direct OpenRouter generation ids, slot labels, display labels, durations, intents, target difficulties, and difficulty instructions.
* `src/app/useOpenRouterGenerationActions.ts` keeps OpenRouter request side effects and generation job flow.
* `src/app/useFocusedTrainingGenerationButtons.ts` now reuses the shared preset catalog for button ids and OpenRouter job slot matching, while keeping button labels, titles, help text, disabled state, and notices local to the focused training UI.

Current metrics after this extraction:

| Item | Value |
| ---- | ----: |
| `src/App.tsx` LOC | 2597 |
| `src/app/useFocusedTrainingGenerationButtons.ts` LOC | 238 |
| `src/app/openRouterDirectGenerationPresets.ts` LOC | 78 |
| `src/app/useOpenRouterGenerationActions.ts` LOC | 403 |

ROI result:

* Better consistency: direct generation actions and focused training buttons now share one preset catalog for ids and slot labels.
* Lower duplication risk: future changes to generation slot ownership no longer require duplicate edits across action and button hooks.
* Controlled abstraction: the hook keeps UI copy and UI-specific disabled/status behavior local instead of moving everything into an over-general button factory module.
* No runtime-sensitive areas touched: Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

Next work should re-evaluate ROI before extracting more. Good next candidates are pure export/package builders or OpenRouter prompt planning helpers, not TTS runtime or hydration.

## Follow-up — 2026-06-12 Adaptive export package builders

Latest committed baseline: `222e676 Extract adaptive export package builders`.

This checkpoint records extraction of pure adaptive export/package builders from `src/app/useAdaptiveExportActions.ts` into `src/app/adaptiveExportPackages.ts`.

Recent commit context:

* `222e676 (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract adaptive export package builders`
* `3b986f9 Document OpenRouter preset reuse in buttons`
* `4ca95c0 Reuse OpenRouter direct generation presets in buttons`
* `76a5582 Document OpenRouter direct generation presets extraction`
* `ce8b0dc Extract OpenRouter direct generation presets`

Ownership after this extraction:

* `src/app/adaptiveExportPackages.ts` owns pure builders for adaptive event counts, session feedback export payloads, benchmark feedback export payloads, benchmark feedback prompt text, human-feedback prompt payloads, and insights diagnostic report exports.
* `src/app/useAdaptiveExportActions.ts` keeps browser/UI side effects: clipboard writes, JSON downloads, textarea selection fallback, try/catch handling, and user-facing export status messages.
* `src/app/useDictaDebugExportEffect.ts` now imports `buildAdaptiveEventCounts` from the pure builder module instead of importing a pure helper from a hook file.

Current metrics after this extraction:

| Item | Value |
| ---- | ----: |
| `src/App.tsx` LOC | 2597 |
| `src/app/useAdaptiveExportActions.ts` LOC | 254 |
| `src/app/adaptiveExportPackages.ts` LOC | 166 |
| `src/app/useDictaDebugExportEffect.ts` LOC | 118 |

ROI result:

* Better ownership: package construction is separated from browser side effects.
* Better test seam: adaptive export payload/report builders are now plain functions and can be tested independently.
* Cleaner dependency direction: debug export no longer imports a helper from `useAdaptiveExportActions.ts`.
* Controlled abstraction: the hook remains responsible for UI side effects instead of being split into several small callback hooks.
* No runtime-sensitive areas touched: Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched.
* Validation passed before commit: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

Next work should inspect ROI before another extraction. Good candidates remain pure planning/package helpers; avoid TTS runtime, hydration, reset, and phrase progression unless handled as a dedicated design pass.


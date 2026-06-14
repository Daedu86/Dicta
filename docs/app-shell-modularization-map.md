Repo-wide modularization ROI decisions now live in `docs/modularization-roi.md`. Use that document as the canonical scoring framework before applying any App Shell or non-App-Shell extraction.

# App shell modularization map

Updated: 2026-06-14 after active-session sync, TTS submit action, and Browser TTS playback loop extraction.
Status: REFERENCE
Verified against branch: `product/input-2`
Verified against code baseline: post `Extract Browser TTS playback loop` push; `src/App.tsx` blob `09f94a6d52841c04ab13fe6790800a8dd839f11d`; `src/app/useBrowserTtsPlaybackLoop.ts` blob `b5156b5e9dfcfa80639506c7079847387b7d3476`
Source inspection command: `git status --short && git log --oneline --decorate -5 && git grep -n -e "useBrowserTtsPlaybackLoop" -e "function resetSession" src/App.tsx src/app`
Test map checked: `docs/module-test-map.md`
Last candidate decision updated: 2026-06-14

## Current baseline

This document is a reference checkpoint and candidate queue. It intentionally avoids deep stale line inventories. Regenerate fresh anchors before any non-trivial App shell extraction.

The values below are observational anchors, not stable APIs. Recheck them before editing.

| Item | Value |
| --- | ---: |
| Branch | product/input-2 |
| Current `src/App.tsx` LOC after Browser TTS playback loop extraction | 1665 |
| Current `src/app/useBrowserTtsPlaybackLoop.ts` LOC after extraction | 505 |
| Current `src/app/useActiveSessionStateSync.ts` LOC after extraction | 308 |
| Current `src/app/useTtsSessionSubmitAction.ts` LOC after extraction | 176 |
| Current Browser TTS playback-loop owner | `src/app/useBrowserTtsPlaybackLoop.ts` |
| Current App role for Browser TTS playback | Composition/root wiring, refs, state, callbacks, and hook invocation |
| Browser TTS playback loop contract tests | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/browserTtsUtteranceConfigurationContract.test.ts` |

## Completed since the original map

- `useModelCatalogRuntime` owns OpenRouter model catalog state and refresh actions.
- `useDictaLocalStorageImportRuntime` owns Dicta localStorage snapshot import restore actions.
- `useKeyboardRemapRuntime` owns active typing-language resolution and Spanish physical-key remapping.
- `useAdaptiveExportActions` owns adaptive benchmark/session-feedback copy, export, and insights diagnostic actions.
- `useSupabaseAuthActions` owns Supabase sign-in, password reset/update, auth view switching, and sign-out handlers.
- `useSessionCreationActions` owns plain-text session creation, DictationScript import validation/creation, OpenRouter script session creation actions, and the reusable session-creation form reset action.
- `b0cbc40` removed the former secondary provider UI, app state, server routes, local-dev proxy routes, env docs, and route tests; OpenRouter remains the active model/provider flow.
- `useWorkspaceSessionSummaries` owns derived session collections and workspace summaries.
- `useWorkspaceNavigationEffects` owns non-TTS workspace navigation side effects.
- `useOpenRouterGenerationBusyState` owns OpenRouter generation busy flags.
- `useOpenRouterGenerationActions` owns direct-training OpenRouter generation side effects, job request flow, generation failure notices, and OpenRouter generate-workspace focusing.
- `useOpenRouterErrorSessionActions` owns persistent OpenRouter generation-error session creation and custom-workspace job error persistence.
- `useFocusedTrainingGenerationButtons` owns focused-training OpenRouter generation button composition, notices, running state labels, disabled/title wiring, and click handlers.
- `useSessionCreateCardProps` owns session creation card prop composition for source/name state, quota state, script-import validation state, creation/import callbacks, and Metric wiring.
- `useAdminWorkspaceProps` owns Admin workspace prop composition for session/admin summaries, localStorage/session snapshot actions, profile access callbacks, auth headers, and OpenRouter model refresh wiring.
- `useLeaderboardWorkspaceProps` owns leaderboard workspace prop composition, leaderboard expand/collapse callbacks, session snapshot actions, session navigation callbacks, and display formatter wiring.
- `useAdaptiveAdvancedDiagnosticsProps` owns Adaptive advanced diagnostics prop composition for expand/collapse callbacks, benchmark adapter selection, message reset, and benchmark-section scrolling.
- `useAdaptiveBenchmarkSectionProps` owns Adaptive benchmark section prop composition, benchmark selection message reset, and benchmark/session-feedback copy/export callback wiring.
- `useLiveMetricsDockProps` owns live metrics dock prop composition, metrics view setters, insights diagnostics callback wiring, collapsed-state toggling, and TTS-current-chunk presence mapping.
- `useFocusedTrainingViewProps` owns focused `TrainingView` prop composition, visible metric labels, training controls wiring, replay availability mapping, pending-session callbacks, sync summary props, and generation button props.
- `useFocusedTrainingLiveMetrics` owns focused-training live metric derivation, transcript evaluation, visible accuracy/score, points labels, and metric help text.
- `focusedTrainingPresentation` and `useFocusedTrainingPresentationState` own focused training presentation derivations for TTS player progress, source labels, text placeholder/value, and training message tone.
- `focusedTrainingInputTelemetry` and `useFocusedTrainingInputTelemetryRuntime` own focused training immediate-input telemetry initialization and live-text ref updates.
- `AppWorkspaceContent` owns the App workspace switch, pending-session lane placement, dashboard/adaptive/OpenRouter/Admin/Leaderboard branch rendering, and workspace access fallbacks.
- `useWorkspaceModelRefreshRuntime` owns workspace model assignment/default resolution and delegates OpenRouter refresh actions to `useModelRefreshActions`.
- `browserTtsSessionEnvironment` and `useBrowserTtsSessionEnvironmentRuntime` own Browser TTS session voice assignment, voice/environment fingerprint attachment, and active voice resolution outside `App.tsx`.
- Local dev API helpers own Vite local API routes, OpenRouter proxy/job behavior, admin file inventory, local env key parsing, request validation, job storage, and HTTP response helpers.
- `useAuthWorkspaceProps`, `useAppShellHeaderProps`, `useAppShellSyncStatusText`, and `useOpenRouterWorkspaceProps` own workspace/header/sync prop composition.
- `useBrowserTtsSetupCardProps` owns Browser TTS setup card prop composition and is covered by `tests/browserTtsSetupCardProps.test.ts`.
- `useAdaptiveDiagnosticsUiState`, `useAdaptiveStoragePersistenceEffects`, `useDictaDebugExportEffect`, `useAdaptiveWorkspaceState`, and `useAdaptiveWorkspacePresentationState` own adaptive workspace state, persistence, debug export, and presentation derivations.
- `adaptiveExportPackages`, `openRouterDirectGenerationPresets`, and `openRouterDirectGenerationJobPlan` own pure adaptive export and OpenRouter direct generation planning seams.
- `useTtsPerformanceSampler` owns Browser TTS performance sampling, transcript evaluation, lag stabilization, live signal updates, UI metric publication, telemetry samples/actions, finalize timestamps, and returned metric packaging.
- `useTtsPlaybackControls` owns Browser TTS pause/resume/stop/seek control actions, runtime ref cleanup, action telemetry, and control-driven status transitions.
- `useTtsTelemetryRecorder` owns Browser TTS attempt telemetry initialization, elapsed-time calculation, control-action recording, and chunk telemetry recording.
- `useTtsUiPublisher` owns Browser TTS live metric UI publication thresholds, 500 ms throttling, forced publication, published UI ref updates, and visible metric setter routing.
- `useTtsPlaybackProgressEstimator` owns Browser TTS spoken-word progress estimation for active chunks, completed-word fallback, finished playback, and source-word clamping.
- `browserTtsPlaybackPlan` owns pure Browser TTS next-chunk playback planning: candidate chunk selection, adaptive controller decision mapping, pacing mode derivation, runtime rate floor, unsafe-boundary policy, Android mobile fallback, DE recovery policy, executable telemetry frames, rolling accuracy windows, and next phrase-size/boundary state.
- `browserTtsPhraseCompletionTelemetry` owns pure Browser TTS phrase-completion benchmark telemetry payload construction for DE completion samples.
- `browserTtsChunkCompletion` owns pure Browser TTS chunk-completion state transitions: completed source-word calculation, macro phrase advancement, next macro word offset, phrase-advance detection, and pause-before-next-chunk scheduling metadata.
- `browserTtsAdaptiveSemanticDebug` owns pure Browser TTS semantic debug state builders for phrase-start aggregation and chunk-completion phrase identity/counter updates.
- `useActiveSessionStateSync` owns active-session hydration, finished-session state sync, and live-session persistence state sync that were previously inline effects in `App.tsx`.
- `useTtsSessionSubmitAction` owns Browser TTS session submit orchestration, including validation, final sampling, session finalization, persistence push, playback stop, finished statuses, adaptive feedback completion, and submit message publication.
- `useBrowserTtsPlaybackLoop` owns `playTts` and `playTtsFromWord`: start validation, playback start planning, `SpeechSynthesisUtterance` creation/configuration, handlers, phrase progression, adaptive benchmark writes, telemetry, next-chunk scheduling, and completion transitions.

## Current recommendation

- Start each implementation pass from the current working tree, not from historical candidate rankings.
- Treat `docs/modularization-roi.md` as the decision framework: choose the highest-payoff candidate that can be bounded, validated, and rolled back.
- The Browser TTS playback loop is no longer an App-owned candidate. Future playback-loop edits should target `src/app/useBrowserTtsPlaybackLoop.ts` and its contract tests.
- Do not treat Browser TTS, refs, timers, telemetry, `resetSession`, or playback runtime risk as an automatic veto. Treat that risk as validation cost, slice size, required characterization coverage, manual smoke scope, and rollback planning.
- Reject only candidates that are unbounded, untestable, too ambiguous to verify, or mostly create no-op wrapper indirection.
- The next plausible App-shell extraction is `resetSession` side-effect sequencing, but only after focused hook characterization. The semantic phrase selector remains too small to justify extraction on its own.

## Current high-risk anchors

These line numbers are observational and should be refreshed with `git grep` or `rg` before editing.

| Area | Current location |
| --- | --- |
| `resetSession` | `src/App.tsx` |
| `buildSemanticPhrasesForCurrentSession` | `src/App.tsx` |
| `useTtsTelemetryRecorder` hook call | `src/App.tsx` |
| `useTtsPlaybackProgressEstimator` hook call | `src/App.tsx` |
| `useTtsUiPublisher` hook call | `src/App.tsx` |
| `useTtsPerformanceSampler` hook call | `src/App.tsx` |
| `useTtsSessionSubmitAction` hook call | `src/App.tsx` |
| `useBrowserTtsPlaybackLoop` hook call | `src/App.tsx` |
| `playTts` / `playTtsFromWord` implementation | `src/app/useBrowserTtsPlaybackLoop.ts` |
| `useTtsPlaybackControls` hook call | `src/App.tsx` |
| `BrowserTtsSetupCard` prop hook/render branch | `src/App.tsx` |

## ROI-based modularization policy

The first modularization phase successfully removed large workspace/action/prop-composition clusters from `src/App.tsx`. Later Browser TTS work moved progressively from pure helpers to hook-level runtime ownership. The remaining work should not be driven by hook count alone, local LOC reduction, or risk avoidance alone. A proposed extraction should pass the ROI-first scorecard in `docs/modularization-roi.md`.

Current interpretation for the App shell:

- High ROI generally wins when the candidate can be sliced, characterized, manually smoked, and rolled back.
- Runtime risk decides how much validation is required; it does not automatically send the candidate to the bottom of the queue.
- A high-risk candidate should be deferred only when the inspected slice is still unbounded, untestable, too ambiguous, or too coupled to review safely.
- No-op wrappers, prop bags, string moves, and tiny callback moves should lose even when they are low risk.
- AI-assisted refactors must remain small, explicit, test-backed, and reversible. Do not accept an extracted hook that takes one broad opaque App state object.

## Active candidate queue

Scores use `docs/modularization-roi.md`: ROI is 0-100 where higher is better; risk / validation cost is 0-100 where higher means more validation burden.

Only non-implemented candidates belong in this table. Implemented candidates belong in the completed extraction log below.

| Candidate name | Current location / line range | Proposed extraction target | Expected net LOC movement | Runtime boundaries touched | Main behavior preserved | ROI score | Risk / validation cost score | Required tests | Required manual smoke checks | Rollback plan | Decision | Reason |
| --- | --- | --- | ---: | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| `resetSession` side-effect body | `src/App.tsx` | Possible future `src/app/useResetSessionRuntime.ts` or smaller reset side-effect helper | 20-35 fewer `App.tsx` lines | reset lifecycle, Browser TTS stop ordering, refs, telemetry, UI metrics, adaptive feedback | Keep `buildResetSessionState` defaults, `preserveInputSettingsLock`, finished-session reset allowance, `stopTtsPlayback` ordering, TTS refs, UI metrics, telemetry reset, and adaptive feedback reset | 64 | 78 | Existing `tests/resetSessionState.test.ts` and `tests/useTrainingSessionLifecycle.test.ts`; add hook characterization before moving side effects | Reset ready and finished sessions; confirm setup lock preservation; confirm Browser TTS setup expands only when expected; verify submit message clears | Revert hook/helper import and restore inline body from `App.tsx` | defer | The remaining body is mostly sequencing across playback, refs, telemetry, state setters, and feedback tracking. Risk is not a veto, but payoff is lower after reset defaults were already extracted and the side-effect slice needs more characterization first. |
| `buildSemanticPhrasesForCurrentSession` | `src/App.tsx` | Possible `src/app/semanticPhraseSelection.ts` | 0-5 fewer `App.tsx` lines | phrase selection | Keep DictationScript sessions using script phrases and plain text sessions using ordered semantic phrases | 34 | 24 | Existing `tests/semanticPhrasePlanner.test.ts` and `tests/dictationScriptValidation.test.ts` would remain enough unless behavior changes | Create/import one script session and one plain-text Browser TTS session if touched | Revert helper import and inline the conditional | reject | The function is too small to justify a new module by itself. It is low risk, but the ROI is also low and would mostly add indirection. |

## Completed extraction log

Implemented candidates stay here as historical evidence. Do not select them again.

| Implemented candidate | Extraction target | App.tsx effect | Tests / validation notes | Preserved boundary | Notes |
| --- | --- | ---: | --- | --- | --- |
| `applyTtsPerformanceSample` | `src/app/useTtsPerformanceSampler.ts` | About 96 fewer `App.tsx` lines before docs/test additions | `tests/useTtsPerformanceSampler.test.ts`; keep `tests/lagStability.test.ts`, `tests/sessionFeedbackDebugLag.test.ts`, and `tests/perfDiagnostics.test.ts` relevant | Transcript evaluation, visible metrics, lag stabilization, telemetry samples/actions, final metrics | Implemented as the first bounded high-ROI Browser TTS runtime seam. |
| Browser TTS control cluster: `pauseTts` / `resumeTts` / `stopTtsPlayback` / `seekTtsPlayback` | `src/app/useTtsPlaybackControls.ts` | About 41 fewer `App.tsx` lines before docs/test additions | `tests/useTtsPlaybackControls.test.ts`; keep lifecycle/runtime/sampler tests relevant | Pause/resume/stop/seek behavior, browser cancel/resume routing, telemetry actions, status transitions | Implemented as a bounded Browser TTS runtime seam. |
| TTS UI publication helper | `src/app/useTtsUiPublisher.ts` | About 6 fewer `App.tsx` lines before docs/test additions | `tests/useTtsUiPublisher.test.ts`; keep sampler/telemetry/control/runtime tests relevant | Changed-value thresholds, 500 ms throttling, forced publication, visible metric setters | Small LOC payoff, but useful direct coverage for UI metric publication behavior. |
| TTS telemetry recorder helper | `src/app/useTtsTelemetryRecorder.ts` | About 38 fewer `App.tsx` lines before docs/test additions | `tests/useTtsTelemetryRecorder.test.ts`; keep sampler/control/lifecycle/runtime tests relevant | Attempt telemetry initialization, elapsed-time calculation, action/chunk telemetry recording | Implemented as a bounded Browser TTS telemetry seam after playback controls. |
| TTS progress helper seam | `src/app/useTtsPlaybackProgressEstimator.ts` | About 8 fewer `App.tsx` lines before docs/test additions | `tests/useTtsPlaybackProgressEstimator.test.ts`; keep sampler/control/runtime tests relevant | Spoken-word progress estimation, active chunk fallback, completed-source fallback | Modest App reduction but useful timing/ref seam for pause, seek, and sampler lag calculations. |
| TTS session finalization state | `src/app/ttsSessionFinalization.ts` | About 3 fewer `App.tsx` lines before docs/test additions, with lower decision complexity in `submitTtsSession` | `tests/ttsSessionFinalization.test.ts`; nearby validation used `tests/useTtsPerformanceSampler.test.ts` and `tests/useTrainingSessionLifecycle.test.ts` | Final session replacement, finished status, updated timestamp, final metrics/telemetry, practice text, Browser TTS voice/environment metadata, finalized-session lookup | Selected because it is deterministic, explicit, directly testable, and low browser/runtime risk. |
| Browser TTS phrase-completion telemetry | `src/app/browserTtsPhraseCompletionTelemetry.ts` | About 7 fewer `App.tsx` lines before docs/test additions, with lower decision complexity in the completion branch | `tests/browserTtsPhraseCompletionTelemetry.test.ts`; keep plan/chunk/sampler/control/runtime tests relevant | DE phrase-completed benchmark telemetry payload construction | Selected as a smaller pure helper inside the playback loop. |
| Browser TTS chunk-completion semantic debug update | `src/app/browserTtsAdaptiveSemanticDebug.ts` | Lower decision complexity in the completion branch; local `App.tsx` LOC roughly neutral after import formatting | `tests/browserTtsAdaptiveSemanticDebug.test.ts`; `tests/browserTtsPlaybackLoopContract.test.ts` keeps source-order contract aware of helper call | Current phrase identity, preview, counters, and `lastPhraseAdvanceReason: 'chunk_complete'` | Selected after playback-loop characterization because it is deterministic and directly testable. |
| Active session state sync | `src/app/useActiveSessionStateSync.ts` | About 98 fewer `App.tsx` lines in the implementing commit | `tests/useActiveSessionStateSync.test.ts`; keep `tests/activeSessionHydration.test.ts`, `tests/resetSessionState.test.ts`, and `tests/sessionStatusNormalization.test.ts` relevant | Active-session hydration, finished-session sync, live-session persistence state sync | Moved effect ownership out of App while preserving hydration gating and persistence normalization behavior. |
| Browser TTS session submit action | `src/app/useTtsSessionSubmitAction.ts` | About 48 fewer `App.tsx` lines in the implementing commit | `tests/useTtsSessionSubmitAction.test.ts`; keep `tests/ttsSessionFinalization.test.ts`, sampler, playback-controls, and lifecycle tests relevant | Submit validation, final sampling, session finalization, persistence push, playback stop, statuses, feedback completion, submit message | Moved TTS submit orchestration out of App while keeping the playback loop separate. |
| Browser TTS playback loop | `src/app/useBrowserTtsPlaybackLoop.ts` | Large App reduction: `App.tsx` is now 1665 LOC and delegates `playTts` / `playTtsFromWord` to the hook | `tests/browserTtsPlaybackLoopContract.test.ts` and `tests/browserTtsUtteranceConfigurationContract.test.ts` now inspect the new owner; full validation should include Browser TTS plan/start/error/control tests | Playback validation, start planning, utterance creation/configuration, handlers, phrase progression, telemetry, adaptive benchmark writes, next-chunk scheduling, and completion transitions | This is the high-risk ownership move that earlier docs deferred. It was accepted after source-order characterization was updated and the App shell now acts as caller/composition root. |

## Freshness and update rules

- If a candidate table entry is based on historical line numbers, refresh the line anchors before using it.
- If a candidate is implemented, move it from the active queue to the completed extraction log in the same documentation pass.
- If a new module is added, update `docs/module-test-map.md` in the same patch.
- If runtime behavior changes, update `docs/high-risk-runtime-boundaries.md` or the relevant product/runtime doc in a separate clearly named commit when possible.
- If the inspected current source contradicts this document, prefer the source and tests, then update this document.

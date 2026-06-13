Repo-wide modularization ROI decisions now live in `docs/modularization-roi.md`. Use that document as the canonical scoring framework before applying any App Shell or non-App-Shell extraction.

# App shell modularization map

Updated: 2026-06-13 after Browser TTS phrase-completion telemetry extraction.
Status: REFERENCE
Verified against branch: `product/input-2`
Verified against commit: update before use with current `git rev-parse --short HEAD`
Source inspection command: `git status --short && git log --oneline --decorate -5 && rg "function App|playTtsFromWord|resetSession" src/App.tsx`
Test map checked: `docs/module-test-map.md`
Last candidate decision updated: 2026-06-13

## Current baseline

This document began as a generated map. The historical deep inventory was intentionally retired after multiple completed extractions because stale line numbers and stale candidate rankings were starting to conflict with the current App shell state. Use this page as a reference checkpoint and candidate queue, but regenerate a fresh source inventory before any non-trivial App shell extraction.

The values below are observational anchors, not stable APIs. Recheck them before editing.

| Item | Value |
| --- | ---: |
| Branch | product/input-2 |
| Last measured source baseline before this extraction | a0bce0f |
| Current `src/App.tsx` LOC after this extraction | 2109 |
| Current `src/app/useWorkspaceModelRefreshRuntime.ts` LOC at that baseline | 76 |
| Current `src/app/useBrowserTtsSetupCardProps.ts` LOC at that baseline | 88 |
| Current `src/app/browserTtsPlaybackPlan.ts` LOC at that baseline | 367 |
| Current `src/app/ttsSessionFinalization.ts` LOC after this extraction | 54 |
| Current `src/app/browserTtsPhraseCompletionTelemetry.ts` LOC after this extraction | 36 |
| Current `tests/workspaceModelRefreshRuntime.test.ts` LOC at that baseline | 94 |
| Current `tests/browserTtsPlaybackPlan.test.ts` LOC at that baseline | 324 |
| Current `tests/ttsSessionFinalization.test.ts` LOC after this extraction | 120 |
| Current `tests/browserTtsPhraseCompletionTelemetry.test.ts` LOC after this extraction | 108 |
| App.tsx inline `useState` count at that baseline | 16 |
| App.tsx inline `useRef` count at that baseline | 27 |
| App.tsx inline `useMemo` count at that baseline | 5 |
| App.tsx inline `useEffect` count at that baseline | 7 |
| App.tsx inline function declarations inside `App()` at that baseline | 11 |

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
- `browserTtsSessionEnvironment` and `useBrowserTtsSessionEnvironmentRuntime` own Browser TTS session voice assignment, voice/environment fingerprint attachment, and active voice resolution outside `App.tsx` without moving playback behavior.
- `dictaLocalDevApiPlugin` owns the local Vite dev API routes, OpenRouter proxy routes, OpenRouter local job queue, and admin file inventory route.
- `localDevEnvStore` owns local `.env.local` API key read, parse, upsert, and removal behavior for OpenRouter.
- `localDevApiValidation` owns local OpenRouter API key validation, model id normalization, prompt bounds, and max-token bounds.
- `localDevAdminFiles` owns local admin file inventory for fixtures and public assets.
- `localDevOpenRouterJobs` owns the local OpenRouter job store, active job counting, and queued/running/succeeded/failed transitions.
- `localDevHttpHelpers` owns local dev HTTP errors, JSON/body parsing, local error responses, and API key suffix masking.
- `localDevOpenRouterClient` owns local OpenRouter chat-completion request construction and upstream fetch wiring.
- `useAuthWorkspaceProps` owns auth workspace prop composition for Supabase auth/profile/loading state, auth form state, messages, and auth callbacks.
- `useAppShellHeaderProps` owns App shell header prop composition, OpenRouter model labels, build labels, sync status labels, and header navigation/theme/sign-out callbacks.
- `useAppShellSyncStatusText` owns App shell sync/offline status label composition, pending-sync suffixes, and last-sync timestamp formatting glue.
- `useOpenRouterWorkspaceProps` owns OpenRouter workspace prop composition, model persistence wiring, export profile selection wiring, job notifications, and benchmark/session-feedback copy callbacks.
- `useBrowserTtsSetupCardProps` owns Browser TTS setup card prop composition and is covered by `tests/browserTtsSetupCardProps.test.ts`.
- `useAdaptiveDiagnosticsUiState` owns adaptive diagnostics UI state.
- `useAppPerfDiagnosticsRuntime` owns App render-count and perf diagnostics configuration; `App.tsx` still imports `perfDiagnostics` for active OpenRouter and TTS spans.
- `useAdaptiveStoragePersistenceEffects` owns adaptive benchmark/feedback local persistence and ref sync effects.
- `useDictaDebugExportEffect` owns the diagnostic `window.__DICTA_DEBUG_EXPORT__` registration and snapshot assembly.
- `useAdaptiveWorkspaceState` owns adaptive workspace debug, benchmark, feedback, focus, and message state.
- `adaptiveWorkspacePresentation` and `useAdaptiveWorkspacePresentationState` own Adaptive workspace presentation derivations for adapter cards, selected benchmark profiles, selected feedback, insights diagnostic profile/feedback, latest adaptive mode, latest input adapter, and diagnostic input options.
- `useDictaSupabaseRuntime` owns Dicta sync config and Supabase client memoization.
- `useSessionCreationWorkspaceState` owns session creation/import form state, session-creation source/json/cancel transition actions, and OpenRouter generation focus request state.
- `adaptiveExportPackages` owns pure adaptive export/package builders for session feedback, benchmark feedback, diagnostic reports, prompt packages, human-feedback payloads, and adaptive event counts.
- `openRouterDirectGenerationPresets` owns the direct OpenRouter generation preset catalog for easy, medium, hard, and express session variants.
- `openRouterDirectGenerationJobPlan` owns pure OpenRouter direct-generation planning: profile/feedback lookup, prompt construction, max-token sizing, request payload construction, and the `ActiveOpenRouterJob` draft without `jobId`.
- `useTtsPerformanceSampler` owns Browser TTS performance sampling, transcript evaluation, lag stabilization, live signal updates, UI metric publication, telemetry samples/actions, finalize timestamps, and returned metric packaging.
- `useTtsPlaybackControls` owns Browser TTS pause/resume/stop/seek control actions, runtime ref cleanup, action telemetry, and control-driven status transitions without moving the full `playTtsFromWord` playback loop.
- `useTtsTelemetryRecorder` owns Browser TTS attempt telemetry initialization, elapsed-time calculation, control-action recording, and chunk telemetry recording without moving the full `playTtsFromWord` playback loop.
- `useTtsUiPublisher` owns Browser TTS live metric UI publication thresholds, 500 ms throttling, forced publication, published UI ref updates, and visible metric setter routing.
- `useTtsPlaybackProgressEstimator` owns Browser TTS spoken-word progress estimation for active chunks, completed-word fallback, finished playback, and source-word clamping.
- `browserTtsPlaybackPlan` owns pure Browser TTS next-chunk playback planning: candidate chunk selection, adaptive controller decision mapping, pacing mode derivation, runtime rate floor, unsafe-boundary policy, Android mobile fallback, DE recovery policy, executable telemetry frames, rolling accuracy windows, and next phrase-size/boundary state. The full `playTtsFromWord` / `speakNext` loop, `SpeechSynthesisUtterance` creation, event handlers, adaptive benchmark writes, telemetry persistence, UI setters, refs, submit, and reset behavior remain in `src/App.tsx`.
- `browserTtsPhraseCompletionTelemetry` owns pure Browser TTS phrase-completion telemetry payload construction for DE completion benchmark samples. The `SpeechSynthesisUtterance` event handler, performance sampling call, adaptive benchmark write, refs, and playback loop remain in `src/App.tsx`.
- `ttsSessionFinalization` owns pure TTS session finalization state construction for `submitTtsSession`: target session replacement, finished status, updated timestamp, final metrics/telemetry, practice text, Browser TTS voice/environment metadata, and finalized-session lookup. `App.tsx` still owns validation, performance sampling, voice/environment collection, persistence, playback stop, UI setters, telemetry side effects, feedback side effects, and submit orchestration.
- `browserTtsChunkCompletion` owns pure Browser TTS chunk-completion state transitions: completed source-word calculation, macro phrase advancement, next macro word offset, phrase-advance detection, and pause-before-next-chunk scheduling metadata.
- `browserTtsAdaptiveSemanticDebug` owns Browser TTS phrase-start adaptive semantic debug aggregation: pause safety counts, deferred pause/replay penalties, rolling semantic completeness/difficulty averages, execution fidelity, phrase preview, and phrase counter publication.

## Current recommendation

- Start each implementation pass from the current working tree, not from historical candidate rankings.
- Treat `docs/modularization-roi.md` as the decision framework: choose the highest-payoff candidate that can be bounded, validated, and rolled back.
- Do not treat Browser TTS, refs, timers, telemetry, `resetSession`, or `playTtsFromWord` risk as an automatic veto. Treat that risk as validation cost, slice size, required characterization coverage, manual smoke scope, and rollback planning.
- Reject only candidates that are unbounded, untestable, too ambiguous to verify, or mostly create no-op wrapper indirection.
- Do not immediately jump to the full playback loop without a fresh scorecard, focused characterization coverage, and explicit stop conditions.
- After the phrase-completion telemetry seam, the next highest-confidence work is characterization around `playTtsFromWord` / the Browser TTS playback loop before moving more runtime code. Do not recommend extracting `playTtsFromWord` wholesale yet. Only select another helper inside the loop if inspection finds a deterministic block with explicit inputs and focused tests. Keep wholesale `resetSession` extraction deferred unless a smaller deterministic helper with a strong test seam appears.

## Current high-risk anchors

These line numbers were observed in the post-phrase-completion-telemetry working tree. Recheck with `rg` before editing; they are anchors for risk inspection, not stable APIs.

| Area | Current location |
| --- | --- |
| `resetSession` | `src/App.tsx:920` |
| `buildSemanticPhrasesForCurrentSession` | `src/App.tsx:972` |
| `useTtsTelemetryRecorder` hook call | `src/App.tsx:1104-1109` |
| `useTtsPlaybackProgressEstimator` hook call | `src/App.tsx:1110-1119` |
| `useTtsUiPublisher` hook call | `src/App.tsx:1121-1138` |
| `useTtsPerformanceSampler` hook call | `src/App.tsx:1140-1157` |
| `submitTtsSession` | `src/App.tsx:1161-1205` |
| `playTts` | `src/App.tsx:1208` |
| `playTtsFromWord` | `src/App.tsx:1213-1544` |
| `useTtsPlaybackControls` hook call | `src/App.tsx:1549-1583` |
| `BrowserTtsSetupCard` prop hook call | `src/App.tsx:1985` |
| `BrowserTtsSetupCard` render branch | `src/App.tsx:2076` |

## ROI-based modularization policy

The first modularization phase successfully removed large workspace/action/prop-composition clusters from `src/App.tsx`. The remaining work should not be driven by hook count alone, local LOC reduction, or risk avoidance alone. A proposed extraction should pass the ROI-first scorecard in `docs/modularization-roi.md`.

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
| `resetSession` side-effect body | `src/App.tsx:920-964` | Possible future `src/app/useResetSessionRuntime.ts` or smaller reset side-effect helper | 20-35 fewer `App.tsx` lines | reset lifecycle, Browser TTS stop ordering, refs, telemetry, UI metrics, adaptive feedback | Keep `buildResetSessionState` defaults, `preserveInputSettingsLock`, finished-session reset allowance, `stopTtsPlayback` ordering, TTS refs, UI metrics, telemetry reset, and adaptive feedback reset | 64 | 78 | Existing `tests/resetSessionState.test.ts` and `tests/useTrainingSessionLifecycle.test.ts`; add hook characterization before moving side effects | Reset ready and finished sessions; confirm setup lock preservation; confirm Browser TTS setup expands only when expected; verify submit message clears | Revert hook/helper import and restore inline body from `App.tsx` | defer | The remaining body is mostly sequencing across playback, refs, telemetry, state setters, and feedback tracking. Risk is not a veto, but payoff is lower after reset defaults were already extracted and the side-effect slice needs more characterization first. Wholesale extraction remains deferred unless inspection finds a smaller deterministic helper with a strong test seam. |
| `buildSemanticPhrasesForCurrentSession` | `src/App.tsx:976-981` | Possible `src/app/semanticPhraseSelection.ts` | 0-5 fewer `App.tsx` lines | phrase selection | Keep DictationScript sessions using script phrases and plain text sessions using ordered semantic phrases | 34 | 24 | Existing `tests/semanticPhrasePlanner.test.ts` and `tests/dictationScriptValidation.test.ts` would remain enough unless behavior changes | Create/import one script session and one plain-text Browser TTS session if touched | Revert helper import and inline the conditional | reject | The function is too small to justify a new module by itself. It is low risk, but the ROI is also low and would mostly add indirection. |
| `playTtsFromWord` playback loop | `src/App.tsx:1213-1544` | Future characterization tests first, then possible smaller pure helper inside the loop if inspection finds one | 0 fewer `App.tsx` lines for characterization; unknown for a later bounded helper | SpeechSynthesis events, Browser TTS refs/timers, adaptive benchmark writes, phrase progression, telemetry, submit/completion behavior | Preserve validation errors, voice/environment capture, semantic phrase indexing, German recovery-safe chunks, adaptive decisions, rate/floor/unsafe policies, benchmark events, utterance handlers, phrase advancement, and completion behavior | 90 | 98 | Add characterization around playback-loop behavior before moving more code; later add mocked SpeechSynthesis loop tests only for a bounded helper seam | Full playback through multiple chunks; replay from word; German recovery; unexpected utterance error; complete session transition | Revert characterization/helper import and restore inline function | defer | It remains high ROI but still too coupled to nested browser callbacks, adaptive benchmark writes, refs, and phrase progression. One deterministic helper has now been extracted; do not extract the loop wholesale yet. The next safe pass should be characterization of the broader loop behavior. |

## Completed extraction log

Implemented candidates stay here as historical evidence. Do not select them again.

| Implemented candidate | Extraction target | App.tsx effect | Tests / validation notes | Preserved boundary | Notes |
| --- | --- | ---: | --- | --- | --- |
| `applyTtsPerformanceSample` | `src/app/useTtsPerformanceSampler.ts` | About 96 fewer `App.tsx` lines before docs/test additions | `tests/useTtsPerformanceSampler.test.ts`; keep `tests/lagStability.test.ts`, `tests/sessionFeedbackDebugLag.test.ts`, and `tests/perfDiagnostics.test.ts` relevant | Transcript evaluation, visible metrics, lag stabilization, telemetry samples/actions, final metrics | Implemented as the first bounded high-ROI Browser TTS runtime seam. The full SpeechSynthesis event loop remained in `App.tsx`. |
| Browser TTS control cluster: `pauseTts` / `resumeTts` / `stopTtsPlayback` / `seekTtsPlayback` | `src/app/useTtsPlaybackControls.ts` | About 41 fewer `App.tsx` lines before docs/test additions | `tests/useTtsPlaybackControls.test.ts`; keep lifecycle/runtime/sampler tests relevant | Pause/resume/stop/seek behavior, browser cancel/resume routing, telemetry actions, status transitions | Implemented as a bounded Browser TTS runtime seam. The full `playTtsFromWord` event loop remained in `App.tsx`. |
| TTS UI publication helper | `src/app/useTtsUiPublisher.ts` | About 6 fewer `App.tsx` lines before docs/test additions | `tests/useTtsUiPublisher.test.ts`; keep sampler/telemetry/control/runtime tests relevant | Changed-value thresholds, 500 ms throttling, forced publication, visible metric setters | Small LOC payoff, but useful direct coverage for UI metric publication behavior. |
| TTS telemetry recorder helper | `src/app/useTtsTelemetryRecorder.ts` | About 38 fewer `App.tsx` lines before docs/test additions | `tests/useTtsTelemetryRecorder.test.ts`; keep sampler/control/lifecycle/runtime tests relevant | Attempt telemetry initialization, elapsed-time calculation, action/chunk telemetry recording | Implemented as a bounded Browser TTS telemetry seam after playback controls. |
| TTS progress helper seam | `src/app/useTtsPlaybackProgressEstimator.ts` | About 8 fewer `App.tsx` lines before docs/test additions | `tests/useTtsPlaybackProgressEstimator.test.ts`; keep sampler/control/runtime tests relevant | Spoken-word progress estimation, active chunk fallback, completed-source fallback | Modest App reduction but useful timing/ref seam for pause, seek, and sampler lag calculations. |
| TTS session finalization state | `src/app/ttsSessionFinalization.ts` | About 3 fewer `App.tsx` lines before docs/test additions, with lower decision complexity in `submitTtsSession` | `tests/ttsSessionFinalization.test.ts`; nearby validation used `tests/useTtsPerformanceSampler.test.ts` and `tests/useTrainingSessionLifecycle.test.ts` | Final session replacement, finished status, updated timestamp, final metrics/telemetry, practice text, Browser TTS voice/environment metadata, finalized-session lookup | Selected because it is a deterministic state transition with explicit inputs, a focused test seam, low browser/runtime risk, and no wrapper-only indirection. `App.tsx` keeps orchestration and side effects. |
| Browser TTS phrase-completion telemetry | `src/app/browserTtsPhraseCompletionTelemetry.ts` | About 7 fewer `App.tsx` lines before docs/test additions, with lower decision complexity in the `playTtsFromWord` completion branch | `tests/browserTtsPhraseCompletionTelemetry.test.ts`; keep `tests/browserTtsPlaybackPlan.test.ts`, `tests/browserTtsChunkCompletion.test.ts`, sampler, controls, and runtime tests relevant | DE phrase-completed benchmark telemetry payload construction: phrase id fallback, latest live lag/accuracy/wpm fields, unsafe chunk count, and preserved chunk context | Selected as the smaller pure helper inside the playback loop after ROI inspection. `App.tsx` keeps the `SpeechSynthesisUtterance` event handler, sampling call, adaptive benchmark write, refs, timers, and playback orchestration. |

## Freshness and update rules

- If a candidate table entry is based on historical line numbers, refresh the line anchors before using it.
- If a candidate is implemented, move it from the active queue to the completed extraction log in the same documentation pass.
- If a new module is added, update `docs/module-test-map.md` in the same patch.
- If runtime behavior changes, update `docs/high-risk-runtime-boundaries.md` or the relevant product/runtime doc in a separate clearly named commit when possible.
- If the inspected current source contradicts this document, prefer the source and tests, then update this document.

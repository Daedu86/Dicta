Repo-wide modularization ROI decisions now live in `docs/modularization-roi.md`. Use that document as the canonical scoring framework before applying any App Shell or non-App-Shell extraction.

# App shell modularization map

Updated: 2026-06-12 after TTS playback progress estimator extraction.

## Current baseline

This document began as a generated map. The historical deep inventory was intentionally retired after multiple completed extractions because stale line numbers and stale candidate rankings were starting to conflict with the current App shell state. Use this page as the active checkpoint and queue, and regenerate a fresh deep inventory before any non-trivial App shell extraction.

| Item | Value |
| --- | ---: |
| Branch | product/input-2 |
| Latest clean code baseline | 71855e7 |
| Current `src/App.tsx` LOC | 2264 |
| Current `src/app/useWorkspaceModelRefreshRuntime.ts` LOC | 76 |
| Current `src/app/useBrowserTtsSetupCardProps.ts` LOC | 88 |
| Current `tests/workspaceModelRefreshRuntime.test.ts` LOC | 94 |
| App.tsx inline `useState` count | 25 |
| App.tsx inline `useRef` count | 27 |
| App.tsx inline `useMemo` count | 5 |
| App.tsx inline `useEffect` count | 7 |
| App.tsx inline function declarations inside `App()` | 11 |

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

## Current recommendation

- Start the next implementation pass from the post-progress-estimator working tree and re-run the ROI scorecard before selecting another extraction.
- Treat `docs/modularization-roi.md` as the decision framework: choose the highest-ROI candidate that can be bounded and validated.
- Do not treat Browser TTS, refs, timers, telemetry, `resetSession`, or `playTtsFromWord` risk as an automatic veto. Treat that risk as validation cost, slice size, required characterization coverage, manual smoke scope, and rollback planning.
- Reject only candidates that are unbounded, untestable, too ambiguous to verify, or mostly create no-op wrapper indirection.
- The previously selected Browser TTS progress estimator has been extracted. Do not immediately jump to the full playback loop without a fresh ROI scorecard.

## Current high-risk anchors

These line numbers were observed in the post-progress-estimator working tree. Recheck with `rg` before editing; they are anchors for risk inspection, not stable APIs.

| Area | Current location |
| --- | --- |
| `resetSession` | `src/App.tsx:926` |
| `buildSemanticPhrasesForCurrentSession` | `src/App.tsx:978` |
| `useTtsTelemetryRecorder` hook call | `src/App.tsx:1103-1110` |
| `useTtsPlaybackProgressEstimator` hook call | `src/App.tsx:1116-1125` |
| `useTtsUiPublisher` hook call | `src/App.tsx:1127-1144` |
| `useTtsPerformanceSampler` hook call | `src/App.tsx:1146-1163` |
| `playTts` | `src/App.tsx:1219` |
| `playTtsFromWord` | `src/App.tsx:1224-1697` |
| `useTtsPlaybackControls` hook call | `src/App.tsx:1705-1739` |
| `BrowserTtsSetupCard` prop hook call | `src/App.tsx:2141` |
| `BrowserTtsSetupCard` render branch | `src/App.tsx:2232` |

## ROI-based modularization policy

The first modularization phase successfully removed large workspace/action/prop-composition clusters from `src/App.tsx`. The remaining work should not be driven by hook count alone or by risk avoidance alone. A proposed extraction should pass the ROI-first scorecard in `docs/modularization-roi.md`.

Current interpretation for the App shell:

- High ROI generally wins when the candidate can be sliced, characterized, manually smoked, and rolled back.
- Runtime risk decides how much validation is required; it does not automatically send the candidate to the bottom of the queue.
- A high-risk candidate should be deferred only when the inspected slice is still unbounded, untestable, too ambiguous, or too coupled to review safely.
- No-op wrappers, prop bags, string moves, and tiny callback moves should lose even when they are low risk.

## Current candidate scorecard

Scores use `docs/modularization-roi.md`: ROI is 0-100 where higher is better; risk / validation cost is 0-100 where higher means more validation burden.

| Candidate name | Current location / line range | Proposed extraction target | Expected net LOC movement | Main behavior preserved | ROI score | Risk / validation cost score | Required tests | Required manual smoke checks | Rollback plan | Decision | Reason |
| --- | --- | --- | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| `resetSession` side-effect body | `src/App.tsx:924-965` | Possible future `src/app/useResetSessionRuntime.ts` or smaller reset side-effect helper | 20-35 fewer `App.tsx` lines | Keep `buildResetSessionState` defaults, `preserveInputSettingsLock`, finished-session reset allowance, `stopTtsPlayback` ordering, TTS refs, UI metrics, telemetry reset, and adaptive feedback reset | 64 | 78 | Existing `tests/resetSessionState.test.ts` and `tests/useTrainingSessionLifecycle.test.ts`; add hook characterization before moving side effects | Reset ready and finished sessions; confirm setup lock preservation; confirm Browser TTS setup expands only when expected; verify submit message clears | Revert hook/helper import and restore inline body from `App.tsx` | defer | The remaining body is mostly sequencing across playback, refs, telemetry, state setters, and feedback tracking. Risk is not a veto, but payoff is lower after reset defaults were already extracted and the side-effect slice needs more characterization first. |
| `applyTtsPerformanceSample` | Formerly `src/App.tsx:1201-1312`; now `src/app/useTtsPerformanceSampler.ts` with hook call at `src/App.tsx:1197-1214` | `src/app/useTtsPerformanceSampler.ts` | About 96 fewer `App.tsx` lines before docs/test additions | Preserve transcript evaluation, visible accuracy, lag stabilization, WPM, score, live signal updates, throttled UI publishing, previous lag/accuracy refs, telemetry samples/actions, finalize timestamp, and returned metrics | 86 | 70 | `tests/useTtsPerformanceSampler.test.ts`; keep `tests/lagStability.test.ts`, `tests/sessionFeedbackDebugLag.test.ts`, and `tests/perfDiagnostics.test.ts` relevant for surrounding behavior | Browser TTS start and type during playback; verify lag/accuracy/WPM update; submit a session and confirm final metrics/feedback; check one non-German language plus German recovery-sensitive playback | Revert `src/app/useTtsPerformanceSampler.ts`, remove its test, and restore the inline function plus `applyTtsPerformanceSampleRef.current` assignment | select | Implemented as the first bounded high-ROI Browser TTS runtime seam. The full SpeechSynthesis event loop remains in `App.tsx`. |
| `buildSemanticPhrasesForCurrentSession` | `src/App.tsx:976-981` | Possible `src/app/semanticPhraseSelection.ts` | 0-5 fewer `App.tsx` lines | Keep DictationScript sessions using script phrases and plain text sessions using ordered semantic phrases | 34 | 24 | Existing `tests/semanticPhrasePlanner.test.ts` and `tests/dictationScriptValidation.test.ts` would remain enough unless behavior changes | Create/import one script session and one plain-text Browser TTS session if touched | Revert helper import and inline the conditional | reject | The function is too small to justify a new module by itself. It is low risk, but the ROI is also low and would mostly add indirection. |
| Browser TTS control cluster: `pauseTts` / `resumeTts` / `stopTtsPlayback` / `seekTtsPlayback` | Formerly `src/App.tsx:1751-1822`; now `src/app/useTtsPlaybackControls.ts` with hook call at `src/App.tsx:1757-1791` | `src/app/useTtsPlaybackControls.ts` | About 41 fewer `App.tsx` lines before docs/test additions | Preserve pause word capture, browser cancel/resume routing, action telemetry, status transitions, stopped playback defaults, seek target clamping, paused/playing seek replay behavior, and finished-session guards | 82 | 78 | `tests/useTtsPlaybackControls.test.ts`; keep `tests/useTrainingSessionLifecycle.test.ts` and `tests/useBrowserTtsRuntime.test.ts`; run `tests/useTtsPerformanceSampler.test.ts` because controls record telemetry consumed by the sampler | Start, pause, resume, stop, seek while idle, seek while playing/paused, submit after stop, and reset after stop in Browser TTS | Revert `src/app/useTtsPlaybackControls.ts`, remove its test, and restore the four inline functions | select | Implemented as the next bounded Browser TTS runtime seam. The full `playTtsFromWord` event loop remains in `App.tsx`. |
| `playTtsFromWord` playback loop | `src/App.tsx:1276-1750` | Future `src/app/useBrowserTtsPlaybackLoop.ts` or playback state-machine module | 350-430 fewer `App.tsx` lines if eventually moved | Preserve validation errors, voice/environment capture, semantic phrase indexing, German recovery-safe chunks, adaptive decisions, rate/floor/unsafe policies, benchmark events, utterance handlers, phrase advancement, and completion behavior | 90 | 98 | New mocked SpeechSynthesis loop tests, adaptive chunk characterization, `tests/ttsDynamicChunkPlanner.test.ts`, Browser TTS policy tests, and mobile smoke | Full playback through multiple chunks; replay from word; German recovery; unexpected utterance error; complete session transition | Revert playback-loop module and restore inline function | defer | It is high ROI but currently too coupled to refs, nested callbacks, browser events, adaptive benchmark writes, and phrase progression. Defer until `applyTtsPerformanceSample`, playback controls, and progress helpers reduce coupling and tests exist. |
| TTS UI publication helper | Formerly `src/App.tsx:1134-1159`; now `src/app/useTtsUiPublisher.ts` with hook call at `src/App.tsx:1135-1152` | `src/app/useTtsUiPublisher.ts` | About 6 fewer `App.tsx` lines before docs/test additions | Preserve changed-value thresholds, 500 ms throttling, forced publication, published UI ref updates, and visible metric setters | 70 | 48 | `tests/useTtsUiPublisher.test.ts`; keep `tests/useTtsPerformanceSampler.test.ts`, `tests/useTtsTelemetryRecorder.test.ts`, `tests/useTtsPlaybackControls.test.ts`, `tests/useTrainingSessionLifecycle.test.ts`, and `tests/useBrowserTtsRuntime.test.ts` | Start TTS and type during playback; confirm metric dock updates without per-keystroke churn | Revert `src/app/useTtsUiPublisher.ts`, remove its test, and restore inline publisher function | select | Implemented as a bounded Browser TTS UI publication seam. The small `App.tsx` reduction is offset by direct coverage for throttle and force-publish behavior. |
| TTS telemetry recorder helper | Formerly `src/App.tsx:1109-1168`; now `src/app/useTtsTelemetryRecorder.ts` with hook call at `src/App.tsx:1101-1108` | `src/app/useTtsTelemetryRecorder.ts` | About 38 fewer `App.tsx` lines before docs/test additions | Preserve startedAt initialization, cloned telemetry updates, action timestamps/rates, chunk telemetry timestamps, and `pause_repeat` repeat counting through `trackAction` | 73 | 54 | `tests/useTtsTelemetryRecorder.test.ts`; keep `tests/useTtsPerformanceSampler.test.ts`, `tests/useTtsPlaybackControls.test.ts`, `tests/useTrainingSessionLifecycle.test.ts`, and `tests/useBrowserTtsRuntime.test.ts` | Play, pause, seek, and submit once to confirm telemetry actions and chunks still populate | Revert `src/app/useTtsTelemetryRecorder.ts`, remove its test, and restore inline telemetry helpers | select | Implemented as a bounded Browser TTS telemetry seam after playback controls. The full SpeechSynthesis event loop remains in `App.tsx`. |
| TTS progress helper seam | Formerly `src/App.tsx:1115-1133`; now `src/app/useTtsPlaybackProgressEstimator.ts` with hook call at `src/App.tsx:1116-1125` | `src/app/useTtsPlaybackProgressEstimator.ts` | About 8 fewer `App.tsx` lines before docs/test additions | Preserve active chunk elapsed-time calculation, minimum speech-rate floor, chunk/source clamping, finished-source fallback, and completed-source fallback | 62 | 42 | `tests/useTtsPlaybackProgressEstimator.test.ts`; keep `tests/useTtsPerformanceSampler.test.ts`, `tests/useTtsPlaybackControls.test.ts`, and `tests/useBrowserTtsRuntime.test.ts` | Verify progress bar advances; seek to middle of text; pause/resume from estimated word | Revert `src/app/useTtsPlaybackProgressEstimator.ts`, remove its test, and restore inline estimator function | select | Implemented as a small but useful timing/ref seam. The direct App reduction is modest, but it adds direct coverage for progress estimation used by pause, seek, and sampler lag calculations. |

## TTS performance sampler extraction checkpoint

Implemented candidate: `applyTtsPerformanceSample`

Former source line range: `src/App.tsx:1201-1312` at `b1fc1d8`.

Extraction target: `src/app/useTtsPerformanceSampler.ts`. The patch did not move `playTtsFromWord`, `pauseTts`, `resumeTts`, `stopTtsPlayback`, `seekTtsPlayback`, or `resetSession`.

Expected behavior-preservation contract:

- use the latest local draft text via `ttsPracticeLiveTextRef` unless `practiceTextOverride` is passed;
- preserve `evaluateTranscriptAttempt`, visible accuracy, WPM, lag words, stable lag seconds, outlier counting, trend, score, and points calculations;
- preserve `ttsLiveSignalRef`, `previousLagRef`, `previousAccuracyRef`, and `ttsLastValidControlLagSecRef` updates;
- preserve throttled UI publication semantics through `publishTtsUiState`;
- preserve telemetry cloning, sample tracking, action tracking, controller-action transition tracking, and finalize timestamp behavior;
- keep the returned `TtsPerformanceSampleResult` shape unchanged;
- do not change `(inputMode, language)` adaptive profile scoping.

Tests added/run:

- Added `tests/useTtsPerformanceSampler.test.ts`.
- Covered no-start timestamp initialization, `practiceTextOverride`, German lag outlier fallback behavior, forced UI publication on `action`/`finalize`, telemetry action tracking, finalize timestamp, and returned metrics.
- Re-run `tests/lagStability.test.ts`, `tests/sessionFeedbackDebugLag.test.ts`, and any new sampler test.
- Because the implementation task will touch runtime code, also run `npm run test` and `npm run build` before finishing that follow-up.

Required manual QA checklist for the follow-up implementation:

- Start Browser TTS, type during playback, and confirm lag/accuracy/WPM update without typing lag.
- Submit a Browser TTS session and confirm final metrics, score, and feedback are populated.
- Check German Browser TTS plus one neighboring language such as English to confirm profile scoping is unchanged.
- Pause/resume once during playback to confirm sampler state survives control actions.

Stop conditions:

- Stop before code movement if the sampler requires moving the SpeechSynthesis event loop, adaptive benchmark writes, or reset semantics in the same patch.
- Stop if characterization tests need broad browser-event mocking before the sampler can be tested.
- Stop if the extracted hook requires passing most of `App.tsx` state as a single opaque object rather than explicit dependencies.
- Stop if manual smoke shows metrics or telemetry differ from the pre-extraction behavior.

## TTS playback controls extraction checkpoint

Implemented candidate: Browser TTS control cluster, specifically `pauseTts`, `resumeTts`, `stopTtsPlayback`, and `seekTtsPlayback`.

Former source line range: `src/App.tsx:1751-1822` in the post-sampler working tree based on `b1fc1d8`.

Extraction target: `src/app/useTtsPlaybackControls.ts`. The patch did not move `playTtsFromWord`, `playTts`, `submitTtsSession`, `resetSession`, adaptive benchmark writes, utterance event handlers, or semantic phrase progression.

Expected behavior-preservation contract:

- `pauseTts` captures `estimateTtsSpokenWordIndex()`, cancels Browser TTS when supported, clears utterance/chunk-start refs, records `pause`, and transitions non-finished sessions to paused.
- `resumeTts` uses `playTtsFromWord(ttsPausedAtWordIndexRef.current)` when a paused word exists; otherwise it resumes Browser TTS, records `resume`, initializes `ttsStartedAtMsRef` if needed, and marks the session playing/running.
- `stopTtsPlayback` optionally records the passed action, cancels Browser TTS, clears utterance/chunk/pause/completed refs, resets visible chunk/pacing/rate/running state, and derives `sessionStatus`/`ttsStatus` from practice/source text without changing finished sessions.
- `seekTtsPlayback` keeps the existing Browser TTS guard conditions, clamps target word index, records `seek`, either replays from target when playing/paused or updates ready/paused/progress state when idle.
- The extracted hook must use explicit dependencies and must not accept a broad opaque `App` state object.

Tests added/run:

- Added `tests/useTtsPlaybackControls.test.ts` with mocked browser-support, cancel/resume callbacks, refs, and setters.
- Covered pause, resume from paused word, resume through browser API, stop with/without action, stop status derivation for empty/non-empty practice/source text, seek while idle, seek while playing/paused, and seek guard no-ops.
- Re-run `tests/useTrainingSessionLifecycle.test.ts`, `tests/useBrowserTtsRuntime.test.ts`, `tests/useTtsPerformanceSampler.test.ts`, then `npm run test` and `npm run build`.

Required manual QA checklist:

- Browser TTS start, pause, resume, stop.
- Seek from idle and while playing/paused.
- Submit after stop still finalizes metrics.
- Reset after stop still returns the session to ready/idle as before.
- Check German Browser TTS plus one neighboring language such as English.

Stop conditions:

- Stop if the extraction requires moving the nested `playTtsFromWord` playback loop.
- Stop if the hook cannot be tested without real `speechSynthesis`.
- Stop if dependencies collapse into one broad object instead of named refs/setters/callbacks.
- Stop if seek or stop semantics need behavior changes to make the extraction compile.

## TTS telemetry recorder extraction checkpoint

Implemented candidate: TTS telemetry recorder helper, specifically `ensureAttemptTelemetry`, `getTtsElapsedSeconds`, `recordTtsTelemetryAction`, and `recordTtsChunkTelemetry`.

Former source line range: `src/App.tsx:1109-1168` in the post-playback-controls working tree.

Extraction target: `src/app/useTtsTelemetryRecorder.ts`. The patch did not move `playTtsFromWord`, `playTts`, `submitTtsSession`, `resetSession`, adaptive benchmark writes, utterance event handlers, UI publication, or semantic phrase progression.

Expected behavior-preservation contract:

- `ensureAttemptTelemetry` clones the current telemetry, initializes `startedAt` only when missing, writes the cloned object back to `telemetryRef`, and returns it.
- `getTtsElapsedSeconds` returns zero before playback start and otherwise clamps elapsed milliseconds to non-negative seconds.
- `recordTtsTelemetryAction` records actions at the current elapsed timestamp, defaults to the current TTS speech rate, preserves explicit action rates, and keeps `pause_repeat` counting through `trackAction`.
- `recordTtsChunkTelemetry` records chunk timestamps from the same elapsed-time source and appends start word, word count, rate, and pacing mode.
- The extracted hook uses explicit refs and rate dependencies and does not accept a broad opaque `App` state object.

Tests added/run:

- Added `tests/useTtsTelemetryRecorder.test.ts`.
- Covered started-at initialization/preservation, zero/non-negative elapsed time, default and explicit action rates, `pause_repeat` repeat counting, and chunk timestamps.
- Re-run `tests/useTtsPerformanceSampler.test.ts`, `tests/useTtsPlaybackControls.test.ts`, `tests/useTrainingSessionLifecycle.test.ts`, and `tests/useBrowserTtsRuntime.test.ts`.

Required manual QA checklist:

- Browser TTS start, pause, seek, stop, and submit once to confirm telemetry actions and chunks still populate.
- Check German Browser TTS plus one neighboring language such as English if a later patch changes telemetry interpretation.

Stop conditions:

- Stop if a follow-up telemetry extraction requires moving the nested `playTtsFromWord` playback loop.
- Stop if dependencies collapse into one broad object instead of named refs/rate callbacks.
- Stop if action/chunk telemetry semantics need behavior changes to make the extraction compile.

## TTS UI publisher extraction checkpoint

Implemented candidate: TTS UI publication helper, specifically `publishTtsUiState`.

Former source line range: `src/App.tsx:1134-1159` in the post-telemetry-recorder working tree.

Extraction target: `src/app/useTtsUiPublisher.ts`. The patch did not move `playTtsFromWord`, `playTts`, `submitTtsSession`, `resetSession`, adaptive benchmark writes, telemetry recording, utterance event handlers, or semantic phrase progression.

Expected behavior-preservation contract:

- `hasTtsUiStateChanged` preserves the existing threshold semantics for controller state, rate, lag seconds, lag words, WPM, accuracy, and trend.
- `publishTtsUiState` ignores unchanged state and changed state inside the 500 ms publication window unless forced.
- Successful publication updates `ttsPublishedUiRef` and `ttsUiLastPublishedAtRef`.
- Forced publication refreshes all visible metric setters, matching the sampler action/finalize path.
- Non-forced publication only calls visible metric setters whose values crossed the existing update thresholds.
- The extracted hook uses explicit refs, visible metric values, and setters and does not accept a broad opaque `App` state object.

Tests added/run:

- Added `tests/useTtsUiPublisher.test.ts`.
- Covered threshold comparison, unchanged no-op behavior, throttle behavior, changed-state publication, targeted setter updates, and force-publish refreshes.
- Re-run `tests/useTtsPerformanceSampler.test.ts`, `tests/useTtsTelemetryRecorder.test.ts`, `tests/useTtsPlaybackControls.test.ts`, `tests/useTrainingSessionLifecycle.test.ts`, and `tests/useBrowserTtsRuntime.test.ts`.

Required manual QA checklist:

- Start Browser TTS and type during playback to confirm live accuracy/WPM/lag still update without per-keystroke churn.
- Submit once to confirm forced final metric publication still appears before finalization.

Stop conditions:

- Stop if a follow-up UI publication change requires moving sampler calculations, playback loop code, or low-latency typing behavior.
- Stop if publishing starts depending on broad App state instead of explicit metric inputs/refs/setters.
- Stop if visible metric update thresholds need behavior changes to make the extraction compile.

## TTS playback progress estimator extraction checkpoint

Implemented candidate: TTS progress helper seam, specifically `estimateTtsSpokenWordIndex`.

Former source line range: `src/App.tsx:1115-1133` in the post-UI-publisher working tree.

Extraction target: `src/app/useTtsPlaybackProgressEstimator.ts`. The patch did not move `playTtsFromWord`, `playTts`, `submitTtsSession`, `resetSession`, adaptive benchmark writes, telemetry recording, UI publication, utterance event handlers, or semantic phrase progression.

Expected behavior-preservation contract:

- zero source words return zero progress.
- active playing chunks estimate progress from non-negative elapsed time, the current speech rate, the 2.6 base words-per-second constant, chunk start word, and chunk word count.
- very slow speech rates still use the existing one-word-per-second floor.
- playing estimates clamp to the source word count.
- finished playback returns full source progress.
- non-playing, non-finished states fall back to clamped completed source words.
- the extracted hook uses explicit refs, status, source word count, speech rate, and base speed and does not accept a broad opaque `App` state object.

Tests added/run:

- Added `tests/useTtsPlaybackProgressEstimator.test.ts`.
- Covered zero source words, playing chunk progress, negative elapsed time, minimum words-per-second floor, chunk/source clamping, finished playback, and completed-word fallback.
- Re-run `tests/useTtsPerformanceSampler.test.ts`, `tests/useTtsPlaybackControls.test.ts`, `tests/useTtsTelemetryRecorder.test.ts`, `tests/useTtsUiPublisher.test.ts`, `tests/useTrainingSessionLifecycle.test.ts`, and `tests/useBrowserTtsRuntime.test.ts`.

Required manual QA checklist:

- Browser TTS progress bar advances during playback.
- Pause captures the expected current word.
- Seek to the middle of the text and resume playback.

Stop conditions:

- Stop if a follow-up progress change requires moving the nested `playTtsFromWord` playback loop.
- Stop if estimator semantics need behavior changes to make the extraction compile.
- Stop if progress calculation starts depending on broad App state instead of explicit progress inputs.

Next selected candidate: none yet. Re-run the ROI scorecard before moving another Browser TTS runtime seam.

Recently added characterization coverage:

- `src/app/useWorkspaceRouting.ts` -> `tests/useWorkspaceRouting.test.ts`
- `src/app/useWorkspaceNavigationEffects.ts` -> `tests/useWorkspaceNavigationEffects.test.ts`
- `src/app/useSessionWorkspaceActions.ts` -> `tests/useSessionWorkspaceActions.test.ts`
- `src/app/sessionStorage.ts` -> `tests/sessionStorage.test.ts`

Reset-session ref-default extraction checkpoint:

- `fbec1d3` extended `src/app/resetSessionState.ts` with pure reset ref defaults.
- `tests/resetSessionState.test.ts` now characterizes playback-ref, UI-publish, and telemetry reset defaults.
- `src/App.tsx` still executes all ref assignments and owns side-effect ordering.
- `stopTtsPlayback`, `telemetryRef`, `allowFinishedSessionResetRef`, and `resetAdaptiveSessionFeedbackTracking` remain in `App.tsx`.
- Stop extracting `resetSession` here unless a future test-first plan specifically covers side-effect ordering.

Training lifecycle control characterization checkpoint:

- `c416cc3` expanded `tests/useTrainingSessionLifecycle.test.ts`.
- The tests characterize focused-training reset behavior, especially `resetSession({ preserveInputSettingsLock: true })`.
- The tests also cover Browser TTS input locking, setup panel collapse, pause/stop edit propagation, and paused playback resume behavior.
- This is sequencing coverage only. It does not move `resetSession`, Browser TTS playback, TTS refs, timers, or telemetry.
- Next technical work should remain test-first and should not extract `resetSession` wholesale.

Reset-session defaults extraction checkpoint:

- `51d0b7f` extracted pure reset default calculation into `src/app/resetSessionState.ts`.
- `tests/resetSessionState.test.ts` characterizes lock preservation, TTS ready/idle status, Browser TTS setup expansion, and non-Browser TTS behavior.
- `src/App.tsx` still owns reset side effects: `stopTtsPlayback`, TTS refs, published UI ref assignment, telemetry reset, finished-session reset allowance, and adaptive feedback reset.
- Do not extract `resetSession` wholesale yet. The remaining body is still playback/ref/telemetry-adjacent and needs a smaller test-first plan.

Active-session hydration extraction checkpoint:

- `a9e6e16` extracted pure active-session hydration state into `src/app/activeSessionHydration.ts`.
- `f637b29` fixed the `src/App.tsx` import for that helper.
- `tests/activeSessionHydration.test.ts` characterizes unfinished Browser TTS hydration, finished metric hydration, and default language/status fallback.
- `src/App.tsx` still owns the side effects: setters, refs, telemetry clone, training submit message, and feedback reset.
- Do not treat this as permission to extract `resetSession` wholesale; `resetSession` still mixes playback stop, visible-state reset, TTS refs, telemetry reset, input lock behavior, and adaptive feedback tracking.

Deferred after inspection:

- `SessionDashboard` prop/adaptor boundary — low ROI after local `git grep` inspection. `SessionDashboard` is not rendered directly by `src/App.tsx`; it is already owned by `src/app/AppWorkspaceContent.tsx`. `App.tsx` only derives `dashboardSession`, forwards `sessions`, formatter callbacks, and `onBackToTraining`, while dashboard routing/actions already live in `useWorkspaceRouting` and `useSessionWorkspaceActions`. A new `useSessionDashboardProps`-style wrapper would mostly package existing props, add indirection, and is unlikely to remove the required ~15-25 net `App.tsx` lines or create a meaningful test seam.

Use this pre-check before extracting:

~~~bash
git status --short
git log --oneline --decorate -8
git grep -n -E "function resetSession|function playTts|playTtsFromWord" -- src/App.tsx || true
git grep -n -C 20 -E "BrowserTtsSetupCard|SessionDashboard|SessionCreateCard" -- src/App.tsx src/app tests || true
git grep -n -E "useState\(|useRef<|useRef\(|useMemo\(|useEffect\(" -- src/App.tsx || true
wc -l src/App.tsx
~~~

Proceed only if a candidate removes at least ~15-25 net lines from `src/App.tsx` or creates a clearly testable state/derived-data/action boundary.

## Current validation coverage

- `tests/workspaceModelRefreshRuntime.test.ts` covers assigned OpenRouter model/default model resolution for member, admin, no-auth, missing-profile, and blank-assignment scenarios.
- `tests/openRouterDirectGenerationJobPlan.test.ts` covers standard direct job request bodies for easy/medium/hard, express duration/max-token sizing, prompt/draft metadata, preserved labels, and no network side effects.
- `tests/openRouterDirectGenerationPresets.test.ts` covers the direct generation preset catalog ids, durations, intent/difficulty mappings, unique slot labels, non-empty display labels, and difficulty instructions.
- `tests/adaptiveExportPackages.test.ts` covers adaptive export package invariants for event counts, fallback session feedback payloads, and human-feedback prompt payloads.
- `tests/adaptiveWorkspacePresentation.test.ts` covers Adaptive workspace presentation derivations for benchmark/profile fallbacks, latest feedback selection, insights diagnostics, adapter cards, and latest session mode mapping.
- `tests/focusedTrainingPresentation.test.ts` covers focused training presentation derivations for progress values, phrase/word labels, source labels, placeholders, and message tone.
- `tests/focusedTrainingInputTelemetry.test.ts` covers focused immediate-input telemetry initialization, startedAt preservation, startedAtMs preservation, legacy telemetry cloning, and live-text updates.
- `tests/useTtsTelemetryRecorder.test.ts` covers Browser TTS attempt telemetry initialization, elapsed-time calculation, control-action recording, repeat counting, and chunk telemetry recording.
- `tests/useTtsUiPublisher.test.ts` covers Browser TTS live metric UI publication thresholds, 500 ms throttling, ref updates, targeted setter updates, and force-publish behavior.
- `tests/useTtsPlaybackProgressEstimator.test.ts` covers Browser TTS spoken-word progress estimation for active chunks, elapsed-time clamping, speech-rate flooring, finished playback, and completed-word fallback.
- `tests/useTtsPerformanceSampler.test.ts` covers Browser TTS performance sampling, no-start timestamp initialization, practice text override, German lag outlier fallback, explicit submit action telemetry, finalize timestamps, and returned metrics.
- `tests/useTtsPlaybackControls.test.ts` covers Browser TTS pause/resume/stop/seek controls, runtime ref cleanup, action telemetry, status transitions, seek clamping, and seek no-op guards.
- `tests/sessionCreationWorkspaceState.test.ts` covers session-creation source/json/cancel transition actions and dictation-script validation reset behavior.
- `tests/sessionCreationActions.test.ts` covers the reusable session-creation form reset action for both expanded and collapsed Browser TTS setup states.
- `tests/browserTtsSetupCardProps.test.ts` covers Browser TTS setup-card prop object composition and memoization expectations.

## Suggested checkpoint command

For a local mirror, verify the checkpoint with:

~~~bash
git log --oneline --decorate -4
git show --stat --oneline HEAD
~~~

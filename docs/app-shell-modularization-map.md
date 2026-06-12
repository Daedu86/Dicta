Repo-wide modularization ROI decisions now live in `docs/modularization-roi.md`. Use that document as the canonical scoring framework before applying any App Shell or non-App-Shell extraction.

# App shell modularization map

Updated: 2026-06-12 after TTS performance sampler extraction.

## Current baseline

This document began as a generated map. The historical deep inventory was intentionally retired after multiple completed extractions because stale line numbers and stale candidate rankings were starting to conflict with the current App shell state. Use this page as the active checkpoint and queue, and regenerate a fresh deep inventory before any non-trivial App shell extraction.

| Item | Value |
| --- | ---: |
| Branch | product/input-2 |
| Latest clean code baseline | b1fc1d8 |
| Current `src/App.tsx` LOC | 2357 |
| Current `src/app/useWorkspaceModelRefreshRuntime.ts` LOC | 76 |
| Current `src/app/useBrowserTtsSetupCardProps.ts` LOC | 88 |
| Current `tests/workspaceModelRefreshRuntime.test.ts` LOC | 94 |
| App.tsx inline `useState` count | 25 |
| App.tsx inline `useRef` count | 27 |
| App.tsx inline `useMemo` count | 5 |
| App.tsx inline `useEffect` count | 7 |
| App.tsx inline function declarations inside `App()` | 21 |

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

## Current recommendation

- Start the next implementation pass from the post-sampler working tree and re-run the ROI scorecard before selecting another extraction.
- Treat `docs/modularization-roi.md` as the decision framework: choose the highest-ROI candidate that can be bounded and validated.
- Do not treat Browser TTS, refs, timers, telemetry, `resetSession`, or `playTtsFromWord` risk as an automatic veto. Treat that risk as validation cost, slice size, required characterization coverage, manual smoke scope, and rollback planning.
- Reject only candidates that are unbounded, untestable, too ambiguous to verify, or mostly create no-op wrapper indirection.
- The previously selected candidate, `applyTtsPerformanceSample`, has been extracted. Do not immediately jump to the full playback loop without a fresh bounded plan and tests.

## Current high-risk anchors

These line numbers were observed in the post-sampler working tree based on `b1fc1d8`. Recheck with `rg` before editing; they are anchors for risk inspection, not stable APIs.

| Area | Current location |
| --- | --- |
| `resetSession` | `src/App.tsx:924` |
| `buildSemanticPhrasesForCurrentSession` | `src/App.tsx:976` |
| `getTtsElapsedSeconds` / `estimateTtsSpokenWordIndex` | `src/App.tsx:1118-1151` |
| `publishTtsUiState` | `src/App.tsx:1170-1195` |
| `useTtsPerformanceSampler` hook call | `src/App.tsx:1197-1214` |
| `playTts` | `src/App.tsx:1270` |
| `playTtsFromWord` | `src/App.tsx:1275-1749` |
| `pauseTts` / `resumeTts` / `stopTtsPlayback` / `seekTtsPlayback` | `src/App.tsx:1751-1822` |
| `BrowserTtsSetupCard` prop hook call | `src/App.tsx:2234` |
| `BrowserTtsSetupCard` render branch | `src/App.tsx:2325` |

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
| `playTts` / `pauseTts` / `resumeTts` / `stopTtsPlayback` control cluster | `src/App.tsx:1270-1796` plus seek at `1803-1822` | Future `src/app/useBrowserTtsPlaybackControls.ts` after smaller seams are extracted | 300-420 fewer `App.tsx` lines if eventually moved | Preserve SpeechSynthesis start/cancel/resume, paused word index, session status transitions, chunk state, adaptive decisions, benchmark writes, telemetry actions, and submit/reset interactions | 92 | 96 | Characterization tests with mocked `speechSynthesis`; `tests/useBrowserTtsRuntime.test.ts`; Browser TTS policy tests; low-latency/perf tests if typing publication is affected; mobile E2E after movement | Start, pause, resume, stop, seek, finish, submit, and reset Browser TTS on desktop and mobile/PWA; verify German recovery-sensitive chunking | Revert the hook extraction as a single patch and restore the inline controls | defer | Raw ROI is very high, but as one patch this cluster is still too broad. It should be split after the sampler seam, with playback control tests added before moving the event loop. |
| `playTtsFromWord` playback loop | `src/App.tsx:1275-1749` | Future `src/app/useBrowserTtsPlaybackLoop.ts` or playback state-machine module | 350-430 fewer `App.tsx` lines if eventually moved | Preserve validation errors, voice/environment capture, semantic phrase indexing, German recovery-safe chunks, adaptive decisions, rate/floor/unsafe policies, benchmark events, utterance handlers, phrase advancement, and completion behavior | 90 | 98 | New mocked SpeechSynthesis loop tests, adaptive chunk characterization, `tests/ttsDynamicChunkPlanner.test.ts`, Browser TTS policy tests, and mobile smoke | Full playback through multiple chunks; replay from word; German recovery; unexpected utterance error; complete session transition | Revert playback-loop module and restore inline function | defer | It is high ROI but currently too coupled to refs, nested callbacks, browser events, adaptive benchmark writes, and phrase progression. Defer until `applyTtsPerformanceSample` and progress helpers reduce coupling and tests exist. |
| TTS progress helper seam | `src/App.tsx:1118-1151` | `src/app/ttsPlaybackProgress.ts` | 15-25 fewer `App.tsx` lines | Preserve elapsed-time calculation, chunk progress estimate, completed-source fallback, and source-word clamping | 58 | 42 | Add `tests/ttsPlaybackProgress.test.ts`; keep seek/playback smoke for any caller movement | Verify progress bar advances; seek to middle of text; pause/resume from estimated word | Revert helper import and inline both functions | defer | This is a clean smaller seam but lower payoff than the sampler. It can be bundled as preparation if the sampler extraction needs a pure progress utility. |

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

Next selected candidate: none yet. Run a fresh ROI scorecard before moving another Browser TTS runtime seam.

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
- `tests/useTtsPerformanceSampler.test.ts` covers Browser TTS performance sampling, no-start timestamp initialization, practice text override, German lag outlier fallback, explicit submit action telemetry, finalize timestamps, and returned metrics.
- `tests/sessionCreationWorkspaceState.test.ts` covers session-creation source/json/cancel transition actions and dictation-script validation reset behavior.
- `tests/sessionCreationActions.test.ts` covers the reusable session-creation form reset action for both expanded and collapsed Browser TTS setup states.
- `tests/browserTtsSetupCardProps.test.ts` covers Browser TTS setup-card prop object composition and memoization expectations.

## Suggested checkpoint command

For a local mirror, verify the checkpoint with:

~~~bash
git log --oneline --decorate -4
git show --stat --oneline HEAD
~~~

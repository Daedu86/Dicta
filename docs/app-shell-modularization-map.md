Repo-wide modularization ROI decisions now live in `docs/modularization-roi.md`. Use that document as the canonical scoring framework before applying any App Shell or non-App-Shell extraction.

# App shell modularization map

Updated: 2026-06-12 after active-session hydration extraction.

## Current baseline

This document began as a generated map. The historical deep inventory was intentionally retired after multiple completed extractions because stale line numbers and stale candidate rankings were starting to conflict with the current App shell state. Use this page as the active checkpoint and queue, and regenerate a fresh deep inventory before any non-trivial App shell extraction.

| Item | Value |
| --- | ---: |
| Branch | product/input-2 |
| Latest clean code baseline | b0cbc40 |
| Current `src/App.tsx` LOC | 2482 |
| Current `src/app/useWorkspaceModelRefreshRuntime.ts` LOC | 76 |
| Current `src/app/useBrowserTtsSetupCardProps.ts` LOC | 88 |
| Current `tests/workspaceModelRefreshRuntime.test.ts` LOC | 94 |
| App.tsx inline `useState` count | 16 |
| App.tsx inline `useRef` count | 27 |
| App.tsx inline `useMemo` count | 5 |
| App.tsx inline `useEffect` count | 7 |
| App.tsx inline function declarations inside `App()` | 20 |

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

## Current recommendation

- Start the next pass from the clean `b0cbc40` baseline before selecting another extraction.
- Treat the secondary-provider removal as the current provider cleanup baseline: the app should expose OpenRouter generation and Browser TTS training only.
- Treat the session-creation transition actions, session-creation form reset action, and Browser TTS setup-card props as completed low-risk extractions with focused tests.
- Continue conservative modularization only when the candidate removes at least ~15-25 net lines from `src/App.tsx` or creates a clearly testable state/derived-data/action boundary.
- Continue to defer active-session hydration, Browser TTS playback/runtime, `playTtsFromWord`, `resetSession`, phrase progression, TTS refs/timers/telemetry, and block-marker/regex moves.
- Prefer a fresh inventory before the next code extraction; do not continue extracting from `App.tsx` solely because the file is still large.
- Defer a `SessionDashboard` prop/adaptor extraction after inspection: `SessionDashboard` already renders inside `AppWorkspaceContent`, while `App.tsx` only derives `dashboardSession` and forwards a small prop set.

## Current high-risk anchors

These line numbers were observed at `b0cbc40`. Recheck with `rg` before editing; they are anchors for risk inspection, not stable APIs.

| Area | Current location |
| --- | --- |
| `resetSession` | `src/App.tsx:934` |
| `playTts` | `src/App.tsx:1376` |
| `playTtsFromWord` | `src/App.tsx:1381` |
| `BrowserTtsSetupCard` prop hook call | `src/App.tsx:2359` |
| `BrowserTtsSetupCard` render branch | `src/App.tsx:2450` |

## ROI-based modularization policy

The first modularization phase successfully removed large workspace/action/prop-composition clusters from `src/App.tsx`. The remaining work should not be driven by hook count alone. A proposed extraction should now pass a stricter decision gate.

| Criterion | Positive signal | Negative signal |
| --- | --- | --- |
| App-shell reduction | Removes at least ~15-25 net lines from `src/App.tsx` or collapses a dense state/effect cluster | Adds an import and wrapper for a short expression, string, or one-line callback |
| Ownership | Gives one module a coherent responsibility with explicit inputs/outputs | Splits a concept across App and a hook without reducing cognitive load |
| Testability | Makes a derived-state, state-transition, or policy boundary easier to test outside App | Moves JSX/props only and does not expose a useful seam |
| Runtime risk | Pure derivation, non-TTS UI state, isolated effect with clear dependencies, or action factory over existing setters | Touches playback loop, TTS refs/timers/telemetry, phrase progression, or `resetSession` |
| Change likelihood | Encapsulates logic likely to evolve independently | Extracts stable glue that rarely changes |

Do not evaluate ROI purely by new hook LOC. Some hooks increase total LOC but still improve ownership. However, a hook that neither reduces App complexity nor creates a useful seam should be rejected.

## Next ROI investigation

The next pass should inspect candidates before writing code. Do not assume another hook is worthwhile.

Preferred investigation order:

1. Characterization tests for `resetSession` reset-default calculation — next recommended work before moving high-risk state or playback-adjacent behavior.
2. Active-session hydration/persistence side-effect extraction — defer unless the remaining setter/ref boundary can be made explicit and test-first.
3. Remaining setup/session-creation UI glue — only if the candidate creates another testable seam beyond the completed transition/reset/setup-card actions.
4. Browser TTS runtime/playback — explicitly deferred until a dedicated design exists.
5. BrowserTtsSetupCard render cleanup — low ROI by itself after `useBrowserTtsSetupCardProps`; do not reopen unless it is part of a clearer setup-state boundary.

Recently added characterization coverage:

- `src/app/useWorkspaceRouting.ts` -> `tests/useWorkspaceRouting.test.ts`
- `src/app/useWorkspaceNavigationEffects.ts` -> `tests/useWorkspaceNavigationEffects.test.ts`
- `src/app/useSessionWorkspaceActions.ts` -> `tests/useSessionWorkspaceActions.test.ts`
- `src/app/sessionStorage.ts` -> `tests/sessionStorage.test.ts`

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
- `tests/sessionCreationWorkspaceState.test.ts` covers session-creation source/json/cancel transition actions and dictation-script validation reset behavior.
- `tests/sessionCreationActions.test.ts` covers the reusable session-creation form reset action for both expanded and collapsed Browser TTS setup states.
- `tests/browserTtsSetupCardProps.test.ts` covers Browser TTS setup-card prop object composition and memoization expectations.

## Suggested checkpoint command

This document-only checkpoint does not require runtime tests. For a local mirror, verify the commit with:

~~~bash
git log --oneline --decorate -4
git show --stat --oneline HEAD
~~~

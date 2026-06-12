Repo-wide modularization ROI decisions now live in `docs/modularization-roi.md`. Use that document as the canonical scoring framework before applying any App Shell or non-App-Shell extraction.

# App shell modularization map

Updated: 2026-06-12 after `useWorkspaceModelRefreshRuntime` extraction.

## Current baseline

This document began as a generated map. The historical deep inventory was intentionally retired after multiple completed extractions because stale line numbers and stale candidate rankings were starting to conflict with the current App shell state. Use this page as the active checkpoint and queue, and regenerate a fresh deep inventory before any non-trivial App shell extraction.

| Item | Value |
| --- | ---: |
| Branch | product/input-2 |
| Latest clean code baseline | 723d15f Extract workspace model refresh runtime |
| Current `src/App.tsx` LOC | 2597 |
| Current `src/app/useWorkspaceModelRefreshRuntime.ts` LOC | 89 |
| Current `tests/workspaceModelRefreshRuntime.test.ts` LOC | 68 |
| App.tsx inline `useState` count | 25 |
| App.tsx inline `useRef` count | 27 |
| App.tsx inline `useMemo` count | 8 |
| App.tsx inline `useEffect` count | 8 |
| App.tsx inline function declarations | 25 |

## Completed since the original map

- `useModelCatalogRuntime` owns OpenRouter/Ollama model catalog state and refresh actions.
- `useDictaLocalStorageImportRuntime` owns Dicta localStorage snapshot import restore actions.
- `useKeyboardRemapRuntime` owns active typing-language resolution and Spanish physical-key remapping.
- `useAdaptiveExportActions` owns adaptive benchmark/session-feedback copy, export, and insights diagnostic actions.
- `useSupabaseAuthActions` owns Supabase sign-in, password reset/update, auth view switching, and sign-out handlers.
- `useSessionCreationActions` owns plain-text session creation, DictationScript import validation/creation, and OpenRouter script session creation actions.
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
- `AppWorkspaceContent` owns the App workspace switch, pending-session lane placement, dashboard/adaptive/OpenRouter/Ollama/Admin/Leaderboard branch rendering, and workspace access fallbacks.
- `useWorkspaceModelRefreshRuntime` owns workspace model assignment/default resolution and delegates OpenRouter/Ollama refresh actions to `useModelRefreshActions`.
- `dictaLocalDevApiPlugin` owns the local Vite dev API routes, OpenRouter/Ollama proxy routes, OpenRouter local job queue, and admin file inventory route.
- `localDevEnvStore` owns local `.env.local` API key read, parse, upsert, and removal behavior for OpenRouter and Ollama.
- `localDevApiValidation` owns local OpenRouter/Ollama API key validation, model id normalization, prompt bounds, and max-token bounds.
- `localDevAdminFiles` owns local admin file inventory for fixtures and public assets.
- `localDevOpenRouterJobs` owns the local OpenRouter job store, active job counting, and queued/running/succeeded/failed transitions.
- `localDevOllamaHelpers` owns local Ollama upstream error formatting and model payload normalization.
- `localDevHttpHelpers` owns local dev HTTP errors, JSON/body parsing, local error responses, and API key suffix masking.
- `localDevOpenRouterClient` owns local OpenRouter chat-completion request construction and upstream fetch wiring.
- `localDevOllamaClient` owns local Ollama model/chat upstream fetch wiring and request payload construction.
- `useAuthWorkspaceProps` owns auth workspace prop composition for Supabase auth/profile/loading state, auth form state, messages, and auth callbacks.
- `useAppShellHeaderProps` owns App shell header prop composition, OpenRouter model labels, build labels, sync status labels, and header navigation/theme/sign-out callbacks.
- `useAppShellSyncStatusText` owns App shell sync/offline status label composition, pending-sync suffixes, and last-sync timestamp formatting glue.
- `useOllamaWorkspaceProps` owns Ollama workspace prop composition and Ollama default model persistence wiring.
- `useOpenRouterWorkspaceProps` owns OpenRouter workspace prop composition, model persistence wiring, export profile selection wiring, job notifications, and benchmark/session-feedback copy callbacks.
- `useAdaptiveDiagnosticsUiState` owns adaptive diagnostics UI state.
- `useAppPerfDiagnosticsRuntime` owns App render-count and perf diagnostics configuration; `App.tsx` still imports `perfDiagnostics` for active OpenRouter and TTS spans.
- `useAdaptiveStoragePersistenceEffects` owns adaptive benchmark/feedback local persistence and ref sync effects.
- `useDictaDebugExportEffect` owns the diagnostic `window.__DICTA_DEBUG_EXPORT__` registration and snapshot assembly.
- `useAdaptiveWorkspaceState` owns adaptive workspace debug, benchmark, feedback, focus, and message state.
- `useDictaSupabaseRuntime` owns Dicta sync config and Supabase client memoization.
- `useSessionCreationWorkspaceState` owns session creation/import form state and OpenRouter generation focus request state.
- `adaptiveExportPackages` owns pure adaptive export/package builders for session feedback, benchmark feedback, diagnostic reports, prompt packages, human-feedback payloads, and adaptive event counts.
- `openRouterDirectGenerationPresets` owns the direct OpenRouter generation preset catalog for easy, medium, hard, and express session variants.
- `openRouterDirectGenerationJobPlan` owns pure OpenRouter direct-generation planning: profile/feedback lookup, prompt construction, max-token sizing, request payload construction, and the `ActiveOpenRouterJob` draft without `jobId`.

## Current recommendation

- Start the next pass from the clean `723d15f` baseline before selecting another extraction.
- Treat `useWorkspaceModelRefreshRuntime` as the latest successful extraction: it moved assigned-model/default-model resolution and model refresh composition out of `src/App.tsx` while preserving OpenRouter/Ollama behavior.
- Continue conservative modularization only when the candidate removes at least ~15-25 net lines from `src/App.tsx` or creates a clearly testable state/derived-data boundary.
- Continue to defer active-session hydration, Browser TTS playback/runtime, `playTtsFromWord`, `resetSession`, phrase progression, TTS refs/timers/telemetry, and block-marker/regex moves.

## ROI-based modularization policy

The first modularization phase successfully removed large workspace/action/prop-composition clusters from `src/App.tsx`. The remaining work should not be driven by hook count alone. A proposed extraction should now pass a stricter decision gate.

| Criterion | Positive signal | Negative signal |
| --- | --- | --- |
| App-shell reduction | Removes at least ~15-25 net lines from `src/App.tsx` or collapses a dense state/effect cluster | Adds an import and wrapper for a short expression, string, or one-line callback |
| Ownership | Gives one module a coherent responsibility with explicit inputs/outputs | Splits a concept across App and a hook without reducing cognitive load |
| Testability | Makes a derived-state or policy boundary easier to test outside App | Moves JSX/props only and does not expose a useful seam |
| Runtime risk | Pure derivation, non-TTS UI state, or isolated effect with clear dependencies | Touches playback loop, TTS refs/timers/telemetry, phrase progression, or `resetSession` |
| Change likelihood | Encapsulates logic likely to evolve independently | Extracts stable glue that rarely changes |

Do not evaluate ROI purely by new hook LOC. Some hooks increase total LOC but still improve ownership. However, a hook that neither reduces App complexity nor creates a useful seam should be rejected.

## Next ROI investigation

The next pass should inspect candidates before writing code. Do not assume another hook is worthwhile.

Preferred investigation order:

1. Setup/session-creation UI state boundary — likely medium ROI if it can reduce App coordination without touching runtime playback.
2. BrowserTtsSetupCard prop boundary — possible ROI if the prop block is large enough, but avoid moving playback/runtime decisions.
3. SessionDashboard prop/adaptor boundary — possible ROI if it collapses formatting/adaptor glue.
4. Active-session hydration/persistence — high theoretical ROI, but defer because it touches many state resets and can affect TTS/session semantics.
5. Browser TTS runtime/playback — explicitly deferred until a dedicated design exists.

Use this pre-check before extracting:

~~~bash
git status --short
git log --oneline --decorate -8
grep -n "BrowserTtsSetupCard" -A80 -B20 src/App.tsx
grep -n "SessionDashboard" -A80 -B20 src/App.tsx
grep -n "SessionCreateCard" -A40 -B40 src/App.tsx
grep -n "useState" src/App.tsx
wc -l src/App.tsx
~~~

Proceed only if a candidate removes at least ~15-25 net lines from `src/App.tsx` or creates a clearly testable state/derived-data boundary.

## Current validation coverage

- `tests/workspaceModelRefreshRuntime.test.ts` covers assigned OpenRouter model/default model resolution for member, admin, no-auth, missing-profile, and blank-assignment scenarios.
- `tests/openRouterDirectGenerationJobPlan.test.ts` covers standard direct job request bodies for easy/medium/hard, express duration/max-token sizing, prompt/draft metadata, preserved labels, and no network side effects.
- `tests/openRouterDirectGenerationPresets.test.ts` covers the direct generation preset catalog ids, durations, intent/difficulty mappings, unique slot labels, non-empty display labels, and difficulty instructions.
- `tests/adaptiveExportPackages.test.ts` covers adaptive export package invariants for event counts, fallback session feedback payloads, and human-feedback prompt payloads.

## Suggested checkpoint command

This document-only checkpoint does not require runtime tests. For a local mirror, verify the commit with:

~~~bash
git log --oneline --decorate -4
git show --stat --oneline HEAD
~~~

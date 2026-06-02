# AdaptiveBenchmarkWorkspace Modularization Plan

`AdaptiveBenchmarkWorkspace` is the selected-profile cockpit inside the Adaptive Pace Layer workspace. It is browser UI for benchmark/profile display, export controls, latest session feedback, diagnostics, and recent timeline inspection.

The initial analysis was docs-only. Patch 1 prepared UI-only types/helpers, and Patch 2 extracted the adaptive benchmark workspace UI while keeping app-owned behavior in `src/App.tsx`.

_Initial plan created: 2026-06-02_

## Architecture Boundary

- Affected runtime boundary: browser UI only.
- Adaptive profiles affected: none behaviorally. The UI displays all `(inputMode, language)` profiles but must not change benchmark updates, scoring, recommendations, session feedback, or persistence.
- App ownership that must remain in `src/App.tsx`: workspace routing, selected profile state, benchmark/feedback storage, session state, active-session status, export/copy callbacks that need full session context, localStorage persistence, Supabase sync, and adaptive controller updates.
- Unaffected boundaries: core TypeScript adaptive domain, input adapters, Vercel/server routes, Supabase/RLS, auth/security, OpenRouter routes/jobs, Training UI, and Admin UI.

## Initial State

- `src/App.tsx` is about `12,102` lines.
- `AdaptiveBenchmarkWorkspace` starts around line `9,454`.
- The next function, `HelpIcon`, starts around line `10,332`.
- `AdaptiveBenchmarkWorkspace` itself is about `878` lines.
- The surrounding adaptive benchmark UI cluster is about `1,139` lines:
  - `AdaptiveAdapterCard`: about `30` lines.
  - `AdaptiveBenchmarkSection`: about `170` lines.
  - `AdaptiveProfileMatrix`: about `61` lines.
  - `AdaptiveBenchmarkWorkspace`: about `878` lines.

## Current Props And Callbacks

`AdaptiveBenchmarkSection` receives:

- `id`
- `adapters`
- `benchmarks`
- `expanded`
- `onToggleExpanded`
- `focusAnchor`
- `selectedInputMode`
- `selectedLanguage`
- `selectedProfile`
- `repeatWordStats`
- `onSelect`
- `benchmarkExportMessage`
- `sessionFeedback`
- `sessionFeedbackMessage`
- export/copy callbacks

`AdaptiveBenchmarkWorkspace` receives:

- `profile`
- `inputTitle`
- `focusAnchor`
- `repeatWordStats`
- `benchmarkExportMessage`
- `sessionFeedback`
- `sessionFeedbackMessage`
- `onCopyBenchmark`
- `onExportBenchmark`
- `onCopyScriptPrompt`
- `onCopyBenchmarkWithScriptPrompt`
- `onCopyScriptTemplate`
- `onCopySessionFeedback`
- `onCopyBenchmarkFeedback`
- `onCopyBenchmarkFeedbackPrompt`
- `onCopyBenchmarkFeedbackPromptWithHumanFeedback`

Sensitive callbacks that should remain owned by `App.tsx`:

- benchmark JSON copy/export
- dictation script prompt/template copy
- benchmark + feedback package copy
- benchmark + feedback + prompt copy
- benchmark + feedback + prompt + human feedback copy
- selected profile changes that reset global messages

These callbacks combine benchmark profiles, session feedback, active-session status, session history, clipboard writes, and app-level status messages. Moving them should be a separate behavior-aware refactor, not part of the first UI extraction.

## Internal Hooks And State

`AdaptiveBenchmarkSection` uses:

- `useState` for subsection expansion.
- `useEffect` to open the selected-profile cockpit for focused anchors.

`AdaptiveBenchmarkWorkspace` uses:

- `useState` for workspace subsection expansion, human feedback editor state, human feedback draft, export status message, and export panel open state.
- `useMemo` for export payload construction.
- `useEffect` for focus anchors and scrolling to export actions.

No adaptive controller hooks should move.

## Types

Currently local in `App.tsx`:

- `AdaptiveAdapterCardConfig`
- `RepeatWordStat`

Imported from existing modules:

- `InputLanguageBenchmarkMetrics`
- `AdaptiveSessionFeedback`
- `InputMode`
- `LanguageCode`
- `AdaptiveBenchmarksByInputLanguage`
- `BenchmarkLanguageButton`

Recommendation:

- Create a small `src/components/adaptive-workspace/types.ts` only if the extraction patch needs stable shared props.
- Keep `StoredSession` out of this UI module.
- Do not create a broad app session type just for this extraction.

## Helpers

UI-only helpers currently in `App.tsx` and used by this cluster:

- `benchmarkSubtitle`
- `formatBenchmarkLanguage`
- `formatScore`
- `formatSigned`
- `normalizeAccuracyForDisplay`
- `formatPercent`
- `getBenchmarkHealth`
- `formatWeakAreaLabel`

App-level or sensitive helpers that should remain in `App.tsx`:

- `buildAdaptiveAdapterCards`, unless moved with a focused type pass.
- `buildRepeatWordStats`
- `buildBenchmarkActivitySummary`
- `buildLatestFinishedSessionFeedbackReference`
- `findLatestFinishedSessionForProfile`
- `getBenchmarkActiveSessionStatus`
- export/copy callback implementations

Recommendation:

- Create `src/components/adaptive-workspace/adaptiveWorkspaceViewHelpers.ts` for UI-only formatting and profile-health helpers before moving the large component.
- Keep helpers that inspect full `sessions`, active session state, or sync/storage state in `App.tsx`.

## Component Dependencies

Already extracted:

```text
src/components/AdaptiveBenchmarkCharts.tsx
```

Used chart components:

- `SweetSpotGauge`
- `TargetZoneChart`
- `MiniTrends`
- `RateAccuracyStrip`
- `LagDistributionChart`

Shared App components used:

- `Metric`

Recommendation:

- Define a local `Metric` clone in the adaptive workspace module during extraction, matching existing markup and class names, instead of exporting `Metric` from `App.tsx`.
- Keep chart imports in the extracted adaptive workspace module.

## Risks

- Accidentally changing `(inputMode, language)` selection semantics in `AdaptiveProfileMatrix`.
- Changing focus-anchor behavior for `sessionFeedback` or `exports`.
- Changing export payload content, prompt size hints, disabled states, or clipboard/status messages.
- Moving session-history-dependent helpers out of `App.tsx` and expanding the prop/type surface too much.
- Changing Browser TTS DE diagnostics display or Kokoro blocked-language labels.
- Changing subsection default expansion, especially mobile default behavior.
- Creating a broad shared `StoredSession` dependency for a UI-only extraction.

## Recommended Extraction Order

1. Patch 1, preparation: complete.
   - Create `src/components/adaptive-workspace/types.ts` for narrow UI prop types if needed.
   - Create `src/components/adaptive-workspace/adaptiveWorkspaceViewHelpers.ts` for UI-only formatting/profile-health helpers.
   - Update `src/App.tsx` to import those helpers, without moving components yet.
   - Run `npm run test -- --reporter=verbose` and `npm run build`.

2. Patch 2, component extraction: complete.
   - Create `src/components/adaptive-workspace/AdaptiveBenchmarkWorkspace.tsx`.
   - Move `AdaptiveBenchmarkWorkspace`, `AdaptiveBenchmarkSection`, `AdaptiveProfileMatrix`, and `AdaptiveAdapterCard` together if the prop surface stays manageable.
   - Keep app-owned callbacks in `App.tsx`.
   - Keep selected profile state and message state in `App.tsx`.
   - Run `npm run test -- --reporter=verbose` and `npm run build`.

3. Patch 3, optional cleanup:
   - Split `AdaptiveBenchmarkWorkspace.tsx` into smaller cards only if the extracted file remains hard to work with.
   - Do not split static markup into microcomponents unless it reduces real complexity.

## Stop Conditions

- Extraction requires moving benchmark persistence, adaptive controller updates, or benchmark write paths.
- Extraction requires exporting `StoredSession` from `App.tsx`.
- Type pressure pushes the patch into session sync, localStorage, or Supabase code.
- Diff touches Training UI, OpenRouter UI, Admin UI, `api/*`, `src/core/adaptive/*`, input adapters, or auth/security.
- Tests show behavior changes in adaptive benchmark, feedback, prompt, or Browser TTS DE diagnostics.

## Validation

For any code extraction patch:

```bash
npm run test -- --reporter=verbose
npm run build
```

For this docs-only plan, no runtime validation is required beyond checking the working tree and diff scope.

## Recommendation

Use option B: prepare types and UI-only helpers first.

Moving the full workspace immediately is possible, but the current component mixes UI, local UI state, focus scrolling, export payload construction, and many app-owned callbacks. A small preparation patch reduces the risk of changing adaptive recommendations, session feedback exports, prompt packaging, focus anchors, and mobile expansion defaults.

## Next Patch Files

Patch 1 created:

```text
src/components/adaptive-workspace/types.ts
src/components/adaptive-workspace/adaptiveWorkspaceViewHelpers.ts
```

Moved from `App.tsx` in Patch 1:

- `AdaptiveAdapterCardConfig`
- `AdaptiveWorkspaceFocusAnchor`
- `RepeatWordStat`
- `benchmarkSubtitle`
- `formatBenchmarkLanguage`
- `formatScore`
- `formatSigned`
- `normalizeAccuracyForDisplay`
- `formatPercent`
- `getBenchmarkHealth`
- `formatWeakAreaLabel`

Validation for Patch 1:

```text
npm run test -- --reporter=verbose
npm run build
```

Result: both passed.

Impact:

- `src/App.tsx` after Patch 1: about `12,066` lines.
- Net `App.tsx` reduction from Patch 1: about `36` lines.

Expected files for the next code patch:

```text
src/components/adaptive-workspace/AdaptiveBenchmarkWorkspace.tsx
docs/adaptive-workspace-modularization.md
docs/app-modularization.md
```

Patch 2 created:

```text
src/components/adaptive-workspace/AdaptiveBenchmarkWorkspace.tsx
```

Moved from `App.tsx` in Patch 2:

- `AdaptiveAdapterCard`
- `AdaptiveBenchmarkSection`
- `AdaptiveProfileMatrix`
- `AdaptiveBenchmarkWorkspace`
- dashboard-local `Metric` clone used by the extracted adaptive workspace UI
- local `isMobileViewport` and input-mode mapping helpers needed by the extracted UI

Left in `App.tsx`:

- selected benchmark input/language state
- benchmark and feedback storage
- app-level export/copy callbacks
- session-history-dependent helpers
- active-session status resolution
- adaptive controller updates, benchmark write paths, localStorage, sync, and feedback generation

Validation for Patch 2:

```text
npm run test -- --reporter=verbose
npm run build
```

Result: both passed.

Impact:

- `src/App.tsx` after Patch 2: about `10,917` lines.
- Net `App.tsx` reduction from Patch 2: about `1,149` lines.

Expected commit message:

```text
Extract adaptive benchmark workspace
```

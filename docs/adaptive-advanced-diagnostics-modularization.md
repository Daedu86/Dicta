# AdaptiveAdvancedDiagnostics modularization plan

_Last updated: 2026-06-03_

## Status

Planning/evaluation only. No code has moved under this plan yet.

This plan covers the remaining inline `workspaceMode === 'adaptive'` advanced diagnostics shell that still lives in `src/App.tsx` after `AdaptiveBenchmarkWorkspace` and the main runtime/leaderboard extraction passes.

Current `src/App.tsx` size after the LeaderboardWorkspace pass:

```text
9,370 lines
```

## Proposed target

```text
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

## Why this candidate

The latest post-leaderboard measurement identified this as the largest cohesive remaining render block in `src/App.tsx`.

It is a better next major reduction candidate than more runtime micro-splitting because it is visually cohesive and already belongs to the adaptive workspace area.

## Current approximate range

```text
src/App.tsx:7290-7625
```

Actual lines may drift after edits. Re-measure immediately before implementation.

## Observed UI scope

The target block includes the advanced diagnostics `<details>` shell inside `workspaceMode === 'adaptive'`:

- details/summary wrapper for `Advanced diagnostics`;
- Central Brain panel;
- Architecture panel;
- Adapters panel;
- Most recent run panel;
- Latest pacing snapshot panel;
- Diagnostics/debug counters panel;
- semantic debug metric grid;
- rate distribution bars.

It does not include the already extracted `AdaptiveBenchmarkSection` below the diagnostics shell.

## Risk level

Risk: medium-high.

This block is not just static markup. It reads adaptive expanded-section state, selected benchmark state, latest session data, telemetry data, semantic debug counters, helper formatters, and performs scroll/focus behavior from adapter cards.

The extraction is acceptable only if it remains UI-only and App-owned state/behavior stays in `App.tsx`.

## Boundary

Move only the advanced diagnostics render shell to `AdaptiveAdvancedDiagnostics`.

Keep in `App.tsx`:

- `workspaceMode` routing;
- `adaptiveSectionExpanded` state;
- selected benchmark input/language/profile state;
- benchmark export/session feedback messages;
- adaptive benchmark data derivation;
- adaptive session feedback derivation;
- `latestSession` derivation;
- `latestInputAdapter` derivation;
- `latestAdaptiveMode` derivation;
- `adaptiveAdapters` construction;
- `adaptiveSemanticDebug` construction;
- all adaptive controller updates;
- all benchmark persistence/write paths;
- localStorage;
- sync;
- auth/profile/access state.

Pass explicit props/callbacks to the new component.

## Do not change

Do not change:

- adaptive pacing semantics;
- `(inputMode, language)` semantics;
- benchmark profile selection semantics;
- expanded/collapsed section behavior;
- scroll/focus behavior from adapter cards;
- metric labels or values;
- debug counter labels or formatting;
- rate distribution bar math;
- latest-session score/points/duration display;
- class names;
- visible copy;
- aria labels;
- titles/tooltips;
- App-owned benchmark/export callbacks;
- persistence/sync/localStorage.

## Expected prop groups

### State/data props

- `adaptiveSectionExpanded`
- `adaptiveAdapters`
- `latestSession`
- `latestInputAdapter`
- `latestAdaptiveMode`
- `selectedBenchmarkInputMode`
- `adaptiveSemanticDebug`

### Callback props

- `onToggleDecisionArchitectureSections`
- `onToggleAdaptersSection`
- `onToggleLatestLiveSections`
- `onToggleTelemetrySection`
- `onSelectBenchmarkInputMode`
- `onResetBenchmarkExportMessage`
- `onResetSessionFeedbackMessage`
- `onScrollToAdaptiveBenchmarks`

The implementation may keep callback names different, but the behavior must stay in `App.tsx`.

### Formatter/helper props

- `mapSessionInputMode`
- `formatSessionInputMode`
- `formatSessionPlaybackDuration`
- `buildSessionScoreHelpText`
- `formatSessionPointsForSession`
- `formatAdaptiveModeFromSession`
- `countTelemetrySamples`
- `MetricComponent`
- `AdaptiveAdapterCardComponent` if `AdaptiveAdapterCard` stays in an extracted module and is importable, prefer importing it rather than passing it.

## Type guidance

Prefer existing adaptive workspace types where possible:

```text
src/components/adaptive-workspace/types.ts
```

Do not export broad App-local session types from `App.tsx` just for this extraction.

If needed, define narrow structural prop types in `AdaptiveAdvancedDiagnostics.tsx` based only on fields rendered by this component.

## Recommended extraction strategy

### Step 1: single-component extraction

Create:

```text
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

Move only the advanced diagnostics `<details>` shell.

Do not move `AdaptiveBenchmarkSection`.

Do not move data derivation, state ownership, benchmark export logic, persistence, or sync.

### Step 2: optional cleanup later

Only after the first extraction is stable, consider child components such as:

```text
src/components/adaptive-workspace/AdaptiveDecisionPanel.tsx
src/components/adaptive-workspace/AdaptiveDiagnosticsTelemetryPanel.tsx
```

Do not create these in the first patch.

## Implementation checklist for Codex

1. Pull latest `main`.
2. Re-read this plan, `docs/adaptive-workspace-modularization.md`, and `docs/app-modularization.md`.
3. Locate the current advanced diagnostics `<details className="adaptive-advanced-shell">` block inside `workspaceMode === 'adaptive'`.
4. Create `src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx`.
5. Move only that `<details>` block into the new component.
6. Keep `AdaptiveBenchmarkSection` exactly where it is in `App.tsx`.
7. Keep all state/data derivation and side effects in `App.tsx`.
8. Pass explicit props/callbacks.
9. Preserve class names, copy, aria labels, titles, button order, and render order.
10. Update docs after extraction.
11. Run tests/build.

## Validation

For any code patch:

```bash
npm run test -- --reporter=verbose
npm run build
wc -l src/App.tsx
git diff --stat
git status --short
```

## Stop conditions

Stop and do not extract if:

- the prop surface becomes broader than the evaluated groups above;
- TypeScript requires exporting broad App-local session types;
- the patch moves adaptive controller updates;
- the patch moves benchmark persistence/write paths;
- the patch moves localStorage, sync, or auth/profile state;
- the patch touches Browser TTS, Kokoro, Input #4, OpenRouter, Admin, Leaderboard, or API routes;
- tests/build failures require behavior changes.

## Recommendation

Proceed only with a single-component extraction:

```text
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

Keep the first patch UI-only. Do not split child diagnostics panels yet.

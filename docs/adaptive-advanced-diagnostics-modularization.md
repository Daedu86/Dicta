# AdaptiveAdvancedDiagnostics Modularization Plan

Historical note: the `AdaptiveAdvancedDiagnostics` runtime card was removed from the Adaptive Pace Layer workspace on 2026-06-19. This document is retained only as the older extraction checkpoint.

`AdaptiveAdvancedDiagnostics` was the advanced diagnostics shell inside the adaptive workspace. It was browser UI for the central brain summary, architecture flow, adapter execution cards, latest run summary, latest pacing snapshot, and debug counters.

The extraction was kept UI-only. `App.tsx` still owns adaptive controller state, benchmark/profile state, adapter-open behavior, benchmark persistence, sync, and the `AdaptiveBenchmarkSection` that remains immediately after this component.

## Initial State

- `src/App.tsx` was about `9,370` lines before this extraction.
- The adaptive advanced diagnostics shell started around line `7,312`.
- `AdaptiveBenchmarkSection` started immediately after it and stayed in `App.tsx`.

## Completed Extraction File

```text
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

## Moved With This Pass

- `AdaptiveAdvancedDiagnostics`
- advanced diagnostics shell markup
- central brain summary
- architecture summary
- adapter execution cards
- most recent run summary
- latest pacing snapshot
- debug counters

## Preserved Behavior

- `AdaptiveBenchmarkSection` stayed in `App.tsx` immediately after the extracted component.
- adaptive controller logic stayed in `App.tsx`.
- benchmark persistence/write paths stayed in `App.tsx`.
- selected benchmark state stayed in `App.tsx`.
- localStorage, sync, and session-feedback state stayed in `App.tsx`.
- adapter selection still routes through the app-owned callback.

## Impact

- `src/App.tsx` after this pass: `9,099` lines.
- Net `App.tsx` reduction from this extraction: `271` lines.

## Stop Condition

- Do not split `AdaptiveBenchmarkSection` yet.
- Do not introduce child microcomponents unless a concrete maintainability issue appears.

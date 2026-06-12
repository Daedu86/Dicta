# React Hooks lint policy

This document explains why Dicta currently keeps a small set of `eslint-plugin-react-hooks` rules disabled and how to compensate for that risk during development.

Last verified: 2026-06-12, baseline `ad0db7e Add test coverage script`.

## Current configuration

`eslint.config.js` extends the recommended React Hooks rules, then disables these checks for TypeScript and TSX files:

| Rule | Status | Reason |
| --- | --- | --- |
| `react-hooks/exhaustive-deps` | Off | The app shell still contains runtime effects that intentionally coordinate refs, timers, browser APIs, persistence, and async job refreshes. Turning this on globally would produce noisy changes before those boundaries are fully extracted. |
| `react-hooks/immutability` | Off | Some runtime state is coordinated through ref-backed and browser-backed objects where strict lint enforcement would require wider behavioral refactors. |
| `react-hooks/preserve-manual-memoization` | Off | Several memoization boundaries are manual performance controls around low-latency typing, setup UI, and runtime props. These should be reviewed case-by-case rather than rewritten mechanically. |
| `react-hooks/purity` | Off | The composition root still bridges imperative browser/runtime APIs. Enabling purity globally should wait until those bridges are smaller and better isolated. |
| `react-hooks/refs` | Off | Browser TTS, playback, timers, and latency-sensitive input behavior depend on refs. Ref usage is allowed but must stay localized and tested. |
| `react-hooks/set-state-in-effect` | Off | Some hydration, sync, and runtime refresh flows intentionally set state from effects. These should be extracted and tested before enforcing the rule globally. |

## Policy

These disabled rules are not a license to add unstructured hook logic.

When editing hook-heavy code:

1. Prefer extracting pure functions or small hooks with explicit inputs/outputs.
2. Avoid broad dependency-array rewrites unless the touched behavior is covered by focused tests.
3. Do not move Browser TTS playback, phrase progression, timer, or telemetry logic as part of unrelated cleanups.
4. Treat `src/App.tsx` as a composition shell: new runtime behavior should live in smaller modules where possible.
5. Keep ref-backed state localized and document any non-obvious invariant near the code.
6. Run the narrowest relevant test from `docs/module-test-map.md` before the broader validation commands.

## Compensating validation

Use the module map to choose focused tests before larger checks:

| Touched area | Minimum validation |
| --- | --- |
| App shell composition or workspace model refresh | `tests/workspaceModelRefreshRuntime.test.ts` plus any touched boundary tests |
| Browser TTS runtime or voice policy | `tests/useBrowserTtsRuntime.test.ts` and the relevant `browserTts*` tests |
| Low-latency typing | `tests/LowLatencyTextareaContract.test.ts`, `tests/lowLatencyTextarea.test.ts`, `tests/lowLatencyPerformanceGate.test.ts` |
| Session persistence/sync | `tests/useSessionPersistenceSync.test.ts` |
| OpenRouter runtime/jobs | `tests/useOpenRouterJobsRuntime.test.ts`, `tests/openRouterJobs.test.ts`, route-specific tests when API behavior changes |

For broad or risky changes, also run:

```bash
npm run lint
npm test
npm run build
```

Use `npm run test:coverage` when deciding whether a newly extracted hook or helper has enough focused protection.

## Criteria for re-enabling rules

Re-enable disabled rules gradually, not as a single global cleanup.

A rule is a good candidate for re-enabling when:

- the affected runtime boundary has focused tests;
- enabling the rule produces a small, reviewable diff;
- fixes do not alter Browser TTS playback semantics, low-latency typing behavior, session persistence, or OpenRouter job refresh behavior;
- the change can be validated with the relevant tests from `docs/module-test-map.md`.

Preferred sequence:

1. Try enabling a rule for a narrow file or directory after extraction.
2. Fix only the warnings in that scoped area.
3. Add or update focused tests if the fix changes observable behavior.
4. Broaden enforcement only after the scoped change stays stable.

## Review checklist

Before merging hook-related changes, confirm:

- no unrelated Browser TTS playback/runtime changes were bundled in;
- dependency arrays were changed intentionally, not mechanically;
- ref mutations still have a clear owner and lifecycle;
- effect-driven state updates cannot loop under auth/profile/workspace changes;
- focused tests were run for the touched boundary;
- broad checks passed when the change was not purely documentary.

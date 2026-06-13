# High-Risk Runtime Boundaries

This document centralizes Dicta runtime areas that agents must treat as high-risk.

These boundaries can break real user behavior even when a refactor looks mechanically clean. Do not touch them casually.

## Core rule

Before changing a high-risk runtime area:

1. Inspect the current source files.
2. Inspect the focused tests listed in `docs/module-test-map.md`.
3. Identify the smallest safe boundary.
4. Avoid mixing refactor and behavior changes.
5. Run narrow validation first.
6. Check the staged diff carefully before committing.

If the change requires modifying timing, lifecycle, persistence, playback, auth, or mobile behavior, assume it needs extra scrutiny.

## Browser TTS runtime

High-risk areas:

- `src/app/useBrowserTtsRuntime.ts`
- `src/app/useTtsTelemetryRecorder.ts`
- `src/app/useTtsUiPublisher.ts`
- `src/app/useTtsPlaybackProgressEstimator.ts`
- `src/app/browserTtsPlaybackPlan.ts`
- `src/inputs/browserTts/`
- Browser speech synthesis behavior.
- Voice discovery and normalization.
- Recovery policy.
- Rate policy.
- Unsafe voice policy.
- Dynamic chunk planning.
- Telemetry adapter behavior.

Current App shell anchors in the post-playback-plan working tree:

- `resetSession`: `src/App.tsx:920`
- `useTtsTelemetryRecorder` hook call: `src/App.tsx:1104`
- `useTtsPlaybackProgressEstimator` hook call: `src/App.tsx:1110`
- `useTtsUiPublisher` hook call: `src/App.tsx:1121`
- `useTtsPerformanceSampler` hook call: `src/App.tsx:1140`
- `playTts`: `src/App.tsx:1213`
- `playTtsFromWord`: `src/App.tsx:1218`
- `useTtsPlaybackControls` hook call: `src/App.tsx:1562`
- `BrowserTtsSetupCard` render branch: `src/App.tsx:2089`

Recheck these anchors with `rg` before editing; line numbers are observational and will drift.

Primary tests:

- `tests/useBrowserTtsRuntime.test.ts`
- `tests/useTtsTelemetryRecorder.test.ts`
- `tests/useTtsUiPublisher.test.ts`
- `tests/useTtsPlaybackProgressEstimator.test.ts`
- `tests/browserTtsPlaybackPlan.test.ts`
- `tests/browserTtsAdaptiveProfiles.test.ts`
- `tests/browserTtsRatePolicy.test.ts`
- `tests/browserTtsRecoveryPolicy.test.ts`
- `tests/browserTtsUnsafePolicy.test.ts`
- `tests/browserTtsVoices.test.ts`
- `tests/ttsDynamicChunkPlanner.test.ts`

Rules:

1. Do not change playback behavior as part of unrelated modularization.
2. Do not alter browser capability assumptions without tests.
3. Do not rewrite recovery/rate policy casually.
4. Keep policy changes separated from UI refactors.
5. Prefer pure policy tests before runtime integration changes.

## Phrase progression

High-risk areas:

- Session phrase ordering.
- Current phrase advancement.
- Repeat-word progression.
- Macro phrase offset behavior.
- Browser TTS chunk completion.

Rules:

1. Do not change phrase ordering as part of unrelated modularization.
2. Keep DictationScript phrase behavior and plain-text semantic phrase behavior distinct.
3. Add focused tests before changing repeat or macro phrase progression.
4. If a refactor touches chunk completion, replay, or seek behavior, validate phrase advancement and completed-word state together.

Primary tests:

- `tests/semanticPhrasePlanner.test.ts`
- `tests/browserTtsPlaybackPlan.test.ts`
- `tests/browserTtsPlaybackStartPlan.test.ts`
- `tests/browserTtsChunkCompletion.test.ts`
- `tests/useTtsPlaybackControls.test.ts`

## Session lifecycle and reset

High-risk areas:

- `resetSession` side-effect body.
- `src/app/resetSessionState.ts`.
- Session completion and submit transitions.
- Session storage and active-session hydration.
- Playback stop ordering during reset.

Rules:

1. Do not change reset semantics while moving unrelated runtime code.
2. Preserve finished-session reset allowance and setup-lock behavior.
3. Preserve `stopTtsPlayback` ordering before clearing TTS refs or UI metrics.
4. Add characterization before extracting side-effect sequencing.

Primary tests:

- `tests/resetSessionState.test.ts`
- `tests/useTrainingSessionLifecycle.test.ts`
- `tests/sessionStorage.test.ts`
- `tests/activeSessionHydration.test.ts`

## Persistence, sync, and auth

High-risk areas:

- Supabase auth and profile scoping.
- RLS-sensitive sync behavior.
- Local/session storage migration.
- Pending sync and offline status.
- OpenRouter model assignment persistence.

Rules:

1. Do not mix auth, sync, and UI-only refactors.
2. Do not weaken profile/workspace scoping.
3. Keep service-role assumptions isolated to server/local-dev boundaries.
4. Run focused persistence/sync tests before broad validation.

Primary tests:

- `tests/useSessionPersistenceSync.test.ts`
- `tests/sessionStorage.test.ts`
- `tests/activeSessionHydration.test.ts`
- `tests/workspaceModelRefreshRuntime.test.ts`
- Supabase/auth-specific tests listed in `docs/module-test-map.md`.

## OpenRouter generation and local dev API

High-risk areas:

- OpenRouter request planning.
- Job queue transitions.
- Local dev API routes.
- API key validation and masking.
- Direct-generation action handlers.

Rules:

1. Keep request planning separate from UI state refactors.
2. Do not change prompt bounds, max-token bounds, or model normalization without tests.
3. Do not weaken API key masking or validation.
4. Keep job-store transitions deterministic and covered.

Primary tests:

- `tests/openRouterDirectGenerationJobPlan.test.ts`
- `tests/openRouterDirectGenerationPresets.test.ts`
- `tests/useOpenRouterJobsRuntime.test.ts`
- Local dev API tests listed in `docs/module-test-map.md`.

## Low-latency typing and performance

High-risk areas:

- `LowLatencyTextarea`.
- Live input telemetry.
- Browser TTS live metric publishing.
- Android/PWA performance behavior.
- Render-count diagnostics.

Rules:

1. Do not replace low-latency typing paths casually.
2. Do not add per-keystroke state churn without a performance reason.
3. Run focused performance tests before broad UI changes.
4. Smoke test Android/PWA when layout, input, or live metrics change.

Primary tests:

- `tests/LowLatencyTextareaContract.test.ts`
- `tests/lowLatencyTextarea.test.ts`
- `tests/lowLatencyPerformanceGate.test.ts`
- `tests/perfDiagnostics.test.ts`
- `tests/useTtsUiPublisher.test.ts`

## CSS cascade and mobile layout

High-risk areas:

- Global CSS imports.
- Broad selectors.
- Mobile/PWA layout rules.
- Component-level style changes that depend on cascade order.

Rules:

1. Do not reorder CSS imports casually.
2. Avoid broad selectors when changing local component behavior.
3. Check mobile impact for layout changes.
4. Keep style-only changes separate from runtime changes.
5. Prefer small, targeted CSS diffs.

## Documentation-only safety

Documentation can still create risk if it becomes misleading.

Rules:

1. Do not promote historical checkpoint docs to current truth without verification.
2. Keep `docs/README.md` and `docs/documentation-inventory.md` aligned.
3. Update `docs/module-test-map.md` when test relationships change.
4. Repair broken references in dedicated commits.
5. Do not delete historical docs only because they are old.
6. Mark candidate rankings, line numbers, LOC counts, and "next recommended pass" text as historical when the document's verified commit does not match current `HEAD`.

## AI-assisted refactor risk

AI-assisted refactors can produce plausible, large mechanical changes faster than they can be reviewed. Treat AI-assisted modularization as higher-risk when it touches runtime, persistence, auth, mobile/PWA, or CSS cascade behavior.

Rules:

1. Keep AI-assisted refactors small, reversible, and behavior-preserving.
2. Reject or split patches that pass broad opaque App state objects into new hooks.
3. Reject or split patches that mix behavior changes with code movement.
4. Require focused tests before broad validation.
5. Require explicit stop conditions for Browser TTS, reset, phrase progression, Supabase, OpenRouter, PWA/mobile, and CSS cascade changes.
6. Prefer characterization-only first patches when the runtime behavior is not already covered.

## Escalation rule

If a requested change touches more than one high-risk boundary, split the work.

Prefer multiple small commits over a broad mixed change.

## Modularization ROI override

A high modularization score in `docs/modularization-roi.md` does not remove the need for validation. It also does not mean the candidate should be avoided by default. If a candidate touches Browser TTS playback/runtime, phrase progression, `playTtsFromWord`, `resetSession`, refs, timers, telemetry, Supabase, OpenRouter jobs, PWA/mobile performance, CSS cascade behavior, or an AI-assisted runtime extraction, convert that risk into focused tests, a bounded slice, manual smoke checks where needed, and a clear rollback plan before moving code.

# High-Risk Runtime Boundaries

This document centralizes Dicta runtime areas that agents must treat as high-risk.

These boundaries can break real user behavior even when a refactor looks mechanically clean. Do not touch them casually.

Last updated: 2026-06-14
Verified against branch: `product/input-2`
Verified against code baseline: post `Extract Browser TTS playback loop` push; `src/App.tsx` blob `09f94a6d52841c04ab13fe6790800a8dd839f11d`; `src/app/useBrowserTtsPlaybackLoop.ts` blob `b5156b5e9dfcfa80639506c7079847387b7d3476`

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
- `src/app/useBrowserTtsPlaybackLoop.ts`
- `src/app/useTtsSessionSubmitAction.ts`
- `src/app/useTtsPlaybackControls.ts`
- `src/app/useTtsTelemetryRecorder.ts`
- `src/app/useTtsUiPublisher.ts`
- `src/app/useTtsPlaybackProgressEstimator.ts`
- `src/app/useTtsPerformanceSampler.ts`
- `src/app/browserTtsPlaybackPlan.ts`
- `src/app/browserTtsPlaybackStartPlan.ts`
- `src/app/browserTtsAdaptiveSemanticDebug.ts`
- `src/app/browserTtsPhraseCompletionTelemetry.ts`
- `src/app/browserTtsChunkCompletion.ts`
- `src/app/browserTtsNextChunkScheduler.ts`
- `src/app/browserTtsUnexpectedErrorPlan.ts`
- `src/app/browserTtsUtteranceConfiguration.ts`
- `src/app/browserTtsUtterancePerfMetadata.ts`
- `src/app/ttsSessionFinalization.ts`
- `src/inputs/browserTts/`
- Browser speech synthesis behavior.
- Voice discovery and normalization.
- Recovery policy.
- Rate policy.
- Unsafe voice policy.
- Dynamic chunk planning.
- Telemetry adapter behavior.

Current App shell anchors after Browser TTS playback-loop extraction:

- `resetSession`: `src/App.tsx`
- `useTtsTelemetryRecorder` hook call: `src/App.tsx`
- `useTtsPlaybackProgressEstimator` hook call: `src/App.tsx`
- `useTtsUiPublisher` hook call: `src/App.tsx`
- `useTtsPerformanceSampler` hook call: `src/App.tsx`
- `useTtsSessionSubmitAction` hook call: `src/App.tsx`
- `useBrowserTtsPlaybackLoop` hook call: `src/App.tsx`
- `playTts` / `playTtsFromWord`: `src/app/useBrowserTtsPlaybackLoop.ts`
- `useTtsPlaybackControls` hook call: `src/App.tsx`
- `BrowserTtsSetupCard` render branch: `src/App.tsx`

Recheck these anchors with `git grep` or `rg` before editing; line numbers are observational and will drift.

Primary tests:

- `tests/useBrowserTtsRuntime.test.ts`
- `tests/useTtsSessionSubmitAction.test.ts`
- `tests/useTtsTelemetryRecorder.test.ts`
- `tests/useTtsUiPublisher.test.ts`
- `tests/useTtsPlaybackProgressEstimator.test.ts`
- `tests/useTtsPerformanceSampler.test.ts`
- `tests/useTtsPlaybackControls.test.ts`
- `tests/browserTtsPlaybackLoopContract.test.ts`
- `tests/browserTtsUtteranceConfigurationContract.test.ts`
- `tests/mockSpeechSynthesisHarness.test.ts`
- `tests/browserTtsPlaybackPlan.test.ts`
- `tests/browserTtsPlaybackStartPlan.test.ts`
- `tests/browserTtsAdaptiveSemanticDebug.test.ts`
- `tests/browserTtsPhraseCompletionTelemetry.test.ts`
- `tests/browserTtsChunkCompletion.test.ts`
- `tests/browserTtsNextChunkScheduler.test.ts`
- `tests/browserTtsUnexpectedErrorPlan.test.ts`
- `tests/ttsSessionFinalization.test.ts`
- `tests/browserTtsAdaptiveProfiles.test.ts`
- `tests/browserTtsRatePolicy.test.ts`
- `tests/browserTtsRecoveryPolicy.test.ts`
- `tests/browserTtsUnsafePolicy.test.ts`
- `tests/browserTtsVoices.test.ts`
- `tests/ttsDynamicChunkPlanner.test.ts`

Rules:

1. Do not change playback behavior as part of unrelated modularization.
2. Treat `src/app/useBrowserTtsPlaybackLoop.ts` as the Browser TTS playback-loop owner. Do not assume `src/App.tsx` still owns `playTtsFromWord`.
3. Do not alter browser capability assumptions without tests.
4. Do not rewrite recovery/rate policy casually.
5. Keep policy changes separated from UI refactors.
6. Prefer pure policy tests before runtime integration changes.
7. For playback-loop changes, run the loop contract and utterance configuration contract tests before broad suite validation.

## Phrase progression

High-risk areas:

- Session phrase ordering.
- Current phrase advancement.
- Repeat-word progression.
- Macro phrase offset behavior.
- Browser TTS chunk completion.
- Browser TTS playback-loop phrase progression in `src/app/useBrowserTtsPlaybackLoop.ts`.

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
- `tests/browserTtsPlaybackLoopContract.test.ts`
- `tests/useTtsPlaybackControls.test.ts`

## Session lifecycle and reset

High-risk areas:

- `resetSession` side-effect body.
- `src/app/resetSessionState.ts`.
- `src/app/useActiveSessionStateSync.ts`.
- `src/app/useTtsSessionSubmitAction.ts`.
- `src/app/ttsSessionFinalization.ts`.
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
- `tests/useActiveSessionStateSync.test.ts`
- `tests/activeSessionHydration.test.ts`
- `tests/useTtsSessionSubmitAction.test.ts`
- `tests/ttsSessionFinalization.test.ts`
- `tests/useTrainingSessionLifecycle.test.ts`
- `tests/sessionStorage.test.ts`
- `tests/sessionStatusNormalization.test.ts`

## Persistence, sync, and auth

High-risk areas:

- Supabase auth and profile scoping.
- RLS-sensitive sync behavior.
- Local/session storage migration.
- Pending sync and offline status.
- Active-session live persistence sync.

Rules:

1. Do not change auth or sync behavior as part of unrelated UI cleanup.
2. Run the narrow persistence/auth tests before broad suite validation.
3. Preserve profile-scoped storage and pending-sync semantics.

Primary tests:

- `tests/useSessionPersistenceSync.test.ts`
- `tests/supabaseSync.test.ts`
- `tests/profileScopedStorage.test.ts`
- `tests/appProfiles.test.ts`
- `tests/supabaseProfileRoute.test.ts`
- `tests/useActiveSessionStateSync.test.ts`

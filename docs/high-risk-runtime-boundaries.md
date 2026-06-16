# High-Risk Runtime Boundaries

This document centralizes Dicta runtime areas that agents must treat as high-risk.

These boundaries can break real user behavior even when a refactor looks mechanically clean. Do not touch them casually.

Last updated: 2026-06-16
Verified against branch: `product/input-2`
Verified against code baseline: runtime root boundary refresh. `src/App.tsx` is shell-only, `src/app/DictaAppRuntime.tsx` is an export shim, and main runtime orchestration lives in `src/app/DictaAppRuntimeRoot.tsx`.

## Core rule

Before changing a high-risk runtime area:

1. Inspect the current source files.
2. Inspect the focused tests listed in `docs/module-test-map.md`.
3. Identify the smallest safe boundary.
4. Avoid mixing refactor and behavior changes.
5. Run narrow validation first.
6. Check the staged diff carefully before committing.

If the change requires modifying timing, lifecycle, persistence, playback, auth, or mobile behavior, assume it needs extra scrutiny.

## Current shell ownership

- `src/App.tsx` is shell-only and should remain small.
- `src/app/DictaAppRuntime.tsx` only re-exports `DictaAppRuntime` from `DictaAppRuntimeRoot`.
- `src/app/DictaAppRuntimeRoot.tsx` is the browser composition root for auth/profile, sync, workspace routing, OpenRouter wiring, focused training, presentation props, and route rendering.
- `src/app/useDictaAppBootRuntime.ts` owns root boot state buckets and refs.
- `src/app/useDictaRootOpenRouterRuntime.ts` owns root-level OpenRouter adaptation before delegating to `useDictaOpenRouterRuntime`.
- `src/app/useDictaRootRouteCompositionRuntime.ts` owns root-level route-composition handoff before delegating to `useDictaAppRouteCompositionRuntime`.
- `src/app/AppRouteRenderer.tsx` owns route-level render branching.
- Focused training, Browser TTS, active-session, OpenRouter, and route-composition boundary tests should inspect `DictaAppRuntimeRoot` and owner hooks, not `src/App.tsx`.
- Do not move runtime behavior back into `src/App.tsx` or the `DictaAppRuntime.tsx` export shim.

## Browser TTS runtime

High-risk areas:

- `src/app/useBrowserTtsRuntime.ts`
- `src/app/useFocusedTrainingRuntime.ts`
- `src/app/useTtsSessionOrchestrationRuntime.ts`
- `src/app/useBrowserTtsPlaybackLoop.ts`
- `src/app/useTtsSessionSubmitAction.ts`
- `src/app/useTtsPlaybackControls.ts`
- `src/app/useTtsPlaybackMetricsRuntime.ts`
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

Current runtime anchors:

- App shell entrypoint: `src/App.tsx` renders `DictaAppRuntime` only.
- Runtime export shim: `src/app/DictaAppRuntime.tsx` re-exports `DictaAppRuntimeRoot` only.
- Runtime composition root: `src/app/DictaAppRuntimeRoot.tsx` wires Browser TTS state, refs, runtime hooks, and presentation props.
- Focused training composition: `src/app/useFocusedTrainingRuntime.ts` via `useDictaRootFocusedTrainingRuntime`.
- TTS session orchestration: `src/app/useTtsSessionOrchestrationRuntime.ts`.
- Browser TTS playback loop: `src/app/useBrowserTtsPlaybackLoop.ts`.
- Browser TTS playback controls: `src/app/useTtsPlaybackControls.ts`.
- Browser TTS metrics composition: `src/app/useTtsPlaybackMetricsRuntime.ts` plus telemetry, UI publisher, progress estimator, and sampler hooks.
- Reset-session side effects: `src/app/useResetSessionRuntime.ts`.
- Submit-session side effects: `src/app/useTtsSessionSubmitAction.ts`.
- Browser TTS setup card props: `src/app/useBrowserTtsSetupCardProps.ts`.

Recheck these anchors with `rg` before editing. Line numbers and call graphs are observational and will drift.

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
2. Treat `src/app/useBrowserTtsPlaybackLoop.ts` as the Browser TTS playback-loop owner. Do not assume `src/App.tsx`, `DictaAppRuntime`, or `DictaAppRuntimeRoot` owns playback-loop internals.
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

- `src/app/useResetSessionRuntime.ts` side-effect sequencing.
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
- `tests/useResetSessionRuntime.test.ts`
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
- Supabase Auth redirect and password recovery behavior.
- RLS-sensitive sync behavior.
- Local/session storage migration.
- Pending sync and offline status.
- Active-session live persistence sync.
- PWA/mobile profile loading and post-submit sync behavior.

Rules:

1. Do not change auth or sync behavior as part of unrelated UI cleanup.
2. Run the narrow persistence/auth tests before broad suite validation.
3. Preserve profile-scoped storage and pending-sync semantics.
4. Preserve the removed legacy app-gate invariant: hosted/PWA access must go through Supabase Auth + RLS, not a single-password gate.

Primary tests:

- `tests/legacyAuthGateRemoval.test.ts`
- `tests/useSessionPersistenceSync.test.ts`
- `tests/supabaseSync.test.ts`
- `tests/profileScopedStorage.test.ts`
- `tests/appProfiles.test.ts`
- `tests/supabaseProfileRoute.test.ts`
- `tests/useActiveSessionStateSync.test.ts`

## OpenRouter runtime

High-risk areas:

- `src/app/useDictaRootOpenRouterRuntime.ts`.
- `src/app/useDictaOpenRouterRuntime.ts`.
- `src/app/useOpenRouterGenerationRuntime.ts`.
- `src/app/useOpenRouterGenerationActions.ts`.
- `src/app/useOpenRouterDirectGenerationRuntime.ts`.
- `src/app/useOpenRouterJobsRuntime.ts`.
- `src/app/useOpenRouterJobPollingRuntime.ts`.
- `src/app/openRouterGenerationFailurePolicy.ts`.
- `src/app/useOpenRouterModelRuntime.ts`.
- `src/app/useWorkspaceModelRefreshRuntime.ts`.
- `api/openrouter/*`.
- Access checks, quotas, assigned model enforcement, job limits, rate limits, and failure-session creation.

Rules:

1. Treat OpenRouter as structured training-material generation only. It is not a playback engine.
2. Keep server-only secrets out of Vite/client code.
3. Do not mix model/access/quotas changes with unrelated UI or App-shell cleanup.
4. Preserve member defaults: no OpenRouter access unless granted, session limits enforced, and assigned models enforced server-side.
5. For job polling or failure-policy changes, validate both transient notice behavior and persistent error-session behavior.
6. For root OpenRouter wiring changes, validate the root OpenRouter boundary before broader OpenRouter tests.

Primary tests:

- `tests/dictaAppRuntimeRootOpenRouterBoundary.test.ts`
- `tests/dictaOpenRouterRuntimeBoundary.test.ts`
- `tests/openRouterChatRoute.test.ts`
- `tests/openRouterJobRoute.test.ts`
- `tests/openRouterJobs.test.ts`
- `tests/useOpenRouterJobsRuntime.test.ts`
- `tests/openRouterGenerationJobRequest.test.ts`
- `tests/openRouterDirectGenerationJobPlan.test.ts`
- `tests/openRouterDirectGenerationPresets.test.ts`
- `tests/trainingOpenRouterLanguageContract.test.ts`
- `tests/workspaceModelRefreshRuntime.test.ts`
- `tests/config.test.ts`

## PWA/mobile and CSS cascade

High-risk areas:

- PWA shell, manifest, service worker behavior.
- Mobile training route and low-latency typing.
- Page-exit keepalive sync for finalized sessions.
- `src/styles/index.css` import order and responsive override order.
- Runtime CSS modules under `src/styles/`.

Rules:

1. Do not change mobile/PWA behavior as part of unrelated App-shell cleanup.
2. Run focused unit/perf tests first, then `npm run test:e2e:mobile` when flow-level mobile behavior is affected.
3. Do not paste runtime selectors back into `src/App.css`.
4. Do not reorder CSS imports without checking desktop, mobile width, sidebar expanded/collapsed, training, TTS workspace, dashboard/admin, adaptive views, and final responsive breakpoints.

Primary tests / checks:

- `tests/LowLatencyTextareaContract.test.ts`
- `tests/lowLatencyTextarea.test.ts`
- `tests/lowLatencyPerformanceGate.test.ts`
- `e2e/training-mobile.spec.ts`
- `npm run test:e2e:mobile`

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
- `src/inputs/browserTts/`
- Browser speech synthesis behavior.
- Voice discovery and normalization.
- Recovery policy.
- Rate policy.
- Unsafe voice policy.
- Dynamic chunk planning.
- Telemetry adapter behavior.

Current App shell anchors in the post-telemetry-recorder working tree:

- `resetSession`: `src/App.tsx:925`
- `useTtsTelemetryRecorder` hook call: `src/App.tsx:1102`
- `useTtsUiPublisher` hook call: `src/App.tsx:1135`
- `useTtsPerformanceSampler` hook call: `src/App.tsx:1154`
- `playTts`: `src/App.tsx:1227`
- `playTtsFromWord`: `src/App.tsx:1232`
- `useTtsPlaybackControls` hook call: `src/App.tsx:1713`
- `BrowserTtsSetupCard` render branch: `src/App.tsx:2240`

Recheck these anchors with `rg` before editing; line numbers are observational and will drift.

Primary tests:

- `tests/useBrowserTtsRuntime.test.ts`
- `tests/useTtsTelemetryRecorder.test.ts`
- `tests/useTtsUiPublisher.test.ts`
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
- Semantic phrase planning.
- Dictation script phrase validation.
- Finished-session transition behavior.

Primary tests:

- `tests/semanticPhrasePlanner.test.ts`
- `tests/dictationScriptValidation.test.ts`
- `tests/sessionStatusNormalization.test.ts`
- `tests/sessionScore.test.ts`
- `tests/listeningTrainerPolicy.test.ts`

Rules:

1. Do not change phrase progression while extracting unrelated UI props.
2. Verify session status transitions when changing progression logic.
3. Treat scoring, phrase completion, and session finish behavior as coupled.
4. Prefer pure planner/scoring tests before UI-level validation.

## `playTtsFromWord`

High-risk concerns:

- Word-level playback.
- Current phrase context.
- Browser TTS runtime state.
- User-initiated replay.
- Training flow continuity.

Rules:

1. Do not modify `playTtsFromWord` without an explicit playback plan.
2. Avoid changing callback identity or dependencies casually.
3. Verify replay behavior through focused runtime tests when possible.
4. Keep unrelated refactors away from word-level playback logic.

## `resetSession`

High-risk concerns:

- Session lifecycle.
- Persistence cleanup.
- Current phrase reset.
- Score reset.
- Feedback/debug state.
- Pending sync state.
- UI readiness after reset.

Primary tests:

- `tests/sessionStatusNormalization.test.ts`
- `tests/sessionScore.test.ts`
- `tests/sessionFeedbackAdaptive.test.ts`
- `tests/sessionFeedbackDebugLag.test.ts`
- `tests/useSessionPersistenceSync.test.ts`

Rules:

1. Do not alter reset semantics as part of UI extraction.
2. Confirm whether reset should preserve or clear profile-scoped state.
3. Verify persistence behavior when reset touches saved sessions.
4. Keep reset behavior separate from visual cleanup.

## Refs, timers, and telemetry

High-risk concerns:

- TTS refs.
- Timer cleanup.
- Debounced callbacks.
- Page lifecycle flushes.
- Runtime metrics.
- Lag diagnostics.
- Telemetry sampling.

Primary tests:

- `tests/lagStability.test.ts`
- `tests/perfDiagnostics.test.ts`
- `tests/sessionFeedbackDebugLag.test.ts`
- `tests/useBrowserTtsRuntime.test.ts`

Rules:

1. Always check cleanup paths when touching timers.
2. Do not create new intervals/timeouts without a cleanup strategy.
3. Avoid widening effect dependencies unless intentional.
4. Treat telemetry changes as behavior changes, not pure cleanup.
5. Be careful with React Strict Mode double-invocation behavior.

## Low-latency typing

High-risk areas:

- `LowLatencyTextarea`
- Typing event handling.
- Composition events.
- Keyboard remapping.
- Mobile typing behavior.
- Performance gates.

Primary tests:

- `tests/LowLatencyTextareaContract.test.ts`
- `tests/lowLatencyTextarea.test.ts`
- `tests/lowLatencyPerformanceGate.test.ts`
- `tests/useKeyboardRemapRuntime.test.ts`
- `tests/lagStability.test.ts`

Rules:

1. Do not add synchronous heavy work to typing handlers.
2. Do not route each keystroke through expensive app-level state unless already proven safe.
3. Preserve IME/composition behavior.
4. Run the performance gate for textarea changes.
5. For mobile-impacting changes, consider `npm run test:e2e:mobile`.

## Session persistence and sync

High-risk areas:

- `src/app/useSessionPersistenceSync.ts`
- Session storage.
- Supabase sync.
- Profile-scoped storage.
- Pending session state.
- Page lifecycle flush behavior.

Primary tests:

- `tests/useSessionPersistenceSync.test.ts`
- `tests/supabaseSync.test.ts`
- `tests/profileScopedStorage.test.ts`
- `tests/sessionStatusNormalization.test.ts`

Rules:

1. Do not change persistence timing without focused tests.
2. Verify profile/user scoping.
3. Treat debounced persistence as runtime behavior.
4. Keep persistence refactors separate from Supabase policy changes.
5. Check lifecycle flush behavior when changing unload/visibility effects.

## Supabase auth, RLS, and service role

High-risk areas:

- Supabase profile route.
- Supabase sync.
- Multi-user auth.
- RLS policy assumptions.
- Service-role access.
- Profile role behavior.

Primary tests:

- `tests/supabaseProfileRoute.test.ts`
- `tests/supabaseSync.test.ts`
- `tests/appProfiles.test.ts`
- `tests/profileScopedStorage.test.ts`

Rules:

1. Never weaken user/profile scoping casually.
2. Never expose service-role behavior to client-side code.
3. Keep auth behavior changes separate from UI refactors.
4. Verify member/admin role assumptions.
5. Treat RLS-related SQL/docs as security-sensitive.

## OpenRouter routes/jobs

High-risk areas:

- OpenRouter chat route.
- OpenRouter job route.
- OpenRouter direct generation.
- OpenRouter model refresh.
- OpenRouter jobs runtime.
- Rate limits and quota behavior.

Primary tests:

- `tests/openRouterChatRoute.test.ts`
- `tests/openRouterJobRoute.test.ts`
- `tests/openRouterJobs.test.ts`
- `tests/useOpenRouterJobsRuntime.test.ts`
- `tests/openRouterDirectGenerationJobPlan.test.ts`
- `tests/openRouterDirectGenerationPresets.test.ts`
- `tests/trainingOpenRouterLanguageContract.test.ts`
- `tests/workspaceModelRefreshRuntime.test.ts`

Rules:

1. Do not mix API route changes with UI extraction.
2. Preserve rate-limit and quota semantics.
3. Keep model refresh behavior covered by focused tests.
4. Verify language contract behavior for training generation changes.
5. Treat server route validation as part of the public contract.

## PWA and mobile performance

High-risk areas:

- PWA shell.
- Mobile training UI.
- Install behavior.
- Viewport behavior.
- Touch/typing performance.
- Mobile end-to-end flow.

Primary tests:

- `e2e/training-mobile.spec.ts`
- `tests/lowLatencyPerformanceGate.test.ts`
- `tests/lagStability.test.ts`
- `tests/perfDiagnostics.test.ts`

Rules:

1. Do not assume desktop behavior covers mobile.
2. Avoid layout or viewport changes without mobile consideration.
3. Run focused unit/performance tests before E2E.
4. Run `npm run test:e2e:mobile` when changing mobile flow behavior.

## CSS cascade and import order

High-risk areas:

- `src/styles/`
- Global CSS.
- Design tokens.
- Component style dependencies.
- Import order.
- Responsive/mobile styling.

Reference docs:

- `src/styles/README.md`

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

## Escalation rule

If a requested change touches more than one high-risk boundary, split the work.

Prefer multiple small commits over a broad mixed change.

## Modularization ROI override

A high modularization score in `docs/modularization-roi.md` does not remove the need for validation. It also does not mean the candidate should be avoided by default. If a candidate touches Browser TTS playback/runtime, phrase progression, `playTtsFromWord`, `resetSession`, refs, timers, telemetry, Supabase, OpenRouter jobs, PWA/mobile performance, or CSS cascade behavior, convert that risk into focused tests, a bounded slice, manual smoke checks where needed, and a clear rollback plan before moving code.

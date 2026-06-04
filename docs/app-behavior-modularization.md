# App.tsx Behavior Modularization Plan

Phase 2: behavior-aware modularization.

Status: active. The `useWorkspaceRouting`, `useOpenRouterJobsRuntime`, and `useSessionPersistenceSync` boundaries have been extracted; no later Phase 2 boundary has started.

`src/App.tsx` still owns substantial runtime behavior: workspace orchestration, hook-shaped state boundaries, side-effect ownership, polling, persistence, sync, adaptive wiring, playback lifecycle, auth/profile glue, generated-session handoff, and browser lifecycle logic. Phase 2 exists to move those behavior boundaries deliberately, one at a time, without changing product behavior.

Read first:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`
4. `docs/app-modularization.md`
5. this file

## Scope

Phase 2 is not UI-only. It covers hooks and orchestration modules that move behavior and side effects out of `src/App.tsx`.

Phase 2 may move:

- hook-owned state and derived values
- orchestration helpers
- side-effect ownership
- polling setup and cleanup
- local persistence coordination
- Supabase sync orchestration
- adaptive runtime wiring
- playback runtime lifecycle wiring
- browser lifecycle handling

Phase 2 must not use behavior extraction as a product behavior change vehicle. If behavior needs to change, make that an explicit behavior or migration PR with its own design, tests, and docs.

## Required Rules

- Each PR moves one boundary only.
- Do not combine behavior extraction with product behavior changes.
- Preserve `(inputMode, language)` semantics exactly.
- Do not change localStorage keys unless the PR is explicitly a migration/behavior PR.
- Do not change Supabase row shapes unless the PR is explicitly a migration/behavior PR.
- Do not change OpenRouter payload shapes unless the PR is explicitly a migration/behavior PR.
- Do not change adaptive heuristics unless the PR is explicitly an adaptive behavior PR.
- Keep `cosyvoice-cache` as the canonical Input #4 mode and preserve `qwen-cloud` legacy normalization.
- Keep secrets, auth, rate limits, server-only keys, and Supabase service-role usage inside the existing server-side boundaries.
- Preserve LowLatencyTextarea behavior and mobile/PWA typing performance.

## Required Measurement

Before each Phase 2 PR:

```bash
git status
git pull origin main
wc -l src/App.tsx
npm run test -- --reporter=verbose
npm run build
npm run test:e2e:mobile
```

Record the pre-change `src/App.tsx` line count in the PR closeout. After the extraction, rerun the relevant validation and record the post-change line count.

## PR Closeout Template

```text
Boundary:
Status:
PR/commit:
Pre-change App.tsx lines:
Post-change App.tsx lines:
Files added/moved:
Behavior preserved:
Validation:
Manual smoke test:
Follow-ups:
```

## Recommended Phase 2 Boundaries

### A. useWorkspaceRouting

Proposed file:

```text
src/app/useWorkspaceRouting.ts
```

Risk: lowest.

Status: complete.

Move workspace routing state and navigation helpers only.

Do not move session mutation, sync, adaptive, playback, OpenRouter, or auth logic.

### B. useOpenRouterJobsRuntime

Proposed file:

```text
src/app/useOpenRouterJobsRuntime.ts
```

Status: complete.

Move browser-side durable OpenRouter job lifecycle, active job state, local active-job storage, polling setup/cleanup, terminal cleanup, and result/usage extraction orchestration.

Do not move final generated-session creation yet.

Preserve `cosyvoice-cache` canonical behavior and `qwen-cloud` legacy normalization.

### C. useSessionPersistenceSync

Proposed file:

```text
src/app/useSessionPersistenceSync.ts
```

Move localStorage session persistence, profile-scoped storage readiness, tombstones, debounced/immediate persistence, sync status, and Supabase sync orchestration.

Risk: high. Watch for data loss, tombstone regressions, and cross-profile leakage.

Status: complete.

### D. useAdaptiveRuntime

Proposed file:

```text
src/app/useAdaptiveRuntime.ts
```

Move adaptive controller refs/wiring, benchmark update dispatch, live telemetry application, selected profile state glue, and session feedback orchestration.

Do not move `AdaptiveDictationController` heuristics or benchmark calculation logic.

Add fixture/replay tests before doing this extraction.

### E. useTrainingSessionLifecycle

Proposed file:

```text
src/app/useTrainingSessionLifecycle.ts
```

Move start/pause/resume/stop/reset/submit orchestration, active/pending transitions, and ready checklist derivation if lifecycle-owned.

Preserve LowLatencyTextarea behavior and mobile E2E typing latency.

### F. Playback Runtimes

Proposed files:

```text
src/app/useAudioPlaybackRuntime.ts
src/app/useBrowserTtsRuntime.ts
src/app/useKokoroRuntime.ts
src/app/useCosyVoiceCacheRuntime.ts
```

Risk: highest.

Move one input mode per PR. Do not move multiple input playback runtimes in the same PR.

### G. useGeneratedSessionCreation

Proposed file:

```text
src/app/useGeneratedSessionCreation.ts
```

Move DictationScript-to-session construction, OpenRouter result-to-session handoff, custom generated session construction, naming/default metadata, and quota-aware insertion glue.

Do not move OpenRouter polling, persistence/sync implementation, or adaptive updates in the same PR.

## Stop Conditions

Stop the Phase 2 extraction if:

- the extracted hook needs a huge unstable prop bag
- the patch touches more than one behavior boundary
- mobile E2E latency regresses
- persisted payload shapes would change without an explicit migration plan
- TypeScript requires exporting many `App.tsx`-local types without a stable shared type plan

## Current Recommendation

Phase 2 started with `useWorkspaceRouting`.

`useSessionPersistenceSync` is now complete. The next listed boundary is `useAdaptiveRuntime`, but it is high risk and should start only after fixture/replay coverage for adaptive runtime wiring.

## Closeout Log

```text
Boundary: useWorkspaceRouting
Status: complete
PR/commit: pending
Pre-change App.tsx lines: 9008
Post-change App.tsx lines: 8961
Files added/moved: src/app/useWorkspaceRouting.ts
Behavior preserved: workspace mode routing, dashboard session selection, app route path tracking, and dicta.workspaceMode.v1 persistence. Session mutation, sync, adaptive, playback, OpenRouter, auth, payload shapes, localStorage keys, Supabase row shapes, and adaptive heuristics were not changed.
Validation: git pull origin main; npm run test -- --reporter=verbose; npm run build; npm run test:e2e:mobile
Manual smoke test: attempted with the in-app Browser against http://127.0.0.1:5173/; blocked by browser navigation timeout. Automated Playwright mobile smoke passed.
Follow-ups: next listed candidate is useOpenRouterJobsRuntime, but only after a fresh Phase 2 measurement/checklist.
```

```text
Boundary: useOpenRouterJobsRuntime
Status: complete
PR/commit: pending
Pre-change App.tsx lines: 8961
Post-change App.tsx lines: 8777
Files added/moved: src/app/useOpenRouterJobsRuntime.ts; tests/useOpenRouterJobsRuntime.test.ts
Behavior preserved: browser-side durable OpenRouter active-job storage, polling cadence, terminal cleanup, job notifications, generation notices, successful result validation, and handoff to App-owned generated-session creation. OpenRouter server routes, auth/access gating, rate limits, payload shapes, final generated-session creation, persistence/sync implementation, adaptive updates, localStorage keys, Supabase row shapes, and adaptive heuristics were not changed. Polling transport errors still do not create persistent generation error sessions.
Validation: git status; git pull origin main; App.tsx line count; npm run test -- --reporter=verbose; npm run build; npm run test:e2e:mobile
Manual smoke test: automated Playwright mobile smoke passed; no separate browser manual smoke was needed for this non-visual runtime extraction.
Follow-ups: next listed candidate is useSessionPersistenceSync, but only after a fresh Phase 2 measurement/checklist and a dedicated data-loss/tombstone regression plan.
```

```text
Boundary: useSessionPersistenceSync
Status: complete
PR/commit: pending
Pre-change App.tsx lines: 8777
Post-change App.tsx lines: 8305
Files added/moved: src/app/useSessionPersistenceSync.ts; tests/useSessionPersistenceSync.test.ts
Behavior preserved: session localStorage key, adaptive benchmark/feedback storage keys, profile-scoped storage key set, tombstone key and retention behavior, debounced session persistence, immediate finalize/create/feedback persistence, Supabase row shapes, pull/merge/push cadence, transient generation-error tombstoning, and admin/profile/auth boundaries. Adaptive heuristics, OpenRouter payloads, server routes, rate limits, LowLatencyTextarea behavior, and session normalization semantics were not changed.
Validation: git status; git pull origin main; App.tsx line count; npm run test -- --reporter=verbose; npm run build; npm run test:e2e:mobile
Manual smoke test: automated Playwright mobile smoke passed; focused hook tests cover debounced/immediate persistence, profile-scoped switching readiness, and local tombstones.
Follow-ups: next listed candidate is useAdaptiveRuntime, but only after fixture/replay coverage for adaptive wiring.
```

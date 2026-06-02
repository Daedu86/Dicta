# App.tsx Modularization Plan

`src/App.tsx` is still the main orchestration surface for Dicta. Because it owns training state, adaptive behavior, local services, sync, admin UI, routing, global app state, auth headers, polling/global lifecycle, final generated-session creation, and sensitive callbacks, modularization must stay incremental and boundary-driven.

_Last updated: 2026-06-02_

Read first:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`
4. this file

## Current size

Current `src/App.tsx` size on `main` after the Kokoro practice card extraction pass:

```text
10,659 lines
```

Baseline before the AdminWorkspace extraction pass, using commit `f5e915b24c9bbbcbf29cc8362ef6325e90895952`:

```text
12,882 lines
```

Net reduction in `src/App.tsx` from the AdminWorkspace pass:

```text
312 lines
```

This is a net App.tsx reduction after adding imports and keeping the remaining sensitive orchestration in place. Extracted component source now lives under `src/components/admin/`, so repository line count increased while `App.tsx` became smaller and more compositional.

Net reduction in `src/App.tsx` from the SessionDashboard pass:

```text
466 lines
```

Net reduction in `src/App.tsx` from the adaptive workspace preparation pass:

```text
36 lines
```

Net reduction in `src/App.tsx` from the adaptive benchmark workspace extraction pass:

```text
1,149 lines
```

## Rules

- Do not combine modularization with behavior changes.
- Do not touch adaptive pacing behavior while extracting UI or helpers.
- Do not change `(inputMode, language)` semantics during extraction.
- Each extraction should move one cohesive unit and keep imports explicit.
- Each step should pass `npm run test -- --reporter=verbose` and `npm run build` before the next extraction.

## Recommended extraction order

### 1. Build info display helper

Boundary: browser UI display only.

Status: done.

Files:

```text
src/core/buildInfo.ts
tests/buildInfo.test.ts
```

Prepared exports:

- `DictaBuildInfo` type
- `buildBuildInfoLabel`
- `buildBuildInfoTitle`

Completed patch:

- Import the prepared exports from `src/core/buildInfo.ts` in `src/App.tsx`.
- Remove the duplicate `DictaBuildInfo` type and build-info formatting helpers from `src/App.tsx`.
- Keep `DICTA_BUILD_INFO`, `DICTA_BUILD_INFO_LABEL`, and `DICTA_BUILD_INFO_TITLE` behavior unchanged.

Why first:

- Low risk.
- No React state.
- No session persistence.
- No adaptive behavior.
- No OpenRouter runtime behavior.

### 2. TrainingView component

Boundary: browser UI.

Status: done.

Moved `TrainingView` and `TrainingViewProps` into:

```text
src/components/TrainingView.tsx
```

`LowLatencyTextarea` behavior stayed unchanged. The existing `tests/LowLatencyTextareaContract.test.ts` protects the key uncontrolled-textarea contract.

Watch points:

- `flushTextInput()` is still used on pause, stop, and submit.
- Focus behavior after play is still owned by `TrainingView`.
- `onImmediateValueChange` still supports Browser TTS live evaluation.
- Props remain explicit; no context/global state was introduced.

### 3. Training UI card components

Boundary: browser UI.

Status: complete enough.

Training UI extraction is complete enough. `TrainingView` now acts mostly as an orchestration layer for focused training cards.

Completed extractions now live under:

```text
src/components/training/PendingSessionLane.tsx
src/components/training/SyncStatusBanner.tsx
src/components/training/TrainingAudioCard.tsx
src/components/training/TrainingInputCard.tsx
src/components/training/TrainingSubmitCard.tsx
src/components/training/TrainingGenerationCard.tsx
src/components/training/TrainingSessionCard.tsx
```

Preserved behavior:

- `LowLatencyTextarea` stays uncontrolled and protected by `tests/LowLatencyTextareaContract.test.ts`.
- `flushTextInput()` is still evaluated on pause, stop, and submit interactions.
- Play still focuses the textarea through `TrainingView` ownership of the text input ref.
- Training cards remain presentational and receive explicit props.
- Session persistence, sync behavior, TTS behavior, OpenRouter behavior, and adaptive pacing stayed unchanged.

Stop condition:

- Do not keep extracting training UI unless `TrainingView` accumulates new unrelated responsibilities.
- Prefer measuring file sizes before further splitting.
- Avoid turning small static markup into unnecessary microcomponents.

### 4. OpenRouter workspace UI

Boundary: browser UI + server route clients.

Status: complete enough.

OpenRouter workspace extraction is complete enough. `App.tsx` now owns routing, global app state, auth headers, polling/global lifecycle, final generated-session creation, and sensitive callbacks, while OpenRouter UI composition lives under:

```text
src/components/openrouter/
```

Completed extraction files:

```text
src/components/openrouter/types.ts
src/components/openrouter/openRouterViewHelpers.ts
src/components/openrouter/OpenRouterWorkspace.tsx
src/components/openrouter/OpenRouterGenerationStatusPanel.tsx
src/components/openrouter/OpenRouterSlotSelector.tsx
src/components/openrouter/OpenRouterPromptControls.tsx
src/components/openrouter/OpenRouterModelSelector.tsx
src/components/openrouter/OpenRouterGenerateSummary.tsx
src/components/openrouter/OpenRouterGenerateActionPanel.tsx
src/components/openrouter/OpenRouterGeneratedOutputPanel.tsx
```

Preserved behavior:

- Prompt-building behavior stayed unchanged.
- Durable job lifecycle and polling behavior stayed unchanged.
- OpenRouter localStorage keys and generated-variant persistence stayed unchanged.
- `/api/openrouter/*` route contracts stayed unchanged.
- Auth/profile/access gating stayed unchanged.
- Adaptive `(inputMode, language)` behavior stayed unchanged.
- Training UI and final generated-session creation behavior stayed unchanged.

Impact:

- From the OpenRouter plan baseline, `src/App.tsx` changed by roughly `-1869/+133`, a net reduction of about 1,736 lines.
- OpenRouter UI composition is now isolated enough that further OpenRouter splitting should be driven by a concrete maintenance need, not by line count alone.

Stop condition:

- Do not extract `OpenRouterSlotCard` unless it clearly reduces complexity without creating a large unstable prop bag.
- Do not move OpenRouter job/storage lifecycle without dedicated tests and a separate design plan.

### 5. Admin workspace UI

Boundary: browser UI + Supabase/admin route clients.

Status: complete enough / closed.

AdminWorkspace UI modularization is closed for this App.tsx reduction pass. The detailed closeout is documented in:

```text
docs/admin-workspace-modularization.md
```

Admin UI components now live under:

```text
src/components/admin/
```

Completed extraction files:

```text
src/components/admin/AdminHeader.tsx
src/components/admin/AdminKpiGrid.tsx
src/components/admin/AdminUsersCard.tsx
src/components/admin/AdminMemberAccessCard.tsx
src/components/admin/AdminCreateUserCard.tsx
src/components/admin/AdminManualInputSessionCard.tsx
src/components/admin/AdminBrowserStorageCard.tsx
src/components/admin/AdminProjectFilesCard.tsx
src/components/admin/AdminSessionInventoryCard.tsx
```

Final Admin UI extraction commit:

```text
0f4c0e2e0c1788fa5948a75ea003602e17266355
Extract AdminSessionInventoryCard component
```

Admin closeout commit:

```text
40944d5d28b8b719c2a33f08bac2e2278c7b42f1
Close AdminWorkspace modularization plan
```

Preserved behavior:

- `api/admin/users.js` was not changed.
- `api/_securityEvents.js` was not changed.
- `fetch('/api/admin/users', ...)` stayed inside `createDictaUser()` in `AdminWorkspace`.
- `createDictaUser()` stayed in `AdminWorkspace`.
- `saveProfileAccess()` stayed in `AdminWorkspace`.
- `onUpdateProfileAccess(...)` did not move.
- Auth headers were not changed.
- Supabase access behavior was not changed.
- Security-event behavior was not changed.
- localStorage import/export behavior was not changed.
- `importInputRef` stayed in `AdminWorkspace`.

Impact:

- AdminWorkspace pass baseline: `12,882` App.tsx lines at `f5e915b24c9bbbcbf29cc8362ef6325e90895952`.
- Current post-pass size: `12,570` App.tsx lines.
- Net App.tsx reduction: `312` lines.
- AdminWorkspace now acts primarily as an orchestration layer for state and sensitive handlers.

Known follow-ups:

- Improve `AdminSessionInventoryCard` typing by moving shared session/admin types to a stable module. The extraction intentionally avoided exporting `StoredSession` from `App.tsx` during the UI pass.
- Consider shared admin formatting helpers only if byte/date formatter duplication starts causing maintenance friction.
- Consider an Admin state hook only as a separate refactor after the UI modularization remains stable.

Stop condition:

- Do not reopen Admin UI extraction unless there is a regression, a focused type cleanup, or a deliberate second pass on admin state management.

### 6. SessionDashboard

Boundary: dashboard UI and derived session analytics display.

Status: complete enough.

`SessionDashboard` now lives outside `src/App.tsx` under:

```text
src/components/session-dashboard/SessionDashboard.tsx
```

Detailed plan and closeout:

```text
docs/session-dashboard-modularization.md
```

Completed extraction:

- Moved the inline `SessionDashboard` implementation out of `src/App.tsx`.
- Moved dashboard-only KPI, transcript review, chart card, loading state, widget copy/help, transcript review, adaptive dashboard goals, coaching insights, KPI help text, and chart help text logic with the component.
- Moved dashboard chart lazy imports with the dashboard module.
- Kept app-level session state, workspace routing, and navigation callbacks in `App.tsx`.
- Kept shared session formatters in `App.tsx` and passed them as explicit props.
- Kept shared `Metric` and `HelpIcon` in `App.tsx` because other workspaces still use them.

Preserved behavior:

- Dashboard visible text, class names, visual order, and chart props stayed unchanged.
- Scoring, points, transcript review logic, telemetry cloning, adaptive dashboard goal derivation, and coaching insights stayed equivalent.
- Training UI, OpenRouter UI, Admin UI, `api/*`, Supabase/auth/security, localStorage persistence, session sync, and adaptive core were not changed.

Impact:

- Starting size for this pass: about `12,568` App.tsx lines.
- Current post-pass size: about `12,102` App.tsx lines.
- Net App.tsx reduction: about `466` lines.

Stop condition:

- Do not split the dashboard further unless it gains new responsibilities or a concrete maintainability issue appears.

### 7. AdaptiveBenchmarkWorkspace

Boundary: adaptive dashboard UI and profile/debug display.

Status: complete enough.

Initial docs-only plan:

```text
docs/adaptive-workspace-modularization.md
```

Completed extraction file:

```text
src/components/adaptive-workspace/AdaptiveBenchmarkWorkspace.tsx
```

Moved with this pass:

- `AdaptiveAdapterCard`
- `AdaptiveBenchmarkSection`
- `AdaptiveProfileMatrix`
- `AdaptiveBenchmarkWorkspace`
- adaptive workspace local `Metric` clone
- adaptive workspace local viewport/input-mode helpers

Preserved behavior:

- App-owned callbacks, benchmark persistence, selected profile state, session-history-dependent helpers, active-session status resolution, adaptive controller updates, benchmark write paths, localStorage, sync, and feedback generation stayed in `App.tsx`.
- Training UI, OpenRouter UI, Admin UI, `api/*`, `src/core/adaptive/*`, input adapters, auth/security, and Supabase code were not changed.

Impact:

- `src/App.tsx` after this pass: about `10,919` lines.
- Net App.tsx reduction from the adaptive benchmark workspace extraction: about `1,149` lines.

Recommended follow-up:

- Split the extracted adaptive workspace file only if a concrete maintainability need appears.
- Keep app-owned callbacks, benchmark persistence, selected profile state, and session-history-dependent helpers in `App.tsx`.
- Do not move adaptive controller updates, benchmark write paths, localStorage, sync, or feedback generation without a separate behavior-aware plan.

Prepared adaptive workspace support files:

```text
src/components/adaptive-workspace/types.ts
src/components/adaptive-workspace/adaptiveWorkspaceViewHelpers.ts
```

### 8. Runtime input workspaces

Boundary: runtime setup/sidebar panels and TTS/Kokoro/CosyVoice workspace UI still embedded in the main app render branch.

Status: active incremental extraction.

Dedicated plan:

```text
docs/runtime-input-workspaces-modularization.md
```

The next large remaining JSX is concentrated around input setup/sidebar UI, `workspaceMode === 'tts'`, `workspaceMode === 'kokoro'`, Input #4/CosyVoice cache controls, shared runtime practice controls, and the bottom live-metrics/insights area.

Completed runtime extractions:

```text
src/components/runtime-workspaces/BrowserTtsSourceCard.tsx
src/components/runtime-workspaces/BrowserTtsPracticeCard.tsx
src/components/runtime-workspaces/KokoroSourceCard.tsx
src/components/runtime-workspaces/KokoroPracticeCard.tsx
```

Completed references:

```text
df96574bfb910ecdb0cf64bcd31e6253d961e017
Extract BrowserTtsSourceCard component

a7a75e01edd6a885a00a1b7fcc41833c90feeb91
Extract BrowserTtsPracticeCard component

8f2d4886ef44998f4c953100a000decacc777e16
Extract Kokoro source card

KokoroPracticeCard extraction completed in the implementation commit reported in the final summary.
```

Selected next candidate:

```text
Input #4/CosyVoice setup/runtime cards
```

Input #4/CosyVoice should stay UI-only/presentational in the next extraction. App-owned local service checks, playback handlers, sidecar calls, cache behavior, pacing behavior, adaptive updates, submit/reset behavior, access/quotas, persistence, and sync stay in `src/App.tsx`.

Recommended follow-up:

- Use the dedicated plan before moving code.
- Keep future runtime patches to one cohesive UI-only card at a time.
- Re-measure exact line ranges before touching Kokoro practice, Input #4/CosyVoice workspace, input setup/sidebar, or bottom live metrics/insights.
- Keep playback, adaptive updates, local-dev sidecars, persistence, and submission behavior in `App.tsx`.

Stop condition:

- Do not move audio engines, Browser TTS playback logic, Kokoro/CosyVoice sidecar behavior, adaptive controller updates, localStorage, sync, or submit/reset behavior without a separate behavior-aware plan.

## Per-patch checklist

Before each extraction patch:

```bash
git status
git pull origin main
npm run test -- --reporter=verbose
npm run build
```

Then make only the scoped extraction and rerun:

```bash
npm run test -- --reporter=verbose
npm run build
```

If that passes, commit before starting the next extraction.

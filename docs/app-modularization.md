# App.tsx Modularization Plan

`src/App.tsx` is still the main orchestration surface for Dicta. Because it owns training state, adaptive behavior, local services, sync, admin UI, routing, global app state, auth headers, polling/global lifecycle, final generated-session creation, and sensitive callbacks, modularization must stay incremental and boundary-driven.

Read first:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`
4. this file

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

Status: next candidate.

Admin workspace is the next likely high-value modularization area after OpenRouter. Extract admin rendering separately from OpenRouter. Keep `api/admin/users.js`, `api/_securityEvents.js`, Supabase access behavior, auth headers, and security-event behavior unchanged.

Recommended first step:

- Create or update a dedicated admin modularization plan before moving code.
- Identify UI-only admin sections that can be extracted without changing Supabase calls, access gating, profile mutation behavior, file import/export behavior, or security-event logging.

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

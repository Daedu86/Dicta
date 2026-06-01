# App.tsx Modularization Plan

`src/App.tsx` is still the main orchestration surface for Dicta. Because it owns training state, adaptive behavior, OpenRouter generation, local services, sync, and admin UI, modularization must stay incremental and boundary-driven.

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

Status: planned.

Next recommended block: create a dedicated plan before moving code, for example:

```text
docs/openrouter-workspace-modularization.md
```

OpenRouter workspace extraction is riskier than training UI because it mixes prompt generation, model access, durable jobs, job polling, local storage, slot state, mobile flow, and error handling. Start with a plan and keep server route contracts unchanged.

### 5. Admin workspace UI

Boundary: browser UI + Supabase/admin route clients.

Status: later.

Extract admin rendering separately from OpenRouter. Keep `api/admin/users.js` and `api/_securityEvents.js` behavior unchanged.

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

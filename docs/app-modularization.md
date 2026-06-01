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

### 3. Pending session lane and small training subcomponents

Boundary: browser UI.

Status: in progress.

Completed extractions now live under:

```text
src/components/training/PendingSessionLane.tsx
src/components/training/SyncStatusBanner.tsx
src/components/training/TrainingAudioCard.tsx
src/components/training/TrainingInputCard.tsx
```

Recommended next extraction:

- Move `TrainingSubmitCard` into a small training UI component module.
- Keep the component presentational and stateless where possible.
- Keep `TrainingView` props and runtime behavior unchanged.
- Do not change session persistence, sync behavior, TTS behavior, OpenRouter, or adaptive pacing.

### 4. OpenRouter workspace UI

Boundary: browser UI + server route clients.

Only after the training surface is stable, extract OpenRouter workspace rendering into a component module. Do not change prompt-building logic, durable job behavior, active-job storage, or server route contracts in this step.

### 5. Admin workspace UI

Boundary: browser UI + Supabase/admin route clients.

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

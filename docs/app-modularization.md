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

Move build-info formatting out of `App.tsx` into a small module, for example:

```text
src/core/buildInfo.ts
```

Candidate contents:

- `DictaBuildInfo` type
- `buildBuildInfoLabel`
- `buildBuildInfoTitle`

Why first:

- Low risk.
- No React state.
- No session persistence.
- No adaptive behavior.
- No OpenRouter runtime behavior.

### 2. TrainingView component

Boundary: browser UI.

Move the already-isolated `TrainingView` component and `TrainingViewProps` into:

```text
src/components/TrainingView.tsx
```

Keep `LowLatencyTextarea` behavior unchanged. The existing `tests/LowLatencyTextareaContract.test.ts` should protect the key uncontrolled-textarea contract.

Watch points:

- Preserve `flushTextInput()` on pause, stop, and submit.
- Preserve focus behavior after play.
- Preserve `onImmediateValueChange` for Browser TTS live evaluation.
- Keep props explicit; do not introduce context/global state.

### 3. Pending session lane and small training subcomponents

Boundary: browser UI.

If still inside `App.tsx`, extract small presentational components used by `TrainingView`, such as pending-session display or status banners. Keep them stateless where possible.

### 4. OpenRouter workspace UI

Boundary: browser UI + server route clients.

Only after the training surface is stable, extract OpenRouter workspace rendering into a component module. Do not change prompt-building logic, durable job behavior, active-job storage, or server route contracts in this step.

### 5. Admin workspace UI

Boundary: browser UI + Supabase/admin route clients.

Extract admin rendering separately from OpenRouter. Keep `api/admin/users.js` and `api/_securityEvents.js` behavior unchanged.

## First local patch checklist

For the first actual `App.tsx` extraction patch:

```bash
git status
git pull origin main
npm run test -- --reporter=verbose
npm run build
```

Then make only the build-info extraction and rerun:

```bash
npm run test -- --reporter=verbose
npm run build
```

If that passes, commit before extracting `TrainingView`.

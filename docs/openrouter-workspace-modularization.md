# OpenRouter Workspace Modularization Plan

`src/App.tsx` still owns the OpenRouter workspace. This workspace is more sensitive than the training UI because it mixes browser UI with generation state, durable jobs, polling, localStorage persistence, access gating, and generated-session import behavior.

Read first:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`
4. `docs/app-modularization.md`
5. this file

## Rules

- Do not combine OpenRouter modularization with behavior changes.
- Do not change prompt-building logic while extracting UI.
- Do not change `/api/openrouter/*` route contracts.
- Do not change durable job creation, polling, cleanup, or local active-job storage in a UI extraction patch.
- Do not change `localStorage` keys or generated-variant persistence semantics.
- Do not change profile/access gating semantics.
- Do not change adaptive `(inputMode, language)` profile behavior.
- Each extraction should pass `npm run test -- --reporter=verbose` and `npm run build` before the next extraction.

## Boundary

OpenRouter workspace is a browser UI boundary that talks to server routes:

- `GET /api/openrouter/models`
- `POST /api/openrouter/chat`
- `POST /api/openrouter/jobs`
- `GET /api/openrouter/jobs?id=...`

Server route security, rate limits, durable jobs, audit events, and access checks should stay in `api/openrouter/*` and related server helpers. UI extraction must not weaken those boundaries.

## Keep in App.tsx initially

During early extraction patches, keep these orchestration responsibilities in `src/App.tsx`:

- model fetching and refresh behavior;
- generation request submission;
- durable job creation;
- durable job polling;
- generated-variant persistence;
- active job persistence;
- generated script import into training sessions;
- error handling and recovery decisions;
- profile/access state resolution;
- any effect that reads or writes OpenRouter localStorage keys.

This keeps the first UI extractions low-risk and avoids moving async lifecycle behavior too early.

## Extract first: UI-only pieces

Start with presentational components that receive explicit props and do not own async state.

Recommended order:

1. `OpenRouterGenerationStatusPanel` - done.
2. `OpenRouterSlotSelector` - next.
3. `OpenRouterPromptControls`.
4. `OpenRouterModelSelector`.
5. `OpenRouterSlotCard`.
6. `OpenRouterWorkspace`.

Do not extract all of these in one patch. Each step should be committed and validated separately.

## Completed: OpenRouterGenerationStatusPanel

Boundary: browser UI display only.

Status: done.

File:

```text
src/components/openrouter/OpenRouterGenerationStatusPanel.tsx
```

Extracted from the OpenRouter generate section inside `OpenRouterWorkspace`.

Preserved behavior:

- job notice tone mapping;
- token usage message;
- elapsed-time message;
- generated-at local timestamp rendering;
- slot-level error display;
- draft-kept message;
- cancel-draft button callback.

This extraction did not move durable jobs, polling, prompt building, localStorage, access checks, API routes, adaptive behavior, or training UI.

## Candidate 1: OpenRouterSlotSelector

Boundary: browser UI controls.

Why next:

- Low risk.
- It only selects the active generation slot.
- It should not own generation, persistence, prompt building, job polling, or import behavior.

Likely source block:

```tsx
<section className="openrouter-button-control openrouter-slot-control" aria-label="Generated session setup">
```

Rules:

- Preserve `OPENROUTER_GENERATION_SLOT_IDS.map` behavior.
- Preserve active-slot styling and `aria-pressed`.
- Preserve each slot label from `getOpenRouterSlotLabel(slotId)`.
- Preserve status text: ready to create, needs fix, draft saved, or empty setup.
- Keep validation calculation in `OpenRouterWorkspace` if that keeps the selector presentational.
- Pass explicit slot option props into the new component.
- Keep `setActiveGenerateSlotId` ownership in `OpenRouterWorkspace`.

## Candidate 2: OpenRouterPromptControls

Boundary: browser UI controls.

Likely responsibilities:

- input mode selector;
- duration selector;
- language selector;
- prompt source selector;
- difficulty selector if present in the same generate-control area.

Rules:

- Do not move prompt construction in the first extraction.
- Do not change `buildOpenRouterGenerationPrompt` inputs.
- Preserve exact selected values and event handlers.
- Prefer passing option arrays and callbacks rather than importing workspace state.

## Candidate 3: OpenRouterModelSelector

Boundary: browser UI controls.

Likely responsibilities:

- render model options;
- render refresh/loading/error state;
- render selected default model.

Rules:

- Do not move model fetch lifecycle in the first extraction.
- Do not change model normalization or free-model gating.
- Pass loading/error/options/current selection as props.

## Candidate 4: OpenRouterSlotCard

Boundary: browser UI display + callbacks.

Likely responsibilities:

- render one generated variant slot;
- render notes/model/text/json state for that slot;
- render generate/copy/import/clear actions;
- surface slot-level errors and metadata.

Rules:

- Do not move slot persistence in the first extraction.
- Do not move generate/import behavior in the first extraction.
- Pass callbacks from `App.tsx` or `OpenRouterWorkspace`.
- Preserve slot ids and labels exactly.

## Candidate 5: OpenRouterWorkspace

Boundary: browser UI composition.

Only extract the larger workspace after smaller pieces are stable. At that point, decide whether `OpenRouterWorkspace` should remain presentational or own some local UI-only state.

Do not move job lifecycle or generated-variant persistence unless there is a dedicated follow-up plan and test coverage.

## Tests and guards

Existing relevant tests:

- `tests/openRouterGenerationPrompt.test.ts`
- `tests/LowLatencyTextareaContract.test.ts`
- `tests/buildInfo.test.ts`

Before moving OpenRouter logic out of `App.tsx`, add or review tests for:

- generated prompt profile isolation;
- duration/difficulty contract;
- local generated variant persistence, if logic is moved;
- durable job state transitions, if logic is moved.

For UI-only extractions, existing tests plus build validation may be enough.

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

## Stop conditions

Stop and reassess if a patch requires any of the following:

- changing server route contracts;
- renaming storage keys;
- moving polling effects;
- changing job lifecycle behavior;
- touching adaptive profile semantics;
- adding broad context/global state just to avoid prop drilling.

Those should become separate design tasks, not incidental extraction changes.

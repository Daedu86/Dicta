# OpenRouter Workspace Modularization Plan

OpenRouter workspace extraction is complete enough. `App.tsx` now owns routing, global app state, auth headers, polling/global lifecycle, final generated-session creation, and sensitive callbacks, while OpenRouter UI composition lives under `src/components/openrouter/`.

Read first:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`
4. `docs/app-shell-modularization-map.md`
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

Server route security, rate limits, durable jobs, audit events, and access checks stay in `api/openrouter/*` and related server helpers. UI extraction must not weaken those boundaries.

## Completed extraction status

OpenRouter UI modularization is complete enough for now.

Completed files:

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

Completed commits:

- `Prepare OpenRouter workspace types and helpers` - done.
- `Extract OpenRouter workspace` - done.

## Completed: OpenRouter workspace types and helpers

Boundary: shared browser UI types/helpers.

Status: done.

Files:

```text
src/components/openrouter/types.ts
src/components/openrouter/openRouterViewHelpers.ts
```

Purpose:

- keep OpenRouter UI types close to the workspace components;
- keep view-only helpers out of `App.tsx`;
- avoid moving server route logic, durable job logic, prompt construction, or storage semantics.

Preserved behavior:

- no API route changes;
- no localStorage key changes;
- no prompt-building changes;
- no durable job lifecycle changes;
- no adaptive profile changes.

## Completed: OpenRouterWorkspace

Boundary: browser UI composition.

Status: done.

File:

```text
src/components/openrouter/OpenRouterWorkspace.tsx
```

`OpenRouterWorkspace` now lives outside `src/App.tsx`. `App.tsx` remains responsible for global app ownership and sensitive orchestration.

`App.tsx` still owns:

- workspace routing/render selection;
- global app state;
- auth headers;
- global polling/lifecycle ownership;
- final generated-session creation;
- sensitive OpenRouter callbacks;
- training session integration;
- profile/access resolution.

Preserved behavior:

- no durable job lifecycle changes;
- no polling changes;
- no localStorage key changes;
- no generation request behavior changes;
- no prompt-building changes;
- no `/api/openrouter/*` changes;
- no auth/access gating changes;
- no adaptive `(inputMode, language)` changes;
- no training UI changes.

## Completed UI subcomponents

### OpenRouterGenerationStatusPanel

File:

```text
src/components/openrouter/OpenRouterGenerationStatusPanel.tsx
```

Preserved behavior:

- job notice tone mapping;
- token usage message;
- elapsed-time message;
- generated-at local timestamp rendering;
- slot-level error display;
- draft-kept message;
- cancel-draft button callback.

### OpenRouterSlotSelector

File:

```text
src/components/openrouter/OpenRouterSlotSelector.tsx
```

Preserved behavior:

- slot option labels from `getOpenRouterSlotLabel(slotId)`;
- active-slot styling and `aria-pressed`;
- status text for ready, needs-fix, draft-saved, and empty states;
- slot selection callback ownership in `OpenRouterWorkspace`;
- validation and slot state calculation outside the presentational component.

### OpenRouterPromptControls

File:

```text
src/components/openrouter/OpenRouterPromptControls.tsx
```

Preserved behavior:

- input mode selector;
- duration selector;
- language selector;
- prompt source selector;
- active styling and `aria-pressed`;
- button labels, descriptions, and titles;
- selection callback ownership in `OpenRouterWorkspace`.

### OpenRouterModelSelector

File:

```text
src/components/openrouter/OpenRouterModelSelector.tsx
```

Preserved behavior:

- model refresh/status display;
- model error display;
- model option rendering;
- selected default model display and update callback;
- assigned model hinting;
- refresh and set-default callbacks remaining owned by `OpenRouterWorkspace`.

### OpenRouterGenerateSummary

File:

```text
src/components/openrouter/OpenRouterGenerateSummary.tsx
```

Preserved behavior:

- target, benchmark, feedback, duration, and prompt-size metrics;
- missing benchmark and missing session-feedback hints;
- read-only `Prompt sent to OpenRouter` textarea;
- visual order by accepting prompt controls as children.

### OpenRouterGenerateActionPanel

File:

```text
src/components/openrouter/OpenRouterGenerateActionPanel.tsx
```

Preserved behavior:

- generate button wrapper and class names;
- disabled state owned by `OpenRouterWorkspace`;
- Requesting, Generating, and Generate slot-label text;
- current-model hint and missing-default-model hint;
- generate callback ownership outside the presentational component.

### OpenRouterGeneratedOutputPanel

File:

```text
src/components/openrouter/OpenRouterGeneratedOutputPanel.tsx
```

Preserved behavior:

- validation summary metrics for title, input mode, language, difficulty, phrases, and duration;
- generated DictationScript JSON textarea;
- raw model response textarea;
- JSON-before-raw rendering precedence;
- textarea labels, rows, and read-only behavior.

## Stop condition

Stop OpenRouter UI modularization here unless a future change adds unrelated responsibilities or the extracted workspace becomes difficult to maintain.

Avoid extracting `OpenRouterSlotCard` if it would only forward a large, unstable prop bag. Prefer preserving the current component boundaries unless a specific maintenance problem appears.

## Future candidates

Only revisit these if there is a clear maintenance need:

- `OpenRouterSlotCard`, if it can reduce complexity without creating excessive prop forwarding.
- OpenRouter storage/job hooks, but only with dedicated tests and a separate design plan.
- Additional shared type cleanup, if repeated imports or circular dependencies appear.

## Tests and guards

Existing relevant tests:

- `tests/openRouterGenerationPrompt.test.ts`
- `tests/LowLatencyTextareaContract.test.ts`
- `tests/buildInfo.test.ts`

Before moving OpenRouter logic beyond UI composition, add or review tests for:

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

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
2. `OpenRouterSlotSelector` - done.
3. `OpenRouterPromptControls` - done.
4. `OpenRouterModelSelector` - done.
5. `OpenRouterGenerateSummary` - done.
6. `OpenRouterGenerateActionPanel` - done.
7. `OpenRouterGeneratedOutputPanel` - done.
8. Re-measure `App.tsx` and `src/components/openrouter/*.tsx` before deciding the next extraction.
9. `OpenRouterSlotCard` - evaluate after measurement.
10. `OpenRouterWorkspace` - later.

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

## Completed: OpenRouterSlotSelector

Boundary: browser UI controls.

Status: done.

File:

```text
src/components/openrouter/OpenRouterSlotSelector.tsx
```

Extracted from the generated-session setup area inside `OpenRouterWorkspace`.

Preserved behavior:

- slot option labels from `getOpenRouterSlotLabel(slotId)`;
- active-slot styling and `aria-pressed`;
- status text for ready, needs-fix, draft-saved, and empty states;
- slot selection callback ownership in `OpenRouterWorkspace`;
- validation and slot state calculation outside the presentational component.

This extraction did not move generation, prompt building, slot persistence, import behavior, durable jobs, polling, localStorage, API routes, access checks, adaptive behavior, or training UI.

## Completed: OpenRouterPromptControls

Boundary: browser UI controls.

Status: done.

File:

```text
src/components/openrouter/OpenRouterPromptControls.tsx
```

Extracted from the generate-section controls inside `OpenRouterWorkspace`.

Preserved behavior:

- input mode selector;
- duration selector;
- language selector;
- prompt source selector;
- active styling and `aria-pressed`;
- button labels, descriptions, and titles;
- selection callback ownership in `OpenRouterWorkspace`.

This extraction did not move prompt construction, generation, durable jobs, polling, validation, localStorage, API routes, access checks, adaptive behavior, or training UI.

## Completed: OpenRouterModelSelector

Boundary: browser UI controls.

Status: done.

File:

```text
src/components/openrouter/OpenRouterModelSelector.tsx
```

Extracted from the Free Models section body inside `OpenRouterWorkspace`.

Preserved behavior:

- model refresh/status display;
- model error display;
- model option rendering;
- selected default model display and update callback;
- assigned model hinting;
- refresh and set-default callbacks remaining owned by `OpenRouterWorkspace`.

This extraction did not move model fetch lifecycle, model normalization, free-model gating, default-model storage semantics, access checks, API routes, durable jobs, polling, localStorage, adaptive behavior, or training UI.

## Completed: OpenRouterGenerateSummary

Boundary: browser UI display only.

Status: done.

File:

```text
src/components/openrouter/OpenRouterGenerateSummary.tsx
```

Extracted from the generate-section summary area inside `OpenRouterWorkspace`.

Preserved behavior:

- target, benchmark, feedback, duration, and prompt-size metrics;
- missing benchmark and missing session-feedback hints;
- read-only `Prompt sent to OpenRouter` textarea;
- visual order by accepting prompt controls as children.

This extraction did not move prompt construction, generation, durable jobs, polling, validation, localStorage, API routes, access checks, adaptive behavior, or training UI.

## Completed: OpenRouterGenerateActionPanel

Boundary: browser UI action display + callback.

Status: done.

File:

```text
src/components/openrouter/OpenRouterGenerateActionPanel.tsx
```

Extracted from the generate-section action area inside `OpenRouterWorkspace`.

Preserved behavior:

- generate button wrapper and class names;
- disabled state owned by `OpenRouterWorkspace`;
- Requesting, Generating, and Generate slot-label text;
- current-model hint and missing-default-model hint;
- generate callback ownership outside the presentational component.

This extraction did not move generation requests, durable jobs, polling, prompt construction, validation, slot persistence, localStorage, API routes, access checks, adaptive behavior, or training UI.

## Completed: OpenRouterGeneratedOutputPanel

Boundary: browser UI display only.

Status: done.

File:

```text
src/components/openrouter/OpenRouterGeneratedOutputPanel.tsx
```

Extracted from the generate-section output area inside `OpenRouterWorkspace`.

Preserved behavior:

- validation summary metrics for title, input mode, language, difficulty, phrases, and duration;
- generated DictationScript JSON textarea;
- raw model response textarea;
- JSON-before-raw rendering precedence;
- textarea labels, rows, and read-only behavior.

This extraction did not move script validation, create/import behavior, generation requests, durable jobs, polling, prompt construction, slot persistence, localStorage, API routes, access checks, adaptive behavior, or training UI.

## Next: measure and reassess

Before extracting another OpenRouter component, measure the current file sizes:

```powershell
(Get-Content src/App.tsx).Count
Get-ChildItem src/components/openrouter/*.tsx | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName).Count)" }
```

Use those numbers to decide whether `OpenRouterSlotCard` would still reduce complexity cleanly or whether the next useful move is planning/extracting `OpenRouterWorkspace` itself.

## Candidate: OpenRouterSlotCard

Boundary: browser UI display + callbacks.

Likely responsibilities:

- compose generated-slot status, summary, actions, and output panels;
- render one generated variant slot;
- surface slot-level errors and metadata.

Rules:

- Do not move slot persistence in the first extraction.
- Do not move generate/import behavior in the first extraction.
- Do not move generation requests, durable jobs, or polling.
- Pass callbacks from `App.tsx` or `OpenRouterWorkspace`.
- Preserve slot ids and labels exactly.
- Avoid creating a component that only forwards a large, unstable prop bag.

## Candidate: OpenRouterWorkspace

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

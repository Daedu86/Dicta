# Runtime input workspaces modularization plan

## Status

Planning only. Do not move code in this pass.

The next high-value area in `src/App.tsx` appears to be the runtime input workspace/render branch rather than another already-isolated top-level workspace.

Current `src/App.tsx` size on `main` after the adaptive benchmark workspace extraction:

```text
10,919 lines
```

## Scope

This plan covers the inline runtime UI still owned by `App.tsx`, especially:

- input setup/sidebar panels for Input #1 audio, Input #2 browser TTS, Input #3 Kokoro, and Input #4 CosyVoice/Qwen cache flows;
- `workspaceMode === 'tts'` runtime UI;
- `workspaceMode === 'kokoro'` runtime UI;
- shared runtime practice controls, textareas, metrics panels, submit/reset actions, and generation shortcuts;
- the bottom live-metrics/insights area that is still embedded in the main render branch.

This pass should not touch already-closed areas:

- Training UI under `src/components/training/`;
- OpenRouter UI under `src/components/openrouter/`;
- Admin UI under `src/components/admin/`;
- Session dashboard under `src/components/session-dashboard/`;
- Adaptive benchmark workspace under `src/components/adaptive-workspace/`.

## Why this is the next candidate

After the recent extraction passes, the remaining large JSX is concentrated around runtime input workflows. The code still mixes:

- UI markup;
- audio/TTS/Kokoro/CosyVoice controls;
- typing textareas;
- adaptive runtime metrics;
- submit/reset controls;
- generation shortcuts;
- local-dev-only guards;
- mobile/desktop affordances;
- bottom live metrics and insights.

The UI can likely be reduced without moving the underlying behavior, but the state and handler surface is large enough that this needs careful planning before extraction.

## Guardrails

Do not change behavior.

Do not modify:

- adaptive pacing semantics;
- `(inputMode, language)` semantics;
- audio playback behavior;
- Browser TTS playback/seek/pause/resume/stop behavior;
- Kokoro playback/pacing/replay behavior;
- CosyVoice/Qwen cache behavior;
- local-dev feature gating;
- submit/reset behavior;
- OpenRouter generation shortcuts;
- session persistence or sync;
- localStorage keys or restoration behavior;
- Supabase/auth/security behavior;
- already extracted Training/OpenRouter/Admin/SessionDashboard/AdaptiveWorkspace components.

Keep app-level state, audio engines, controllers, adaptive updates, persistence, and side effects in `App.tsx` unless a later plan explicitly proves a narrower safe boundary.

## Candidate extraction order

Use small commits. Prefer UI-only components with explicit props.

### 1. Runtime workspace plan/update only

Create and maintain this plan. Measure line counts before moving code.

### 2. Extract shared runtime header/actions only if low risk

Possible target:

```text
src/components/runtime-workspaces/RuntimeWorkspaceHeader.tsx
```

Scope:

- runtime header text;
- back-to-sessions button;
- static metadata.

Do not move playback logic.

### 3. Extract browser TTS source card

Possible target:

```text
src/components/runtime-workspaces/BrowserTtsSourceCard.tsx
```

Scope:

- source media player markup;
- TTS source text box;
- source metadata display.

Keep handlers and state in `App.tsx` and pass them as props:

- `playTts`
- `pauseTts`
- `resumeTts`
- `stopTtsPlayback`
- `seekTtsPlayback`

### 4. Extract browser TTS practice card

Possible target:

```text
src/components/runtime-workspaces/BrowserTtsPracticeCard.tsx
```

Scope:

- typing textarea;
- runtime metrics panel usage;
- submit/reset/action buttons;
- summary metrics.

Keep evaluation/submission logic in `App.tsx`.

### 5. Extract Kokoro runtime cards

Possible targets:

```text
src/components/runtime-workspaces/KokoroSourceCard.tsx
src/components/runtime-workspaces/KokoroPracticeCard.tsx
```

Keep local service checks, playback handlers, sidecar calls, pacing behavior, and submission logic in `App.tsx`.

### 6. Extract Input #4/CosyVoice setup/runtime cards only after TTS/Kokoro are stable

Input #4 has local-only sidecar/cache behavior. Keep it later.

### 7. Extract bottom live metrics / insights only after runtime workspaces are stable

Possible target:

```text
src/components/runtime-workspaces/LiveMetricsDock.tsx
```

This area uses live range state, last-session summaries, insights fallback reports, and workspace-mode-dependent bottom player display. Extract after smaller runtime cards are stable.

## Validation requirements

For every code patch:

```bash
npm run test -- --reporter=verbose
npm run build
```

For docs-only plan updates, runtime validation is not required, but the diff should stay under `docs/`.

## Stop conditions

Stop and reconsider if:

- a proposed component requires a huge unstable prop bag;
- handler movement touches audio/adaptive/persistence side effects;
- TypeScript forces broad exported `App.tsx` types;
- the diff touches already closed UI areas;
- a build failure requires behavior changes outside the extraction boundary.

## Recommended next action

Before moving code, run a local measurement pass to map the exact line ranges for:

- Input setup/sidebar branch;
- browser TTS workspace branch;
- Kokoro workspace branch;
- Input #4/CosyVoice branch;
- bottom live metrics/insights branch.

Then pick the smallest UI-only card and extract it in a dedicated commit.

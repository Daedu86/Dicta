# Runtime input workspaces modularization plan

## Status

Runtime input setup/card extraction is complete enough for the originally selected UI-only cards. Do not choose another runtime extraction without a fresh, narrow boundary.

Current `src/App.tsx` size on `main` after the `SessionCreateCard` extraction pass:

```text
9,548 lines
```

Completed runtime/setup extractions:

```text
src/components/runtime-workspaces/BrowserTtsSourceCard.tsx
src/components/runtime-workspaces/BrowserTtsPracticeCard.tsx
src/components/runtime-workspaces/BrowserTtsSetupCard.tsx
src/components/runtime-workspaces/KokoroSourceCard.tsx
src/components/runtime-workspaces/KokoroPracticeCard.tsx
src/components/runtime-workspaces/KokoroSetupCard.tsx
src/components/runtime-workspaces/Input4SetupCard.tsx
src/components/runtime-workspaces/AudioInputSetupCard.tsx
src/components/runtime-workspaces/SessionCreateCard.tsx
src/components/runtime-workspaces/LiveMetricsDock.tsx
```

Measurement references:

```text
docs/runtime-render-measurement.md
docs/runtime-render-measurement-after-session-create.md
```

## Current next candidate

```text
None selected from the runtime plan.
```

The latest measurement says the runtime setup/card pass should pause. The remaining large inline areas are no longer simple runtime setup/sidebar cards.

If continuing with a small runtime-only patch, the safest possible candidate is:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

but it is behavior-adjacent because it touches the audio player/ref, transcript segment display, and finish-on-ended lifecycle. Keep audio refs, playback/session handlers, transcript derivation, metrics, persistence, and sync in `App.tsx`.

If continuing with meaningful App.tsx reduction, start a separate plan for:

```text
docs/leaderboard-workspace-modularization.md
src/components/leaderboard/LeaderboardWorkspace.tsx
```

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

New runtime workspace components must stay UI-only/presentational with explicit props. Keep handlers and state in `App.tsx`.

## Completed extraction sequence

Use this list as the closeout for the runtime setup/card pass:

1. `BrowserTtsSourceCard.tsx`
2. `BrowserTtsPracticeCard.tsx`
3. `KokoroSourceCard.tsx`
4. `KokoroPracticeCard.tsx`
5. `Input4SetupCard.tsx`
6. `BrowserTtsSetupCard.tsx`
7. `KokoroSetupCard.tsx`
8. `LiveMetricsDock.tsx`
9. `AudioInputSetupCard.tsx`
10. `SessionCreateCard.tsx`

## Remaining runtime-adjacent candidates

### AudioSourceCard

Possible target:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

Status: possible but not auto-selected.

Risk: medium-high.

Reason: the source card is a display/player wrapper, but it includes `<audio ref={audioRef}>`, `onTimeUpdate`, and `onEnded`. Extract only if the component receives refs/callbacks explicitly and App.tsx keeps all playback/session lifecycle behavior.

### AudioPracticeCard

Possible target:

```text
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Status: possible but not auto-selected.

Risk: medium-high.

Reason: practice controls touch `startSession`, `pauseSession`, `finishSession`, `resetSession`, typing state, ready checklist, active/next transcript cues, and runtime metrics. Extract only after `AudioSourceCard` is stable, if still worthwhile.

### RuntimeWorkspaceHeader

Possible target:

```text
src/components/runtime-workspaces/RuntimeWorkspaceHeader.tsx
```

Status: possible but low value.

Risk: low.

Reason: the remaining duplication is small after the runtime card extractions.

## Better next non-runtime plan

Recommended planning target:

```text
docs/leaderboard-workspace-modularization.md
```

Rationale: the leaderboard is now one of the clearer remaining top-level App.tsx render areas. It is not a runtime input workspace, so it should not be extracted under this plan.

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

Do not extract another runtime component immediately. Create a leaderboard-specific modularization plan, or deliberately choose `AudioSourceCard` only if the goal is a small runtime follow-up and the audio ref boundary is kept explicit.

# Runtime render measurement after SessionCreateCard

_Last measured: 2026-06-03_

This is a docs-only measurement after `SessionCreateCard` was extracted and `src/App.tsx` reached:

```text
9,548 lines
```

The goal is to avoid continuing App.tsx extraction blindly. The previous runtime/setup sequence removed most of the clean UI-only cards, so the remaining candidates now need clearer ownership decisions.

## Completed runtime/setup extraction set

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

## Current reading

The runtime input workspace pass is now complete enough for the originally obvious UI-only cards. There are still inline JSX regions in `src/App.tsx`, but they are no longer all runtime setup/sidebar cards. The remaining large areas mix workspace ownership, derived state, audio refs, adaptive diagnostics, or leaderboard behavior.

## Remaining candidates

### 1. Input #1 audio runtime workspace

Approximate area:

```text
src/App.tsx:7900-8070
```

Observed UI:

- audio source panel;
- `<audio ref={audioRef}>` source player;
- transcript segment list;
- Start/Pause/Finish/Reset practice controls;
- ready checklist;
- active/next transcript cues;
- typing textarea;
- `RuntimeMetricsPanel`.

Possible split:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Risk: medium-high.

Reason: this is the most obvious App.tsx reduction target, but it is closer to runtime behavior than previous setup cards. It touches audio refs, playback lifecycle, finish/reset controls, active transcript segment state, typing state, and metrics. Extract only one sub-card at a time and keep refs, playback/session handlers, transcript derivation, metrics, persistence, and sync in `App.tsx`.

Recommended if continuing runtime work: start with `AudioSourceCard`, not `AudioPracticeCard`, because the source card is closer to a pure display/player wrapper. Keep `audioRef`, `setCurrentAudioTime`, and `finishSession` in `App.tsx` and pass them as props/callbacks.

### 2. Runtime workspace headers

Approximate area:

```text
src/App.tsx:7200-7400
```

Observed UI:

- Browser TTS/Input #4 workspace header;
- Kokoro workspace header;
- back-to-sessions controls;
- static workspace copy;
- Kokoro Adaptive Pace Layer shortcut.

Possible target:

```text
src/components/runtime-workspaces/RuntimeWorkspaceHeader.tsx
```

Risk: low.

Value: low.

Reason: extraction is likely safe, but the line-count win is small and there are subtle differences between Browser TTS/Input #4 and Kokoro. Do this only as cleanup, not as a major reduction step.

### 3. Adaptive advanced diagnostics

Approximate area:

```text
src/App.tsx:7300-7750
```

Observed UI:

- advanced diagnostics `<details>` shell;
- Central Brain panel;
- Architecture panel;
- Adapters panel;
- most recent run summary;
- latest pacing snapshot;
- semantic/debug counters;
- rate distribution chart.

Possible target:

```text
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

Risk: medium-high.

Reason: this is large and visually cohesive, but it belongs to the adaptive workspace, which had previously been marked complete enough. Do not move it as part of runtime cleanup. Open a dedicated adaptive follow-up plan first if this becomes the next priority.

### 4. Leaderboard workspace

Approximate area:

```text
src/App.tsx:7750-7900
```

Observed UI:

- leaderboard header;
- language tabs;
- collapse button;
- difficulty/range sections;
- session table rows;
- open dashboard/export/copy/delete actions.

Possible target:

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

Risk: medium.

Reason: this is a top-level workspace rather than runtime input UI. It is likely a better next major App.tsx reduction target than more runtime micro-splitting, but it deserves a dedicated leaderboard modularization plan before code moves.

### 5. Auth/sign-in route

Approximate area:

```text
src/App.tsx:6700-6810
```

Observed UI:

- sign-in card;
- forgot password form;
- update password form;
- profile-loading/auth-loading states.

Possible target:

```text
src/components/auth/AuthWorkspace.tsx
```

Risk: medium.

Reason: this UI is cohesive, but it touches Supabase auth state, password reset/update flows, local profile preparation, and sign-out behavior. It should be planned separately from runtime extraction.

## Recommendation

Do not select another code extraction automatically from the runtime plan.

Recommended next planning step:

```text
docs/leaderboard-workspace-modularization.md
```

Rationale: after the runtime card series, the remaining best App.tsx reduction candidate appears to be a separate top-level workspace, `LeaderboardWorkspace`, not another runtime setup card. The audio runtime workspace can still be split, but it is more behavior-adjacent because of audio refs and session lifecycle controls.

If the goal is maximum safety and small patches, choose:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

If the goal is the next meaningful App.tsx reduction with clearer ownership, create the leaderboard plan first, then extract:

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

## Stop conditions

Stop before code movement if:

- the component needs to own audio refs or mutate playback state internally;
- a prop surface becomes broader than the JSX it replaces;
- extraction touches adaptive controller updates, Supabase/auth/security, persistence, sync, or localStorage;
- the patch crosses runtime, adaptive, and leaderboard areas at once;
- tests/build failures require behavior changes.

## Validation for the next code patch

```bash
npm run test -- --reporter=verbose
npm run build
```

This measurement is docs-only; runtime validation is not required for this file.

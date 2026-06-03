# App.tsx measurement after AudioSourceCard

_Last measured: 2026-06-03_

This measurement now reflects the `AudioSourceCard` extraction.

Current `src/App.tsx` size reported by the implementation pass:

```text
9,660 lines
```

## Completed recent extraction chain

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
src/components/runtime-workspaces/AudioSourceCard.tsx
src/components/leaderboard/LeaderboardWorkspace.tsx
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

## Current reading

The main top-level workspace render branches are now mostly componentized. The Input #1 audio source display is extracted; remaining App.tsx JSX is concentrated in the Input #1 audio practice panel and the auth route. Both are behavior-adjacent, so any next extraction should be measured before selection.

## Remaining candidates

### Completed: Input #1 audio source card

Approximate area:

```text
src/App.tsx:7515-7548
```

Observed UI:

- source card wrapper;
- audio media player label;
- `<audio ref={audioRef}>` element;
- `controls` / `src={audioUrl}`;
- `onTimeUpdate` callback;
- `onEnded` callback;
- Whisper transcript heading;
- transcript segment list;
- active transcript segment highlighting;
- empty transcript state.

Possible target:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

Status: complete.

Completed scope:

- source card wrapper;
- audio media player label;
- `<audio ref={audioRef}>` element;
- `controls` / `src={audioUrl}`;
- `onTimeUpdate` callback passed from `App.tsx`;
- `onEnded` callback passed from `App.tsx`;
- Whisper transcript heading;
- transcript segment list;
- active transcript segment highlighting;
- empty transcript state.

App-owned behavior stayed in `src/App.tsx`: audio ref ownership, audio URL derivation, time update callback, finish-on-ended callback, transcript segment derivation, active segment index derivation, persistence, and sync.

### 1. Input #1 audio practice card

Approximate area:

```text
src/App.tsx:7555-7628
```

Observed UI:

- Start/Pause/Finish/Reset controls;
- ready checklist;
- active/next transcript cues;
- keyboard profile label;
- typing textarea;
- `RuntimeMetricsPanel`.

Possible target:

```text
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Risk: high.

Rationale: this is behavior-adjacent because it touches session lifecycle controls, typing state, ready-state display, transcript cues, and live metrics. Treat this only as possible after measurement, not as an automatic next extraction.

### 2. Auth/sign-in route

Approximate area:

```text
src/App.tsx:6600-6810
```

Observed UI:

- sign-in panel;
- auth loading/profile loading/local storage preparation states;
- app profile error/sign-out branch;
- update-password form;
- forgot-password form;
- sign-in form.

Possible target:

```text
src/components/auth/AuthWorkspace.tsx
```

Risk: medium-high.

Rationale: cohesive UI, but it touches Supabase auth flows, password update/reset, sign-in, sign-out, profile loading, and local storage readiness. Plan separately. Do not choose before the smaller audio source card unless auth maintainability becomes the priority.

### 3. Runtime workspace headers

Approximate area:

```text
src/App.tsx:7080-7240
```

Possible target:

```text
src/components/runtime-workspaces/RuntimeWorkspaceHeader.tsx
```

Risk: low.

Rationale: safe but low value. Not recommended as the next size-reduction step.

### 4. AdminWorkspace second pass

Observed area:

```text
src/App.tsx after main App return
```

Risk: high.

Rationale: Admin UI cards are extracted, but `AdminWorkspace` still owns local admin form state and sensitive admin calls. It was previously marked complete enough / closed. Do not reopen without a dedicated second-pass admin state plan.

## Recommendation

Recommended next step:

```text
Measure the remaining Input #1 audio runtime branch before deciding whether AudioPracticeCard is worth extracting.
```

Use the dedicated plan before any later audio-runtime code move:

```text
docs/audio-runtime-workspace-modularization.md
```

Do not mark `AudioPracticeCard` as the next automatic extraction; it is only possible after measurement.

## Stop conditions

Stop before moving code if:

- the component would need to own audio refs internally rather than receiving them explicitly;
- audio playback lifecycle behavior changes;
- `finishSession`, `setCurrentAudioTime`, transcript segment derivation, active segment index derivation, persistence, or sync moves out of `App.tsx`;
- the patch touches Browser TTS, Kokoro, Input #4, OpenRouter, Admin, auth, API routes, or adaptive controller logic;
- tests/build failures require behavior changes.

## Validation for future code patches

```bash
npm run test -- --reporter=verbose
npm run build
wc -l src/App.tsx
git diff --stat
git status --short
```

This measurement was updated with the AudioSourceCard extraction pass.

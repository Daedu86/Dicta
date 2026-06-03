# App.tsx measurement after AdaptiveAdvancedDiagnostics

_Last measured: 2026-06-03_

This is a docs-only measurement after `AdaptiveAdvancedDiagnostics` was extracted.

Current `src/App.tsx` size reported by the implementation pass:

```text
9,099 lines
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
src/components/leaderboard/LeaderboardWorkspace.tsx
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

## Current reading

The main top-level workspace render branches are now mostly componentized. The largest remaining App.tsx JSX is concentrated in the default Input #1 audio runtime branch and the auth route. Both are behavior-adjacent, so any next extraction should be narrow.

## Remaining candidates

### 1. Input #1 audio source card

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

Risk: medium-high.

Rationale: this is the safest remaining runtime extraction because it is mostly display, but it is still behavior-adjacent due to the `audioRef`, `onTimeUpdate`, and `onEnded` lifecycle callbacks. Extract only this source card first. Keep the ref and callbacks owned by `App.tsx` and pass them explicitly.

Recommendation: next code extraction after reading `docs/audio-runtime-workspace-modularization.md`.

### 2. Input #1 audio practice card

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

Rationale: this is behavior-adjacent because it touches session lifecycle controls, typing state, ready-state display, transcript cues, and live metrics. Do not extract until `AudioSourceCard` is stable.

### 3. Auth/sign-in route

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

### 4. Runtime workspace headers

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

### 5. AdminWorkspace second pass

Observed area:

```text
src/App.tsx after main App return
```

Risk: high.

Rationale: Admin UI cards are extracted, but `AdminWorkspace` still owns local admin form state and sensitive admin calls. It was previously marked complete enough / closed. Do not reopen without a dedicated second-pass admin state plan.

## Recommendation

Recommended next code extraction:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

Use the dedicated plan first:

```text
docs/audio-runtime-workspace-modularization.md
```

Do not extract `AudioPracticeCard` yet.

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

This measurement is docs-only; runtime validation is not required for this file.

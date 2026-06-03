# Audio runtime workspace modularization plan

_Last updated: 2026-06-03_

## Status

First pass complete. `AudioSourceCard.tsx` is extracted as a UI-only/presentational component.

This plan covers the remaining inline default Input #1 audio runtime workspace branch in `src/App.tsx` after the runtime setup/sidebar, leaderboard, and adaptive advanced diagnostics extractions.

Current `src/App.tsx` size after the AudioSourceCard pass:

```text
9,660 lines
```

## Completed first target

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

## Possible later target, only after measurement

```text
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

## Why this candidate

The latest post-adaptive-diagnostics measurement identifies the default Input #1 audio runtime branch as the clearest remaining runtime UI area.

The branch should be split in two passes because the source card is mostly display/player UI, while the practice card touches session lifecycle controls and typing state.

## Current approximate ranges

Source card:

```text
extracted to src/components/runtime-workspaces/AudioSourceCard.tsx
```

Practice card:

```text
src/App.tsx:7555-7628
```

Actual lines may drift. Re-measure immediately before implementation.

## AudioSourceCard scope

Moved only this visual source card:

- `<section className="panel workspace-panel tts-source-panel tall-panel">`;
- `Audio source` heading;
- media player label;
- `<audio>` element;
- `Whisper transcript` heading;
- transcript segment list;
- active transcript segment highlighting;
- empty transcript state.

Keep in `App.tsx`:

- `audioRef` ownership;
- `audioUrl` state/derivation;
- `setCurrentAudioTime` callback;
- `finishSession` callback;
- transcript segment derivation;
- active transcript segment index derivation;
- `formatTimestamp` helper unless already stable/importable;
- playback/session lifecycle behavior;
- persistence/sync.

Pass explicit props/callbacks to the component.

Completed component:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

`App.tsx` still owns the audio ref, audio URL derivation, `setCurrentAudioTime`, `finishSession`, transcript segment derivation, active segment index derivation, `formatTimestamp`, playback/session lifecycle behavior, persistence, and sync.

## AudioPracticeCard scope, later only

Do not extract in the first patch.

Possible later scope:

- Start/Pause/Finish/Reset controls;
- ready checklist;
- success/error/hint messages;
- active/next transcript cues;
- keyboard profile label;
- typing textarea;
- `RuntimeMetricsPanel`.

Keep in `App.tsx`:

- `startSession`;
- `pauseSession`;
- `finishSession`;
- `resetSession`;
- `onTypingChange`;
- `onTypingKeyDown`;
- live metrics derivation;
- active/next transcript segment derivation;
- persistence/sync.

## Risk level

AudioSourceCard risk: medium-high.

AudioPracticeCard risk: high.

The source card is safer but still behavior-adjacent because it contains the `<audio>` element and lifecycle callbacks. It is acceptable only if the ref and callbacks remain owned by `App.tsx`.

## Do not change

Do not change:

- audio playback behavior;
- finish-on-ended behavior;
- `onTimeUpdate` behavior;
- active segment highlighting;
- transcript list order;
- visible copy;
- class names;
- audio element attributes;
- practice controls;
- typing behavior;
- adaptive runtime metrics;
- persistence/sync/localStorage.

## Expected AudioSourceCard props

Data props:

- `audioRef`
- `audioUrl`
- `transcriptSegments`
- `activeTranscriptSegmentIndex`

Callbacks:

- `onTimeUpdate`
- `onEnded`

Helpers:

- `formatTimestamp`

Types:

- Use a narrow local structural transcript segment type based on fields rendered: `start`, `end`, `text`.
- Do not export App-local session types.

## Recommended extraction strategy

### Step 1: AudioSourceCard

Create:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

Move only the audio source panel JSX.

Do not move practice panel JSX.

### Step 2: measure again

After AudioSourceCard is stable, re-measure before deciding whether `AudioPracticeCard` is worth extracting.

### Step 3: AudioPracticeCard, optional later

Only if measurement shows it is worth doing and the prop surface stays reasonable.

## Validation

For any code patch:

```bash
npm run test -- --reporter=verbose
npm run build
wc -l src/App.tsx
git diff --stat
git status --short
```

## Stop conditions

Stop and do not extract if:

- the component needs to own `audioRef` internally;
- TypeScript forces broad App-local session types into the component;
- the diff changes playback/session lifecycle behavior;
- the diff touches Browser TTS, Kokoro, Input #4, OpenRouter, Admin, auth, API routes, adaptive controller logic, persistence, or sync;
- tests/build failures require behavior changes.

## Recommendation

AudioSourceCard is complete. Next step:

```text
Measure before deciding whether AudioPracticeCard is worth extracting.
```

Do not treat `AudioPracticeCard` as an automatic next extraction.

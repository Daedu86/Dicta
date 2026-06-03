# Audio runtime workspace modularization plan

_Last updated: 2026-06-03_

## Status

First pass complete. `AudioSourceCard.tsx` is extracted as a UI-only/presentational component.

This plan covers the remaining inline default Input #1 audio runtime workspace branch in `src/App.tsx` after the runtime setup/sidebar, leaderboard, and adaptive advanced diagnostics extractions.

Current `src/App.tsx` size after the AudioSourceCard pass:

```text
9,660 lines
```

Latest measurement:

```text
docs/app-post-audio-source-measurement.md
```

## Completed first target

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

`App.tsx` still owns the audio ref, audio URL derivation, `setCurrentAudioTime`, `finishSession`, transcript segment derivation, active segment index derivation, `formatTimestamp`, playback/session lifecycle behavior, persistence, and sync.

## Current candidate after measurement

```text
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Risk: high.

The post-AudioSourceCard measurement confirms that `AudioPracticeCard` is viable but more behavior-adjacent than the source card. It should only be extracted as a UI-only component with strict props.

## AudioPracticeCard scope

Move only this visual practice panel:

- `<section className="panel workspace-panel accent-panel">`;
- `How can I help you train today?` heading;
- Start/Pause/Finish/Reset controls;
- session-ready banner;
- ready checklist chips;
- export/success/finished messages;
- setup-required hint;
- active transcript cue;
- next transcript cue;
- keyboard profile indicator;
- typing textarea;
- `RuntimeMetricsPanel` usage.

Keep in `App.tsx`:

- `startSession`;
- `pauseSession`;
- `finishSession`;
- `resetSession`;
- `onTypingChange`;
- `onTypingKeyDown`;
- ready checklist derivation;
- active/next transcript segment derivation;
- live metrics derivation;
- `RuntimeMetricsPanel` definition/import ownership unless it is already stable;
- persistence/sync/localStorage.

## Expected AudioPracticeCard props

Data/state:

- `canStartSession`
- `canPauseSession`
- `canFinishSession`
- `activeSessionFinished`
- `readyChecklist`
- `exportMessage`
- `trainingSubmitMessage`
- `activeTranscriptSegment`
- `nextTranscriptSegment`
- `transcriptPreview`
- `keyboardProfileLabel`
- `keyboardProfile`
- `inputText`
- `controllerState`
- `rate`
- `lagSec`
- `lagWords`
- `wpm`
- `visibleAccuracy`

Callbacks:

- `onStartSession`
- `onPauseSession`
- `onFinishSession`
- `onResetSession`
- `onTypingChange`
- `onTypingKeyDown`

Helpers/components:

- `formatTimestamp`
- `RuntimeMetricsPanelComponent`, unless importable cleanly

Types:

- use narrow local structural types for ready checklist items and transcript segments;
- do not export broad App-local session types.

## Do not change

Do not change:

- audio playback behavior;
- session lifecycle behavior;
- finish behavior;
- pause behavior;
- reset behavior;
- typing behavior;
- ready checklist semantics;
- active/next transcript cue semantics;
- adaptive runtime metrics;
- visible copy;
- class names;
- textarea attributes;
- persistence/sync/localStorage.

## Recommended extraction strategy

### Step 1: AudioSourceCard

Status: complete.

### Step 2: AudioPracticeCard

Status: evaluated and possible, but high risk.

Create:

```text
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Move only the practice panel JSX.

Do not move data derivation, callbacks, metrics derivation, transcript derivation, or persistence/sync.

### Step 3: stop and re-measure

After AudioPracticeCard, stop and measure before choosing another extraction.

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

- the component would own session lifecycle behavior internally;
- the component would derive transcript or metrics state internally;
- `RuntimeMetricsPanel` movement causes broad type exports;
- TypeScript requires broad App-local session types;
- the diff touches Browser TTS, Kokoro, Input #4, OpenRouter, Admin, auth, API routes, adaptive controller logic, persistence, or sync;
- tests/build failures require behavior changes.

## Recommendation

If continuing runtime cleanup, proceed only with:

```text
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Keep the extraction UI-only and stop for a fresh measurement afterward.

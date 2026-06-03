# App.tsx measurement after AudioSourceCard

_Last measured: 2026-06-03_

This is a docs-only measurement after `AudioSourceCard` was extracted.

Current `src/App.tsx` size reported by the implementation pass:

```text
9,660 lines
```

## Current reading

`AudioSourceCard` is extracted and the source/player/transcript list is no longer inline in `App.tsx`.

The remaining default Input #1 audio runtime branch is now the practice panel. It is compact but behavior-adjacent because it renders session lifecycle controls, typing state, live cues, ready-state messages, and runtime metrics.

## Remaining Input #1 audio runtime candidate

### AudioPracticeCard

Approximate current area:

```text
src/App.tsx:7555-7624
```

Observed UI:

- practice panel wrapper;
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
- `RuntimeMetricsPanel`.

Possible target:

```text
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Risk: high.

Rationale: this is no longer just display markup. The controls call `startSession`, `pauseSession`, `finishSession`, and `resetSession`. The textarea calls `onTypingChange` and `onTypingKeyDown`. The panel also displays derived ready checklist state, active/next transcript cues, live metrics, and success/error state.

## Prop surface evaluation

The prop surface is broad but still potentially acceptable if all behavior stays in `App.tsx`.

Expected props include:

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

## Recommendation

`AudioPracticeCard` is viable but should be treated as a high-risk UI-only extraction, not a routine card move.

Recommended next code extraction if continuing runtime cleanup:

```text
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Only proceed if the implementer keeps all session lifecycle, typing behavior, metrics derivation, transcript derivation, persistence, and sync in `App.tsx`.

Alternative: stop runtime extraction here and plan `AuthWorkspace` separately if auth UI maintainability becomes more important.

## Stop conditions

Stop before moving code if:

- the component would own session lifecycle behavior internally;
- the component would derive transcript or metrics state internally;
- `RuntimeMetricsPanel` movement causes broad type exports;
- TypeScript requires broad App-local session types;
- the diff touches Browser TTS, Kokoro, Input #4, OpenRouter, Admin, auth, API routes, adaptive controller logic, persistence, or sync;
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

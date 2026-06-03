# Runtime render measurement

_Last measured: 2026-06-03_

This is a docs-only measurement pass after the runtime workspace extraction series. It should guide the next modularization patch, not move code by itself.

## Current App.tsx size

```text
10,103 lines
```

## Measurement summary

The previously selected runtime UI cards are complete:

```text
src/components/runtime-workspaces/BrowserTtsSourceCard.tsx
src/components/runtime-workspaces/BrowserTtsPracticeCard.tsx
src/components/runtime-workspaces/BrowserTtsSetupCard.tsx
src/components/runtime-workspaces/KokoroSourceCard.tsx
src/components/runtime-workspaces/KokoroPracticeCard.tsx
src/components/runtime-workspaces/KokoroSetupCard.tsx
src/components/runtime-workspaces/Input4SetupCard.tsx
src/components/runtime-workspaces/LiveMetricsDock.tsx
src/components/runtime-workspaces/AudioInputSetupCard.tsx
```

The remaining large inline areas in `src/App.tsx` are not all equal. Some are good UI-only candidates, while others need a dedicated plan because they mix derived state, session routing, or already-closed workspace ownership.

## Remaining inline candidates

### 1. Input #1 audio setup/sidebar

Status: complete.

Approximate range:

```text
src/App.tsx:7080-7175
```

Observed boundary:

- `activeInputMode === 'input1'` setup/sidebar branch;
- audio file picker;
- audio URL field and load button;
- transcription progress display;
- transcript JSON file picker;
- transcription language selector;
- Get transcription button;
- difficulty selector;
- input lock box;
- success/error messages.

Completed target:

```text
src/components/runtime-workspaces/AudioInputSetupCard.tsx
```

Completed reference:

```text
AudioInputSetupCard extraction completed in the implementation commit reported in the final summary.
```

Rationale: this was the cleanest remaining setup/sidebar card. It remained UI-only and kept audio loading, transcript generation, lock behavior, persistence, and sync in `App.tsx`.

### 2. Session creation/import dialog

Approximate range:

```text
src/App.tsx:6930-7080
```

Observed boundary:

- session source selector;
- plain-text session name and input-mode buttons;
- DictationScript JSON textarea;
- validation preview;
- create/cancel controls.

Completed target:

```text
src/components/runtime-workspaces/SessionCreateCard.tsx
```

Completed reference:

```text
SessionCreateCard extraction completed in the implementation commit reported in the final summary.
```

Risk: medium.

Rationale: the UI is cohesive, but it touches session creation mode, quota state, DictationScript validation, and create-session callbacks. The extraction kept those behaviors in `App.tsx` and moved only the presentational card.

### 3. Runtime workspace headers

Approximate ranges:

```text
src/App.tsx:7250-7400
```

Observed boundary:

- repeated Kokoro/Browser TTS workspace header patterns;
- back-to-sessions actions;
- static metadata/copy;
- Adaptive Pace Layer button for Kokoro.

Possible target:

```text
src/components/runtime-workspaces/RuntimeWorkspaceHeader.tsx
```

Risk: low, but low value.

Rationale: this was already listed as a possible low-risk target, but the remaining duplication is small after the source/practice card extractions. Do this only if cleanup value is clear.

### 4. Input #1 audio runtime workspace

Approximate range:

```text
src/App.tsx:8145-8258
```

Observed boundary:

- audio source panel;
- transcript segment list;
- input practice controls;
- ready banner;
- typing cues;
- textarea;
- RuntimeMetricsPanel.

Possible targets:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Risk: medium to high.

Rationale: this can reduce `App.tsx`, but it is closer to audio engine/session-control behavior than the setup sidebar. Keep refs, session controls, audio playback, finish/reset behavior, metrics, persistence, and sync in `App.tsx`.

### 5. Adaptive advanced diagnostics shell

Approximate range:

```text
src/App.tsx:7470-7840
```

Observed boundary:

- adaptive advanced diagnostics details shell;
- Central Brain panel;
- Architecture panel;
- Adapters panel;
- latest session summary;
- live pacing snapshot;
- semantic debug counters;
- AdaptiveBenchmarkSection already extracted below this area.

Possible target:

```text
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

Risk: medium to high.

Rationale: this is a large inline area, but it belongs to the adaptive workspace, which was previously marked complete enough. Do not extract it as part of runtime cleanup unless a dedicated adaptive follow-up plan is opened.

### 6. Leaderboard workspace

Approximate range:

```text
src/App.tsx:7985-8145
```

Observed boundary:

- leaderboard header;
- language tabs;
- collapse controls;
- section/range metrics;
- session table;
- action buttons.

Possible target:

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

Risk: medium.

Rationale: this is a separate top-level workspace rather than runtime input UI. It should be measured and planned separately if App.tsx reduction continues after runtime input cleanup.

## Recommended next extraction

Recommended next code patch:

```text
None selected. Run a fresh measurement before choosing another extraction.
```

Scope:

- extract only the session creation/import card;
- keep session creation mode state, quota state, DictationScript validation data derivation, manual/imported session creation callbacks, generated session creation, persistence, and sync in `App.tsx`;
- pass explicit props and callbacks;
- do not touch runtime audio practice, leaderboard, adaptive, admin, OpenRouter, Browser TTS, Kokoro, or Input #4.

## Stop conditions

Stop and reconsider if:

- the proposed component needs broad exported `App.tsx` types;
- TypeScript forces movement of audio/transcript generation logic;
- a patch touches adaptive, leaderboard, OpenRouter, admin, or sync/auth code;
- the prop surface becomes less clear than the inline branch;
- tests/build failures require behavior changes.

## Validation

For the next code patch:

```bash
npm run test -- --reporter=verbose
npm run build
```

For this docs-only measurement pass, runtime validation is not required.

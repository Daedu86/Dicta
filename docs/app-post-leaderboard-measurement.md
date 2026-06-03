# App.tsx measurement after LeaderboardWorkspace

_Last measured: 2026-06-03_

This is a docs-only measurement after `LeaderboardWorkspace` was extracted.

Current `src/App.tsx` size reported by the implementation pass:

```text
9,370 lines
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
```

## Current reading

The straightforward UI-only cards are mostly extracted. The remaining large `App.tsx` areas are more behavior-adjacent and should not be moved without specific plans.

## Remaining candidates

### 1. Adaptive advanced diagnostics

Approximate area:

```text
src/App.tsx:7290-7625
```

Observed UI:

- `workspaceMode === 'adaptive'` advanced diagnostics `<details>` shell;
- Central Brain panel;
- Architecture panel;
- Adapters panel;
- Most recent run panel;
- Latest pacing snapshot panel;
- semantic/debug counters;
- rate distribution bars;
- `AdaptiveBenchmarkSection` already extracted below this area.

Plan:

```text
docs/adaptive-advanced-diagnostics-modularization.md
```

Possible target:

```text
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

Risk: medium-high.

Rationale: this is the largest cohesive remaining render block, but it belongs to the adaptive workspace. It touches selected benchmark state, expanded-section state, latest session summaries, semantic debug data, telemetry counters, helper formatters, and scroll/focus behavior. A dedicated plan now exists and should be read before moving code.

Recommendation: best next major App.tsx reduction candidate, but only as a UI-only extraction with all adaptive state/data derivation staying in `App.tsx`.

### 2. Input #1 audio runtime workspace

Approximate area:

```text
src/App.tsx:7810-8005
```

Observed UI:

- audio source card;
- `<audio ref={audioRef}>` player;
- transcript segment list;
- Start/Pause/Finish/Reset controls;
- ready checklist;
- active/next transcript cues;
- input textarea;
- `RuntimeMetricsPanel`.

Possible split:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
src/components/runtime-workspaces/AudioPracticeCard.tsx
```

Risk: medium-high.

Rationale: a smaller runtime follow-up is possible, but the source card contains an audio ref and finish-on-ended lifecycle, while the practice card contains session lifecycle controls and typing state. If selected, extract `AudioSourceCard` first and keep refs/callbacks/lifecycle behavior in `App.tsx`.

Recommendation: safer as a small runtime follow-up than `AudioPracticeCard`, but lower impact than adaptive diagnostics.

### 3. Auth/sign-in route

Approximate area:

```text
src/App.tsx:6680-6815
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

Rationale: cohesive UI, but it touches Supabase auth flows, password update/reset, sign-in, sign-out, profile loading, and local storage readiness. Plan separately from UI cleanup.

### 4. Runtime workspace headers

Approximate area:

```text
src/App.tsx:7100-7235
```

Observed UI:

- Kokoro workspace header;
- Browser TTS/Input #4 workspace header;
- Back-to-sessions buttons;
- static workspace copy;
- Adaptive Pace Layer shortcut.

Possible target:

```text
src/components/runtime-workspaces/RuntimeWorkspaceHeader.tsx
```

Risk: low.

Rationale: safe but low value. Not recommended as the next App.tsx reduction step unless the goal is small cleanup rather than meaningful size reduction.

### 5. AdminWorkspace function still local to App.tsx

Observed area:

```text
src/App.tsx after main App return
```

Risk: high.

Rationale: Admin UI components are extracted, but `AdminWorkspace` itself still owns local admin form state and sensitive admin calls. It was previously marked complete enough / closed. Do not reopen without a dedicated second-pass admin state plan.

## Recommendation

Recommended next code extraction:

```text
src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx
```

Use the dedicated plan first:

```text
docs/adaptive-advanced-diagnostics-modularization.md
```

Fallback small extraction if the goal is lower-risk runtime cleanup:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

Do not extract `AudioPracticeCard`, `AuthWorkspace`, or Admin state yet.

## Stop conditions

Stop before moving code if:

- a component would need to own audio refs, Supabase auth mutation, adaptive controller mutation, persistence, or sync;
- the prop surface becomes broader than the JSX it replaces;
- helper movement changes formatting, scoring, ranking, pacing, or telemetry semantics;
- the patch crosses adaptive, runtime, auth, and admin boundaries in one commit;
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

# LeaderboardWorkspace modularization plan

_Last updated: 2026-06-03_

## Status

Planning/evaluation only. No code has moved under this plan yet.

`src/App.tsx` is currently around:

```text
9,548 lines
```

The runtime input setup/card extraction pass is complete enough. The next meaningful `App.tsx` reduction candidate is likely the leaderboard workspace, but the risk is higher than the previous runtime UI-only cards and must be evaluated before extraction.

## Proposed target

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

Optional support folder:

```text
src/components/leaderboard/
```

## Why this candidate

The leaderboard is one of the remaining large top-level render branches in `App.tsx`. It is visually cohesive and has clearer workspace ownership than small runtime header cleanup.

It currently includes:

- leaderboard header;
- language tabs;
- collapse/minimize controls;
- difficulty/range sections;
- aggregate range metrics;
- session table rows;
- open workspace/dashboard actions;
- export/copy/delete actions;
- empty states.

## Risk level

Risk: medium-high.

This is intentionally higher risk than the previous runtime card extractions because the leaderboard branch is not a simple presentational card. It touches derived leaderboard data, session readiness/status formatting, action callbacks, export/copy/delete behavior, active-session highlighting, language filtering, and route/workspace transitions.

## Evaluation required before code movement

Before extracting code, run a dedicated evaluation pass and verify:

1. Exact line range of the leaderboard branch in current `src/App.tsx`.
2. Full prop surface needed for `LeaderboardWorkspace`.
3. Whether props are acceptable or too broad.
4. Which helper functions must remain in `App.tsx`.
5. Whether any helper should move to a stable shared module before or after extraction.
6. Whether the extraction can stay UI-only.
7. Whether smaller child components are needed immediately or should wait.

Do not start code movement if the prop surface becomes larger or less clear than the inline branch.

## Boundary

Move only the leaderboard render branch to `LeaderboardWorkspace`.

Keep in `App.tsx`:

- leaderboard data derivation;
- session filtering/sorting/ranking;
- `leaderboardSections` construction;
- `leaderboardLanguageView` state;
- `leaderboardExpanded` state;
- `leaderboardSectionExpanded` state;
- workspace navigation state;
- dashboard session selection;
- session delete behavior;
- session export/copy behavior;
- session readiness/status derivation unless already in stable helpers;
- persistence/sync;
- auth/profile/access state.

Pass explicit props/callbacks to the new component.

## Do not change

Do not change:

- leaderboard ordering;
- language filtering semantics;
- difficulty/range grouping;
- score/points display;
- readiness styling;
- active-session highlighting;
- action button order;
- visible copy;
- class names;
- aria labels;
- titles/tooltips;
- export/copy/delete behavior;
- route/workspace behavior;
- session persistence or sync.

## Likely prop groups

Expected prop groups may include:

- data:
  - `leaderboard`
  - `leaderboardSections`
  - `leaderboardLanguageView`
  - `leaderboardExpanded`
  - `leaderboardSectionExpanded`
  - `activeSessionId`
  - `SUPPORTED_LANGUAGES` or stable supported language list
  - `LANGUAGE_LABELS` or a formatter
- callbacks:
  - `onChangeLeaderboardLanguageView`
  - `onToggleLeaderboardExpanded`
  - `onToggleLeaderboardSectionExpanded`
  - `onOpenWorkspaceForSession`
  - `onOpenDashboardForSession`
  - `onDownloadSessionSnapshot`
  - `onCopySessionSnapshot`
  - `onDeleteSession`
  - `onBackToTraining`
- formatting/helpers:
  - `formatLeaderboardSessionStatus`
  - `formatSessionGenerationOrigin`
  - `formatSessionPlaybackDuration`
  - `formatSessionDate`
  - `formatSessionPointsForSession`
  - `buildSessionScoreHelpText`
  - `buildSessionPointsHelpText`
  - `computeSessionMaxPoints`
  - `getSessionDisplayTitle`
  - `isSessionReadyForTraining`
  - `MetricComponent`
  - `SessionDeviceIconComponent` if local to `App.tsx`

This list must be verified against the current code before implementation.

## Possible extraction strategy

### Step 1: evaluation/docs only

Measure the current branch and write a short implementation checklist. No code movement.

### Step 2: single-component extraction

Create:

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

Move only the existing leaderboard branch JSX.

Keep helper movement out of this patch unless TypeScript requires a minimal stable type import.

### Step 3: optional child split later

Only after the first extraction is stable, consider splitting:

```text
src/components/leaderboard/LeaderboardHeader.tsx
src/components/leaderboard/LeaderboardSection.tsx
src/components/leaderboard/LeaderboardSessionRow.tsx
```

Do not create these child components in the first extraction unless the prop surface is clearly improved.

## Validation

For any code patch:

```bash
npm run test -- --reporter=verbose
npm run build
```

Recommended local review commands:

```bash
git diff --stat
git diff -- src/App.tsx src/components/leaderboard/LeaderboardWorkspace.tsx docs/app-modularization.md docs/leaderboard-workspace-modularization.md
wc -l src/App.tsx
git status --short
```

## Stop conditions

Stop and do not extract if:

- the required props become too broad or unstable;
- helper movement starts changing behavior;
- TypeScript requires exporting large `App.tsx`-local types;
- the diff touches runtime, adaptive, OpenRouter, Admin, auth, API routes, persistence, or sync;
- a build/test failure requires behavior changes;
- session ordering/filtering/ranking changes even slightly.

## Recommendation

Do not implement `LeaderboardWorkspace` until the evaluation confirms the prop surface is acceptable.

If the evaluation passes, extract `LeaderboardWorkspace` as one UI-only component, keeping all data derivation and side effects in `App.tsx`.

# LeaderboardWorkspace modularization plan

_Last updated: 2026-06-03_

## Status

Evaluated. Ready for one narrow UI-only extraction, with medium-high risk and strict guardrails.

No code has moved under this plan yet.

`src/App.tsx` is currently around:

```text
9,548 lines
```

The runtime input setup/card extraction pass is complete enough. The next meaningful `App.tsx` reduction candidate is the leaderboard workspace, but the risk is higher than the previous runtime UI-only cards.

## Proposed target

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

Support folder:

```text
src/components/leaderboard/
```

## Evaluation result

The evaluation found that the leaderboard branch is large enough to justify extraction and cohesive enough to move as a single presentational workspace.

Approximate current branch:

```text
src/App.tsx:7744-7961
```

Branch shape:

```tsx
workspaceMode === 'leaderboard' ? (
  <section className="panel workspace-panel leaderboard-workspace">
    ...
  </section>
)
```

Observed inline work inside the branch:

- leaderboard header;
- language tabs over `SUPPORTED_LANGUAGES`;
- collapse/minimize button;
- back button;
- empty-state copy;
- `leaderboardSections.map(...)`;
- per-section expanded-state lookup;
- range metrics panels;
- table header;
- per-session row rendering;
- readiness class derivation;
- status label/title derivation;
- score help-text derivation;
- action buttons for open, dashboard, export, copy, and delete.

## Risk level

Risk: medium-high.

This is higher risk than the previous runtime card extractions because the leaderboard branch is not a simple static card. It renders derived leaderboard sections, calls helper functions per row, and exposes destructive/export actions.

The risk is acceptable only if the extraction is UI-only and all data derivation and side effects remain in `App.tsx`.

## Prop surface evaluation

The prop surface is broad but acceptable for a single extraction because the branch already depends on a clear set of data, callbacks, and formatters.

Expected prop groups:

### Data props

- `leaderboard`
- `leaderboardSections`
- `leaderboardLanguageView`
- `leaderboardExpanded`
- `leaderboardSectionExpanded`
- `activeSessionId`
- `supportedLanguages`
- `languageLabels`

### Callback props

- `onChangeLeaderboardLanguageView`
- `onToggleLeaderboardExpanded`
- `onToggleLeaderboardSectionExpanded`
- `onOpenWorkspaceForSession`
- `onOpenDashboardForSession`
- `onDownloadSessionSnapshot`
- `onCopySessionSnapshot`
- `onDeleteSession`
- `onBackToTraining`

### Formatter/helper props

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
- `SessionDeviceIconComponent`

This prop surface is acceptable for the first pass. Do not split child components yet.

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
- all persistence/sync behavior;
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

## Extraction strategy

### Step 1: single-component extraction

Create:

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

Move only the existing leaderboard branch JSX.

Do not move helpers unless TypeScript requires minimal local types or stable imports.

Do not create child components in this patch.

### Step 2: optional child split later

Only after the first extraction is stable, consider splitting:

```text
src/components/leaderboard/LeaderboardHeader.tsx
src/components/leaderboard/LeaderboardSection.tsx
src/components/leaderboard/LeaderboardSessionRow.tsx
```

Do not create these child components in the first extraction.

## Implementation checklist for Codex

1. Pull latest `main`.
2. Re-read this plan and `docs/app-modularization.md`.
3. Locate the current `workspaceMode === 'leaderboard'` branch.
4. Create `src/components/leaderboard/LeaderboardWorkspace.tsx`.
5. Move only the leaderboard JSX into the new component.
6. Keep all state/data derivation/helpers/side effects in `App.tsx`.
7. Pass explicit props/callbacks.
8. Preserve class names, copy, aria labels, titles, button order, and render order.
9. Update this plan and `docs/app-modularization.md` after extraction.
10. Run tests/build.

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

- the required props become broader than the evaluated list above;
- helper movement starts changing behavior;
- TypeScript requires exporting large `App.tsx`-local types;
- the diff touches runtime, adaptive, OpenRouter, Admin, auth, API routes, persistence, or sync;
- a build/test failure requires behavior changes;
- session ordering/filtering/ranking changes even slightly.

## Recommendation

Proceed with a single-component extraction:

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

Do not split `LeaderboardHeader`, `LeaderboardSection`, or `LeaderboardSessionRow` yet. Keep the first patch as one UI-only extraction with explicit props and unchanged behavior.

# Leaderboard workspace modularization

## Status

Leaderboard workspace extraction is complete.

Completed commit:

```text
Extract LeaderboardWorkspace component
```

Target:

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

Scope kept in `App.tsx`:

- leaderboard data derivation;
- session filtering, sorting, ranking;
- leaderboardSections construction;
- leaderboardLanguageView state;
- leaderboardExpanded state;
- leaderboardSectionExpanded state;
- workspace navigation state;
- dashboard session selection;
- session delete behavior;
- session export/copy behavior;
- session readiness/status derivation;
- persistence/sync;
- auth/profile/access state;
- `setExportMessage`.

Props passed to the component stay explicit and presentational.

## Validation

Run after the extraction:

```bash
npm run test -- --reporter=verbose
npm run build
wc -l src/App.tsx
git diff --stat
git status --short
```

## Next step

Do not split child components yet. Re-evaluate later whether `LeaderboardHeader`, `LeaderboardSection`, or `LeaderboardSessionRow` are worth extracting.

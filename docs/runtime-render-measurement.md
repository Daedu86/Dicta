# Runtime render measurement

_Last measured: 2026-06-03_

This file points to the latest runtime/render measurement after the `SessionCreateCard` extraction.

Latest detailed measurement:

```text
docs/runtime-render-measurement-after-session-create.md
```

## Current App.tsx size

```text
9,548 lines
```

## Completed runtime/setup extraction set

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
```

## Current conclusion

The runtime input setup/card sequence is complete enough. The remaining large inline areas in `src/App.tsx` are no longer simple setup/sidebar cards. They are mostly:

- Input #1 audio runtime workspace;
- adaptive advanced diagnostics;
- leaderboard workspace;
- auth/sign-in route;
- small runtime workspace header duplication.

## Candidate posture

No code extraction is automatically selected from this file.

The safest small runtime continuation would be:

```text
src/components/runtime-workspaces/AudioSourceCard.tsx
```

The next larger App.tsx reduction candidate with clearer top-level ownership is likely:

```text
src/components/leaderboard/LeaderboardWorkspace.tsx
```

but it should start with a dedicated plan:

```text
docs/leaderboard-workspace-modularization.md
```

## Validation for future code patches

```bash
npm run test -- --reporter=verbose
npm run build
```

For docs-only measurement updates, runtime validation is not required.

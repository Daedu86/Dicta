# Next modularization pass

Updated: 2026-06-10

Branch: product/input-2

## Current checkpoint

CSS modularization is active.

src/App.css remains the runtime stylesheet, but it now imports src/styles/index.css at the top. src/styles/index.css is the ordered import list for CSS modules extracted from App.css.

This checkpoint includes the post-push dashboard/admin/adaptive pass through adaptive-workspace.css.

## Current CSS modularization metrics

- Remaining src/App.css: 2171 lines
- src/styles/index.css: 28 lines
- Extracted CSS module lines: 2628 lines
- Approximate extracted share: 54.4% of runtime CSS lines

Extracted modules:

- src/styles/adaptive-workspace.css (955 lines)
- src/styles/admin.css (149 lines)
- src/styles/auth.css (51 lines)
- src/styles/dashboard-support.css (26 lines)
- src/styles/dashboard-workspace.css (6 lines)
- src/styles/dashboard.css (111 lines)
- src/styles/leaderboard-empty.css (16 lines)
- src/styles/leaderboard-shell.css (65 lines)
- src/styles/leaderboard.css (289 lines)
- src/styles/perf-overlay.css (48 lines)
- src/styles/shared-controls.css (47 lines)
- src/styles/today-summary.css (42 lines)
- src/styles/training-header.css (111 lines)
- src/styles/training-interaction.css (165 lines)
- src/styles/training-responsive.css (69 lines)
- src/styles/training-session.css (131 lines)
- src/styles/training-shell.css (13 lines)
- src/styles/workspace-responsive.css (334 lines)

## Completed CSS modules

Extracted and wired:

- src/styles/adaptive-workspace.css
- src/styles/admin.css
- src/styles/auth.css
- src/styles/dashboard-support.css
- src/styles/dashboard-workspace.css
- src/styles/dashboard.css
- src/styles/leaderboard-empty.css
- src/styles/leaderboard-shell.css
- src/styles/leaderboard.css
- src/styles/perf-overlay.css
- src/styles/shared-controls.css
- src/styles/today-summary.css
- src/styles/training-header.css
- src/styles/training-interaction.css
- src/styles/training-responsive.css
- src/styles/training-session.css
- src/styles/training-shell.css
- src/styles/workspace-responsive.css

Each extraction preserved cascade order and npm run build passed after the change.

## Current local status

Current local commits ahead of origin/product/input-2:

- 88340e6 Move adaptive shell CSS into workspace module
- 4e20395 Extract adaptive workspace CSS module
- 4ada8cc Move admin language tabs CSS into admin module
- ad90d17 Extract admin CSS module
- 5b03f8e Extract dashboard workspace CSS module

## Strategy

Use incremental boundary-based extraction:

1. Identify one contiguous block in src/App.css.
2. Move it to src/styles/<module>.css.
3. Add the module to src/styles/index.css in the same cascade order.
4. Remove the original block from src/App.css.
5. Run npm run build.
6. Commit locally.
7. Push only after a clean group of local commits is ready.

## Next recommended cuts

1. Move adaptive shell CSS into src/styles/adaptive-workspace.css
   - Move the base .adaptive-workspace through .adaptive-section-toggle-icon-open block.
   - Keep responsive @media blocks in src/App.css for now.

2. src/styles/adaptive-timeline.css
   - Extract adaptive timeline/dot styles if they are safely bounded.

3. Feature modules:
   - adaptive-responsive.css
   - openrouter-workspace.css
   - remaining dashboard/admin support blocks if any are isolated.

## Guardrails

Do not reorder selectors casually.

Do not split mixed @media blocks manually unless the complete media block is moved.

Do not mix CSS modularization with React or TypeScript refactors in the same commit.

Do not push until local commits are intentionally grouped and build has passed.

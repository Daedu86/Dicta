# CSS modules

This directory contains CSS blocks extracted from src/App.css.

src/styles/index.css is the ordered import entrypoint. src/App.css imports it at the top, then keeps the remaining unmigrated styles below.

## Rules

- Preserve cascade order.
- Extract one contiguous block per commit.
- Keep each module named after the UI area it styles.
- Run npm run build after every extraction.
- Avoid mixing CSS extraction with React or TypeScript refactors.

## Current modules

- auth.css (51 lines)
- dashboard-support.css (26 lines)
- dashboard.css (111 lines)
- leaderboard-empty.css (16 lines)
- leaderboard-shell.css (65 lines)
- leaderboard.css (289 lines)
- perf-overlay.css (48 lines)
- shared-controls.css (47 lines)
- today-summary.css (42 lines)
- training-header.css (111 lines)
- training-interaction.css (165 lines)
- training-responsive.css (69 lines)
- training-session.css (131 lines)
- training-shell.css (13 lines)
- workspace-responsive.css (334 lines)

## Current metrics

- Remaining src/App.css: 3279 lines
- src/styles/index.css: 25 lines
- Extracted CSS module lines: 1518 lines
- Approximate extracted share: 31.5% of runtime CSS lines

## Next likely modules

- leaderboard-empty.css
- dashboard-workspace.css

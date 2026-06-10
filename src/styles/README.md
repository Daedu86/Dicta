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

- auth.css
- training-header.css
- training-shell.css
- training-session.css
- training-interaction.css
- perf-overlay.css

## Next likely module

- training-responsive.css

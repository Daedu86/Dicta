# Next modularization pass

Updated: 2026-06-10

Branch: product/input-2

## Current checkpoint

CSS modularization is active.

src/App.css remains the runtime stylesheet, but it now imports src/styles/index.css at the top. src/styles/index.css is the ordered import list for CSS modules extracted from App.css.

## Completed CSS modules

Extracted and wired:

- src/styles/auth.css
- src/styles/training-header.css
- src/styles/training-shell.css
- src/styles/training-session.css
- src/styles/training-interaction.css
- src/styles/perf-overlay.css

Each extraction preserved cascade order and npm run build passed after the change.

## Local CSS commits in this pass

Known local commits after the remote auth wiring checkpoint:

- a4d1371 Extract training header CSS module
- 88ecdbd Extract training shell CSS module
- eb57a96 Extract perf overlay CSS module

There may also be local commits for training-session.css and training-interaction.css depending on the current local log.

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

Next cuts require extra care because they involve responsive or cross-feature CSS:

1. src/styles/training-responsive.css
   - Extract the first complete @media (max-width: 640px) block.
   - Use brace matching.

2. src/styles/shared-controls.css
   - Extract reusable button/input/help-icon/control selectors only if they form a clean contiguous block.

3. Feature modules:
   - session-dashboard.css
   - leaderboard.css
   - adaptive-workspace.css
   - openrouter-workspace.css
   - admin.css

## Guardrails

Do not reorder selectors casually.

Do not split mixed @media blocks manually.

Do not mix CSS modularization with React or TypeScript refactors in the same commit.

Do not push until local commits are intentionally grouped and build has passed.

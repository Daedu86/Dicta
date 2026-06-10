# Next modularization pass

Updated: 2026-06-10

Branch: product/input-2

## Current checkpoint

CSS modularization is active.

src/App.css remains the runtime stylesheet, but it now imports src/styles/index.css at the top. src/styles/index.css is the ordered import list for CSS modules extracted from App.css.

## Current CSS modularization metrics

- Remaining src/App.css: 3869 lines
- src/styles/index.css: 18 lines
- Extracted CSS module lines: 922 lines
- Approximate extracted share: 19.2% of runtime CSS lines

Extracted modules:

- src/styles/auth.css (51 lines)
- src/styles/perf-overlay.css (48 lines)
- src/styles/training-header.css (111 lines)
- src/styles/training-interaction.css (165 lines)
- src/styles/training-responsive.css (69 lines)
- src/styles/training-session.css (131 lines)
- src/styles/training-shell.css (13 lines)
- src/styles/workspace-responsive.css (334 lines)

## Completed CSS modules

Extracted and wired:

- src/styles/auth.css
- src/styles/perf-overlay.css
- src/styles/training-header.css
- src/styles/training-interaction.css
- src/styles/training-responsive.css
- src/styles/training-session.css
- src/styles/training-shell.css
- src/styles/workspace-responsive.css

Each extraction preserved cascade order and npm run build passed after the change.

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

1. src/styles/shared-controls.css
   - Extract reusable button/input/help-icon/control selectors only if they form a clean contiguous block.

2. Feature modules:
   - session-dashboard.css
   - leaderboard.css
   - adaptive-workspace.css
   - openrouter-workspace.css
   - admin.css

## Guardrails

Do not reorder selectors casually.

Do not split mixed @media blocks manually unless the complete media block is moved.

Do not mix CSS modularization with React or TypeScript refactors in the same commit.

Do not push until local commits are intentionally grouped and build has passed.

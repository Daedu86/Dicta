# CSS modularization status

Updated: 2026-06-10

Branch: `product/input-2`

## Current checkpoint

CSS runtime modularization is complete.

`src/App.css` is now intentionally tiny and acts only as the stylesheet entrypoint:

```css
@import './styles/index.css';
```

`src/styles/index.css` is the ordered cascade manifest for runtime CSS modules.

## Completed result

The former monolithic `src/App.css` has been decomposed into focused modules under `src/styles/`.

The latest completed extraction group ended at:

- `485c617 Extract 640px responsive CSS module`

At that checkpoint:

- `src/App.css` contains no runtime selectors.
- `src/App.css` contains no responsive media blocks.
- `npm run build` passed.
- `origin/product/input-2` was updated.
- Vercel deployed the commit successfully.

## CSS module ownership map

Entrypoint and cascade:

- `src/App.css`: stylesheet entrypoint only.
- `src/styles/index.css`: ordered import manifest.

Core app/shell:

- `src/styles/app-shell.css`
- `src/styles/auth.css`
- `src/styles/shared-controls.css`

Training:

- `src/styles/training-shell.css`
- `src/styles/training-header.css`
- `src/styles/training-session.css`
- `src/styles/training-interaction.css`
- `src/styles/training-responsive.css`

Workspace, TTS, sessions, transcripts:

- `src/styles/workspace-shell.css`
- `src/styles/workspace-responsive.css`
- `src/styles/tts-workspace.css`
- `src/styles/session-status.css`
- `src/styles/transcript-preview.css`
- `src/styles/transcript-review.css`

Sidebar and app chrome:

- `src/styles/sidebar-support.css`
- `src/styles/sidebar-brand.css`
- `src/styles/sidebar-controls.css`

Dashboard/admin/leaderboard:

- `src/styles/dashboard.css`
- `src/styles/dashboard-support.css`
- `src/styles/dashboard-workspace.css`
- `src/styles/today-summary.css`
- `src/styles/admin.css`
- `src/styles/leaderboard.css`
- `src/styles/leaderboard-shell.css`
- `src/styles/leaderboard-empty.css`

Adaptive UI:

- `src/styles/adaptive-workspace.css`
- `src/styles/adaptive-timeline.css`
- `src/styles/adaptive-charts.css`
- `src/styles/bottom-metrics.css`

Responsive/final overrides:

- `src/styles/wide-responsive.css`
- `src/styles/responsive-980.css`
- `src/styles/responsive-640.css`

Diagnostics:

- `src/styles/perf-overlay.css`

## Guardrails for future agents

Do not add runtime CSS back to `src/App.css`.

Use this workflow for future CSS changes:

1. Identify the owning UI boundary.
2. Edit the nearest existing module under `src/styles/`.
3. If a new boundary is needed, create `src/styles/<focused-name>.css`.
4. Add the import to `src/styles/index.css` at the correct cascade position.
5. Run `npm run build`.
6. Keep the commit CSS-focused unless the task explicitly crosses a React/TypeScript boundary.

Cascade rules:

- Do not reorder imports casually.
- Place responsive overrides after the base modules they override.
- Move complete media blocks when possible.
- Do not split mixed media blocks unless the cascade impact has been checked.
- Test visually at desktop and mobile widths when changing app shell, sidebar, training, TTS workspace, dashboard/admin, or adaptive styles.

## Historical note

This document used to track remaining extraction work. It is now a status and guardrail document. Future modularization work should focus on naming cleanup, duplicate-rule review, and import-order clarity, not on removing selectors from `src/App.css`.

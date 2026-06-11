# CSS modules

Runtime CSS modularization is complete.

`src/App.css` is intentionally only the Vite/React stylesheet entrypoint:

```css
@import './styles/index.css';
```

`src/styles/index.css` owns the ordered cascade manifest for the modules in this directory.

## Rules

- Preserve cascade order.
- Add UI styles to the closest focused module.
- Create a new module only when the UI/runtime boundary is clear.
- Wire new modules through `src/styles/index.css` at the correct cascade position.
- Keep CSS-only cleanup separate from React, TypeScript, Supabase, Vercel, or adaptive-policy changes unless the task explicitly crosses that boundary.
- Run `npm run build` after CSS changes.

## Current status

- Runtime module files: 33 CSS modules plus `index.css`.
- Remaining `src/App.css`: stylesheet entrypoint only.
- Responsive overrides are module-owned: `wide-responsive.css`, `responsive-980.css`, `responsive-640.css`, `training-responsive.css`, and `workspace-responsive.css`.

Future CSS work should focus on naming cleanup, duplicate-rule review, and import-order clarity, not removing selectors from `src/App.css`.

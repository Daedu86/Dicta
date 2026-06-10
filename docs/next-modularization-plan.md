# Next modularization pass

Updated: 2026-06-10

Branch: `product/input-2`

## Current queue

1. Keep extracting `src/App.css` into `src/styles/*` modules.
2. Keep `src/App.css` as the runtime entrypoint until the full stylesheet can be edited locally and verified.
3. Next safe CSS cut: move the auth block from `src/App.css` into `src/styles/auth.css`, then import it through
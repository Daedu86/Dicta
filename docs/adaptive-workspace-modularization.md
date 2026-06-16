# AdaptiveBenchmarkWorkspace Modularization Plan

This page is now the compact owner index.

See docs/workspace-notes.md for historical extraction notes.

## Boundary

The workspace module owns browser UI only. App-level state, storage, callbacks, and adaptive behavior remain outside the component.

## Extracted files

- src/components/adaptive-workspace/types.ts
- src/components/adaptive-workspace/adaptiveWorkspaceViewHelpers.ts
- src/components/adaptive-workspace/AdaptiveBenchmarkWorkspace.tsx

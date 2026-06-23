# OpenRouter Workspace Modularization

Status: HISTORICAL  
Last updated: 2026-06-23  
Branch: `product/input-2`

OpenRouter workspace/runtime modularization is complete enough.

Current owners:

- `src/components/openrouter/useOpenRouterWorkspaceRuntime.ts` — runtime coordinator only.
- `src/components/openrouter/useOpenRouterWorkspaceUiState.ts` — workspace UI state.
- `src/components/adaptive-workspace/AdaptiveFlowDirectGenerationCard.tsx` — Phase 1 Adaptive Flow direct generation card for duration selection, context entry, prompt preview, and direct Training generation actions.
- `src/app/openRouterDirectGenerationJobPlan.ts` and `src/app/useOpenRouterDirectGenerationRuntime.ts` — shared direct generation planning/runtime used by both Training Mode and Phase 1 Adaptive Flow generation.
- `src/components/openrouter/useOpenRouterWorkspaceClipboard.ts` — copy/status helper.
- `api/openrouter/jobs.js` — thin route handler only.
- `api/openrouter/_job*.js` — payload, JSON extraction, provider retry, persistence, audit, and runner helpers.

Rules:

- Do not re-open this as an active plan by default.
- Use `docs/module-test-map.md` for validation.
- Use `docs/modularization-roi.md` before selecting another OpenRouter extraction.
- Treat OpenRouter route/job behavior as high-risk; keep refactor and behavior changes separate.

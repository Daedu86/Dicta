# OpenRouter Workspace Modularization

Status: HISTORICAL  
Last updated: 2026-06-16  
Branch: `product/input-2`

OpenRouter workspace/runtime modularization is complete enough.

Current owners:

- `src/components/openrouter/useOpenRouterWorkspaceRuntime.ts` — runtime coordinator only.
- `src/components/openrouter/useOpenRouterWorkspaceUiState.ts` — workspace UI state.
- `src/components/openrouter/useOpenRouterWorkspaceDerivations.ts` — derived payloads, prompts, notices, active slot state.
- `src/components/openrouter/useOpenRouterWorkspaceSlotGeneration.ts` — custom workspace generation job request flow.
- `src/components/openrouter/useOpenRouterWorkspaceClipboard.ts` — copy/status helper.
- `api/openrouter/jobs.js` — thin route handler only.
- `api/openrouter/_job*.js` — payload, JSON extraction, provider retry, persistence, audit, and runner helpers.

Rules:

- Do not re-open this as an active plan by default.
- Use `docs/module-test-map.md` for validation.
- Use `docs/modularization-roi.md` before selecting another OpenRouter extraction.
- Treat OpenRouter route/job behavior as high-risk; keep refactor and behavior changes separate.

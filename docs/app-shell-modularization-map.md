Repo-wide modularization ROI decisions live in `docs/modularization-roi.md`.

# App shell modularization map

Updated: 2026-06-16 after OpenRouter workspace/jobs split.  
Status: ACTIVE REFERENCE  
Verified branch: `product/input-2`

## Current owners

| Area | Owner |
| --- | --- |
| App shell | `src/App.tsx` renders `DictaAppRuntime` only. |
| Runtime export shim | `src/app/DictaAppRuntime.tsx` re-exports `DictaAppRuntimeRoot`. |
| Browser composition root | `src/app/DictaAppRuntimeRoot.tsx`. |
| Boot state | `src/app/useDictaAppBootRuntime.ts`. |
| Focused training | `src/app/useFocusedTrainingRuntime.ts`. |
| TTS orchestration | `src/app/useTtsSessionOrchestrationRuntime.ts`. |
| Browser TTS playback | `src/app/useBrowserTtsPlaybackLoop.ts`. |
| Root OpenRouter | `src/app/useDictaRootOpenRouterRuntime.ts`. |
| OpenRouter generation | `src/app/useOpenRouterGenerationRuntime.ts`. |
| OpenRouter jobs polling | `src/app/useOpenRouterJobPollingRuntime.ts`. |
| OpenRouter workspace runtime | `src/components/openrouter/useOpenRouterWorkspaceRuntime.ts` plus adjacent helper hooks. |
| OpenRouter jobs route | `api/openrouter/jobs.js` plus `api/openrouter/_job*.js`. |
| Session persistence/sync | `src/app/useSessionPersistenceRuntime.ts`, `src/app/useSessionPersistenceSync.ts`, sync/storage helpers. |
| Route rendering | `src/app/AppRouteRenderer.tsx`. |

## Closed extractions

Do not re-select these as active modularization tasks by default:

- App shell/runtime-root split.
- Focused training and TTS orchestration split.
- Browser TTS playback-loop helper split.
- OpenRouter generation/direct/job polling/failure-policy split.
- OpenRouter workspace runtime split.
- `api/openrouter/jobs.js` job route split.
- Session dashboard sections.
- Adaptive cockpit/diagnostics sections.
- Adaptive controller/policy/runtime helpers.
- Performance diagnostics facade.

## Current queue

| Candidate | Decision |
| --- | --- |
| `src/app/useSessionPersistenceSync.ts` pure planning/storage seams | Select only with characterization. |
| `src/core/supabaseSync.ts` decomposition | Defer; high-risk. |
| More OpenRouter extraction | Closed unless product bug or clear new owner/test seam. |
| Product/runtime hardening | Select case-by-case. |

## Rules

- Keep `src/App.tsx` shell-only.
- Keep `src/app/DictaAppRuntime.tsx` behavior-free.
- Do not split `DictaAppRuntimeRoot` only for LOC.
- Keep refactor and behavior changes separate.
- Use `docs/module-test-map.md` for validation.
- Use `docs/modularization-roi.md` before another modularization pass.

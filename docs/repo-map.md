# Repository Map

Use this as a short navigation guide before changing code. Always inspect current source and tests.

## Start points

| Path | Responsibility |
| --- | --- |
| `AGENTS.md` | Primary agent instructions. |
| `README.md` | Product overview and setup. |
| `docs/README.md` | Documentation index. |
| `docs/documentation-inventory.md` | Documentation inventory. |
| `docs/module-test-map.md` | Narrow validation map. |
| `docs/modularization-roi.md` | Modularization decision framework. |

## Current code owners

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Shell-only React entrypoint. |
| `src/app/DictaAppRuntime.tsx` | Runtime export shim. |
| `src/app/DictaAppRuntimeRoot.tsx` | Main browser composition root. |
| `src/app/` | App runtimes and route composition. |
| `src/components/openrouter/` | OpenRouter workspace UI and helper hooks. |
| `api/openrouter/jobs.js` | OpenRouter jobs route coordinator. |
| `api/openrouter/_job*.js` | OpenRouter jobs helper modules. |
| `src/core/` | Core domain logic. |
| `src/core/adaptive/` | Adaptive training/domain logic. |
| `src/inputs/browserTts/` | Browser TTS input/runtime area. |
| `src/styles/` | CSS tokens, cascade, and style modules. |
| `tests/` | Unit/integration tests. |
| `e2e/` | End-to-end tests. |

## Current high-risk areas

- Browser TTS runtime.
- Session lifecycle/reset.
- Persistence and sync.
- OpenRouter route/job behavior.
- PWA/mobile flow.
- CSS cascade.

## Change guidance

1. Touch the smallest owner boundary.
2. Inspect source and nearby tests.
3. Check `docs/module-test-map.md`.
4. Keep refactor and behavior changes separate.
5. Run narrow validation first.
6. Update KB docs when ownership moves.

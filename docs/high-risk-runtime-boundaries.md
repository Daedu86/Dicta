# High-Risk Runtime Boundaries

Last updated: 2026-06-16 after OpenRouter workspace/jobs split.  
Verified branch: `product/input-2`.

Use this before touching fragile runtime areas. Keep refactor and behavior changes separate.

## Current shell ownership

- `src/App.tsx` is shell-only.
- `src/app/DictaAppRuntime.tsx` is an export shim.
- `src/app/DictaAppRuntimeRoot.tsx` is the browser composition root.
- Runtime behavior should stay in owner hooks/modules, not return to the shell.

## High-risk areas

| Area | Owners / anchors | Primary validation |
| --- | --- | --- |
| Browser TTS runtime | `src/app/useBrowserTtsPlaybackLoop.ts`, TTS orchestration/control/submit helpers, `src/inputs/browserTts/` | Browser TTS contract, playback plan, controls, submit, telemetry, and input-policy tests. |
| Phrase progression | Playback loop, chunk completion, phrase planning, seek/replay behavior | Phrase planner, playback plan, chunk completion, playback loop, controls tests. |
| Session lifecycle/reset | Reset runtime, active-session sync, session storage, finalization | Reset, active-session, finalization, lifecycle, storage, status tests. |
| Persistence/sync/profile | Session persistence runtime, `useSessionPersistenceSync`, profile-scoped storage, Supabase sync | Persistence sync, Supabase sync, profile storage, profile tests. |
| OpenRouter runtime/routes | Root OpenRouter runtime, generation/direct/job polling/failure policy, workspace runtime helper hooks, `api/openrouter/jobs.js`, `api/openrouter/_job*.js` | OpenRouter boundary, jobs, job route, job request, direct generation, model refresh tests. |
| PWA/mobile | PWA shell, mobile training flow, keepalive sync | Focused unit/perf tests, then mobile E2E when flow changes. |
| CSS cascade | `src/styles/`, global imports, responsive overrides | Visual/manual review plus touched component tests. |

## Rules

1. Inspect current source first.
2. Inspect `docs/module-test-map.md`.
3. Touch the smallest owner boundary.
4. Do not mix mechanical movement with behavior changes.
5. Run narrow validation before broad validation.
6. For OpenRouter jobs/routes, preserve access, quotas, job lifecycle, and failure behavior unless the task explicitly changes them.

# Repo-wide Modularization ROI Framework

Status: ACTIVE  
Scope: whole repository  
Last updated: 2026-06-16 after runtime modularization wave  
Verified against branch: `product/input-2`  
Verified against code baseline: post Fase 1-9 runtime modularization wave.  
Test map checked: `docs/module-test-map.md`  
Current App-shell checkpoint: `docs/app-shell-modularization-map.md`

## Rule

Modularization is useful only when it creates a real owner, lowers cognitive load, improves testability, or reduces future change risk.

Do **not** select work only because it removes lines from `src/App.tsx` or moves code into a new file.

## Current repo posture

Dicta is in consolidation phase.

Already completed:

- `src/App.tsx` is shell-only and must stay that way.
- `src/app/DictaAppRuntime.tsx` is an export shim and must stay behavior-free.
- `src/app/DictaAppRuntimeRoot.tsx` is the browser composition root.
- `useDictaAppBootRuntime`, `useDictaRootOpenRouterRuntime`, and `useDictaRootRouteCompositionRuntime` own the current root boot/adapter seams.
- Browser TTS playback-loop ownership, with boundary-sensitive utterance setup still inside `useBrowserTtsPlaybackLoop`.
- TTS controls, metrics, telemetry, UI publishing, progress estimation, reset, and submit runtimes.
- Focused training runtime and TTS orchestration runtime seams.
- OpenRouter generation/model/direct/job/failure-policy runtime extraction.
- Auth/profile, app-level session persistence runtime, session creation, workspace session, app presentation, and route rendering ownership.
- Runtime modularization wave for OpenRouter workspace runtime helpers, SessionDashboard, adaptive cockpit/diagnostics UI sections, adaptive policies, adaptive controller helpers, adaptive runtime helpers, and performance diagnostics facade.

Current hotspots:

- `src/app/DictaAppRuntimeRoot.tsx` remains the main composition root; do not split it unless the new owner/test seam is clear.
- `src/app/useSessionPersistenceSync.ts` is the best current modularization candidate if the task is explicitly refactor/modularization work.
- `src/components/openrouter/OpenRouterWorkspace.tsx` remains a possible UI-size hotspot; runtime helpers are already separated.
- `src/core/supabaseSync.ts` is important but high-risk; characterize before extracting.

Default next step:

1. Prefer concrete product/runtime fixes when a user issue is known.
2. If the next task is modularization, score `useSessionPersistenceSync` planning/storage seams first.
3. Add characterization tests before touching high-risk behavior.
4. Update docs/test-map when ownership moves.
5. Avoid broad App-shell extraction unless a new owner/test seam is clear.

## ROI score

Score ROI from 0 to 100.

| Category | Max | What earns points |
| --- | ---: | --- |
| Ownership boundary | 20 | One clear responsibility and stable owner. |
| Testability | 20 | Focused tests or stronger characterization become possible. |
| Cognitive-load reduction | 15 | Caller becomes easier to understand without hiding flow. |
| Coupling reduction | 15 | Fragile dependencies become explicit and narrow. |
| Future change frequency | 10 | Area is likely to change again. |
| Agent-readiness | 10 | Future contributors can inspect and validate safely. |
| Net codebase effect | 10 | Meaningful complexity drops, not just local LOC. |

Decision bands:

| ROI | Decision |
| ---: | --- |
| 85-100 | Strong candidate if validation is bounded. |
| 70-84 | Good candidate with focused diff/tests. |
| 50-69 | Investigate or characterize first. |
| 30-49 | Usually defer/reject. |
| 0-29 | Reject. |

## Risk / validation cost

Score separately from ROI.

| Cost | Meaning |
| ---: | --- |
| 0-24 | Focused tests are enough. |
| 25-49 | Add/update focused tests and inspect UI/API flow. |
| 50-74 | Characterization tests and integration/manual smoke needed. |
| 75-100 | Split the candidate unless very bounded. |

High-risk areas:

- Browser TTS playback, reset, refs/timers, telemetry.
- Persistence, Supabase sync, auth/profile scoping.
- OpenRouter jobs/routes/error behavior/quotas.
- PWA/mobile flow.
- CSS cascade.

## Reject patterns

Reject or split candidates that:

- create broad opaque `appState`/prop-bag contracts;
- mix behavior changes with mechanical movement;
- touch multiple high-risk boundaries at once;
- add wrappers with no ownership payoff;
- move strings/constants only;
- rely on stale docs without inspecting current source.

## Required scorecard before a modularization patch

Record:

- candidate name;
- current owner;
- proposed owner;
- main behavior preserved;
- runtime boundaries touched;
- ROI score;
- risk / validation cost;
- required focused tests;
- full validation command if needed;
- rollback plan;
- decision: select / defer / reject.

## Current recommendation

Do not start another broad App-shell, adaptive, Browser TTS, or OpenRouter extraction by default.

If no concrete bug/product task is selected and the user explicitly wants modularization, the best next candidate is `src/app/useSessionPersistenceSync.ts`.

Start with pure or characterization-friendly seams, such as:

- snapshot/serialization helpers;
- restore-plan helpers;
- write-plan helpers;
- storage compaction helpers;
- profile-scoped pending-sync helpers.

Do not start with `src/core/supabaseSync.ts` unless the goal is specifically Supabase sync behavior and the patch includes focused characterization.

Use `docs/module-test-map.md` to choose validation before editing.

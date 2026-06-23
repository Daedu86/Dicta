# Documentation Inventory

Status as of: 2026-06-16  
Current branch: `product/input-2`  
Current baseline: post OpenRouter workspace runtime and jobs route modularization

## Status legend

| Status | Meaning |
| --- | --- |
| ACTIVE | Canonical source of truth. |
| REFERENCE | Supporting context. |
| HISTORICAL | Completed plan or checkpoint; context only. |
| ARCHIVED | Historical file under `docs/archive/`. |

## Current Markdown files

| File | Status | Notes |
| --- | --- | --- |
| `AGENTS.md` | ACTIVE | Primary agent instructions. |
| `README.md` | ACTIVE | Product overview/setup. |
| `ARCHITECTURE.md` | ACTIVE | Root architecture pointer. |
| `docs/architecture.md` | ACTIVE | Current architecture map. |
| `docs/listening-first-architecture.md` | ACTIVE | Product/learning architecture index. |
| `docs/listening-first-product-language.md` | ACTIVE | Product labels and legacy mapping. |
| `docs/listening-first-precision-signals.md` | ACTIVE | Listening metrics. |
| `docs/listening-first-policy-guardrails.md` | ACTIVE | Policy constraints. |
| `docs/listening-first-compatibility-matrix.md` | ACTIVE | Visible vs legacy value map. |
| `docs/README.md` | ACTIVE | Documentation index. |
| `docs/agent-onboarding.md` | ACTIVE | Agent entry flow. |
| `docs/repo-map.md` | ACTIVE | Compact repository owner map. |
| `docs/module-test-map.md` | ACTIVE | Module-to-test validation map. |
| `docs/high-risk-runtime-boundaries.md` | ACTIVE | Runtime safety rules. |
| `docs/modularization-roi.md` | ACTIVE | ROI scoring and current modularization recommendation. |
| `docs/runtime-access-boundary.md` | ACTIVE REFERENCE | Auth/profile/OpenRouter runtime access boundary. |
| `docs/session-persistence-sync-kb.md` | ACTIVE REFERENCE | Session persistence/sync owner map. |
| `docs/supabase-multiuser-auth.md` | REFERENCE | Supabase auth/sync/RLS context. |
| `src/styles/README.md` | REFERENCE | Styling and CSS organization. |
| `docs/android-pwa-performance-debugging.md` | REFERENCE | Android/PWA performance context. |
| `docs/app-shell-modularization-map.md` | ACTIVE REFERENCE | Compact current owner map and candidate queue. |
| `docs/adaptive-listening-brain.md` | ACTIVE | Adaptive listening brain index. |
| `docs/adaptive-listening-brain-runtime.md` | ACTIVE | Adaptive runtime behavior. |
| `docs/adaptive-listening-brain-boundaries.md` | ACTIVE | Adaptive guardrails and gaps. |
| `docs/adaptive-listening-brain-implementation-map.md` | ACTIVE | Adaptive implementation index. |
| `docs/archive/app-shell-modularization-checkpoint.md` | HISTORICAL, ARCHIVED | Historical App-shell checkpoint. |
| `docs/archive/legacy-multi-input-2026-06-05.md` | HISTORICAL, ARCHIVED | Legacy multi-input snapshot. |
| `docs/next-modularization-plan.md` | HISTORICAL | Former near-term plan. |
| `docs/openrouter-workspace-modularization.md` | HISTORICAL | Compacted; OpenRouter workspace/runtime and jobs route split are closed. |
| `docs/admin-workspace-modularization.md` | HISTORICAL | Historical checkpoint. |
| `docs/app-post-leaderboard-measurement.md` | HISTORICAL | Historical measurement note. |
| `docs/app-shell-header-modularization.md` | HISTORICAL | Historical checkpoint. |
| `docs/auth-workspace-modularization.md` | HISTORICAL | Historical checkpoint. |
| `docs/leaderboard-workspace-modularization.md` | HISTORICAL | Historical checkpoint. |
| `docs/pending-session-lane-modularization.md` | HISTORICAL | Historical checkpoint. |
| `docs/session-dashboard-modularization.md` | HISTORICAL | Completed checkpoint. |

## Current KB refresh notes

- OpenRouter workspace runtime is split into coordinator + UI state + derivations + clipboard + slot-generation helpers.
- `api/openrouter/jobs.js` is a thin route handler; job internals live in `api/openrouter/_job*.js`.
- `docs/openrouter-workspace-modularization.md` was compacted to historical context.
- `docs/app-shell-modularization-map.md`, `docs/modularization-roi.md`, `docs/repo-map.md`, and `docs/README.md` were refreshed for this cut.

## Current recommendation

- Do not reopen OpenRouter modularization by default.
- If the next task is modularization, prefer `src/app/useSessionPersistenceSync.ts` pure planning/storage seams with characterization.
- Keep historical docs as context only; source and tests win.

## Agent rule

Before using historical modularization docs:

1. Check current branch/status and recent commits.
2. Inspect current source files.
3. Inspect focused tests.
4. Prefer current source/tests over stale checkpoint notes.

# Documentation Inventory

This document is the current inventory of Markdown documentation in the Dicta repo.

Status as of: 2026-06-16  
Current branch: `product/input-2`  
Current baseline observed before this inventory refresh: `c558573`

## Status legend

| Status | Meaning |
| --- | --- |
| ACTIVE | Canonical entry point or current source of truth. Agents should read it when relevant. |
| REFERENCE | Useful supporting context, but not the primary entry point. |
| HISTORICAL | Checkpoint, migration note, or completed plan. Useful for context, not current truth. |
| ARCHIVED | Historical document moved under `docs/archive/`. Keep for context, not current truth. |
| OBSOLETE-CANDIDATE | May conflict with current repo state. Do not delete until verified. |

## Current Markdown files

| File | Status | Purpose | Notes / follow-up |
| --- | --- | --- | --- |
| `AGENTS.md` | ACTIVE | Primary agent instructions and repo safety rules. | Current runtime shell boundary is listed there. |
| `README.md` | ACTIVE | Product overview, setup, and high-level documentation entry. | Keep broad and user-facing. |
| `ARCHITECTURE.md` | ACTIVE | Root architecture pointer. | Should remain short; it currently redirects to `docs/architecture.md`. |
| `docs/architecture.md` | ACTIVE | Current architecture map and system boundaries. | Refreshed on 2026-06-16 for `DictaAppRuntimeRoot`, boot runtime, root OpenRouter, and root route-composition boundaries. |
| `docs/listening-first-architecture.md` | ACTIVE | Product/learning architecture around listening-first training. | Keep as product architecture context. |
| `docs/README.md` | ACTIVE | Canonical documentation index. | Refreshed on 2026-06-16 to include the runtime access boundary. |
| `docs/agent-onboarding.md` | ACTIVE | Official technical onboarding flow for agents. | Canonical agent workflow. |
| `docs/repo-map.md` | ACTIVE | Repository responsibilities and boundaries. | Refreshed on 2026-06-16 to mark `DictaAppRuntime.tsx` as an export shim and `DictaAppRuntimeRoot.tsx` as the runtime composition root. |
| `docs/module-test-map.md` | ACTIVE | Module-to-test validation map. | Refreshed on 2026-06-16 with root runtime, boot, OpenRouter adapter, and route-composition boundary tests. |
| `docs/high-risk-runtime-boundaries.md` | ACTIVE | Centralized high-risk runtime safety rules. | Refreshed on 2026-06-16 for runtime root ownership and root OpenRouter validation. |
| `docs/modularization-roi.md` | ACTIVE | Repo-wide modularization ROI scoring framework. | Refreshed on 2026-06-15 with current hotspot guidance and `useSessionPersistenceSync` as the best modularization candidate when explicitly refactoring. |
| `docs/runtime-access-boundary.md` | ACTIVE REFERENCE | Access runtime boundary for Supabase/auth/profile/OpenRouter model/admin inventory wiring. | Refreshed on 2026-06-16 to point at `DictaAppRuntimeRoot` instead of the export shim. |
| `docs/session-persistence-sync-kb.md` | ACTIVE REFERENCE | Concise owner map for session persistence sync modules. | Persistence sync is no longer a pending monolith extraction; future work should be narrow and characterized. |
| `docs/supabase-multiuser-auth.md` | REFERENCE | Supabase multi-user auth, sync, and policy context. | Important for auth/RLS/service-role boundaries. |
| `src/styles/README.md` | REFERENCE | Styling and CSS organization guidance. | Important for CSS cascade/import-order safety. |
| `docs/android-pwa-performance-debugging.md` | REFERENCE | Android/PWA performance debugging notes. | Keep as runtime/performance context. |
| `docs/app-shell-modularization-map.md` | ACTIVE REFERENCE | App shell/runtime ownership map and current candidate queue. | Refreshed on 2026-06-16 for the runtime root boundary; verify source before using. |
| `docs/archive/app-shell-modularization-checkpoint.md` | HISTORICAL, ARCHIVED | Compacted historical checkpoint summary for App shell modularization. | Replaced the long checkpoint log with a concise archive summary on 2026-06-15. |
| `docs/next-modularization-plan.md` | REFERENCE, HISTORICAL | Former near-term modularization planning context. | Do not use as the active queue; use `docs/app-shell-modularization-map.md` and `docs/modularization-roi.md`. |
| `docs/adaptive-advanced-diagnostics-modularization.md` | HISTORICAL | Plan/checkpoint for adaptive diagnostics modularization. | Review whether completed before archiving. |
| `docs/adaptive-workspace-modularization.md` | HISTORICAL | Adaptive workspace modularization plan/checkpoint. | Reference repaired to `docs/app-shell-modularization-map.md`. |
| `docs/admin-workspace-modularization.md` | HISTORICAL | Admin workspace modularization plan/checkpoint. | Review whether completed before archiving. |
| `docs/app-post-leaderboard-measurement.md` | HISTORICAL | Post-leaderboard measurement notes. | Likely checkpoint/reference rather than current entry point. |
| `docs/app-shell-header-modularization.md` | HISTORICAL | App shell header extraction/modularization notes. | Review whether completed before archiving. |
| `docs/auth-workspace-modularization.md` | HISTORICAL | Auth workspace modularization plan/checkpoint. | Review whether completed before archiving. |
| `docs/leaderboard-workspace-modularization.md` | HISTORICAL | Leaderboard workspace modularization plan/checkpoint. | Review whether completed before archiving. |
| `docs/archive/legacy-multi-input-2026-06-05.md` | HISTORICAL, ARCHIVED | Legacy multi-input snapshot from 2026-06-05. | Keep for historical context; not current source of truth. |
| `docs/openrouter-workspace-modularization.md` | HISTORICAL | OpenRouter workspace modularization plan/checkpoint. | Reference repaired to `docs/app-shell-modularization-map.md`. |
| `docs/pending-session-lane-modularization.md` | HISTORICAL | Pending session lane modularization plan/checkpoint. | Reference repaired to `docs/app-shell-modularization-map.md`. |
| `docs/session-dashboard-modularization.md` | HISTORICAL | Session dashboard modularization plan/checkpoint. | Reference repaired to `docs/app-shell-modularization-map.md`. |

## Known documentation issues

### Canonical onboarding docs

The canonical onboarding docs exist and are active:

- `docs/README.md`
- `docs/agent-onboarding.md`
- `docs/repo-map.md`
- `docs/module-test-map.md`
- `docs/high-risk-runtime-boundaries.md`
- `docs/modularization-roi.md`

### Repaired modularization references

The former missing modularization-map reference now points to `docs/app-shell-modularization-map.md` in the historical modularization docs.

Repaired sources:

- `docs/adaptive-workspace-modularization.md`
- `docs/openrouter-workspace-modularization.md`
- `docs/pending-session-lane-modularization.md`
- `docs/session-dashboard-modularization.md`

Historical context was preserved; only the broken target was repaired.

### 2026-06-15 repo KB refresh

This pass aligned the repo KB with the current shell/runtime ownership:

- `docs/archive/app-shell-modularization-checkpoint.md` was compacted from a long checkpoint log into a concise historical summary.
- `docs/repo-map.md` now marks `src/App.tsx` as shell-only and `src/app/DictaAppRuntime.tsx` as the browser composition root.
- `docs/module-test-map.md` now reflects App/runtime ownership and has no orphaned table rows after the ROI section.
- `docs/app-shell-modularization-map.md` now records the current line-count hotspots and candidate queue.
- `docs/modularization-roi.md` now states that `useSessionPersistenceSync` is the best current modularization candidate when the task is explicitly refactor work.
- `docs/README.md` now classifies the compacted archive correctly.

### 2026-06-16 runtime root boundary refresh

This pass aligned the active KB with the final runtime-root boundary commits:

- `docs/architecture.md`, `docs/repo-map.md`, and `docs/high-risk-runtime-boundaries.md` now treat `src/app/DictaAppRuntime.tsx` as an export shim and `src/app/DictaAppRuntimeRoot.tsx` as the browser composition root.
- `docs/runtime-access-boundary.md` now points access-runtime context at `DictaAppRuntimeRoot` instead of the export shim.
- `docs/README.md` and this inventory now include `docs/runtime-access-boundary.md`.
- `docs/module-test-map.md` now includes `useDictaAppBootRuntime`, `useDictaRootOpenRouterRuntime`, `useDictaRootRouteCompositionRuntime`, and their focused boundary tests.
- `docs/app-shell-modularization-map.md` now records the root boot/adapter boundaries as completed and keeps session persistence as the only strong current refactor candidate.

### Stale baseline references

These commit baselines appear in historical modularization docs and should not be treated as the current baseline:

- `ad42cef`
- `522a983`
- `637e479`
- `3ef3b91`
- `abe497a`
- `b1fc1d8`
- `10ad99d`
- `ee15ef7`

Current observed baseline for this inventory pass before updating this file:

- `c558573`

## Proposed next documentation stages

| Stage | Scope | Write policy |
| --- | --- | --- |
| 8B | Create `docs/README.md`. | Done. |
| 8C | Create `docs/agent-onboarding.md`. | Done. |
| 8D | Create `docs/repo-map.md`. | Done. |
| 8E | Create `docs/module-test-map.md`. | Done. |
| 8F | Create `docs/high-risk-runtime-boundaries.md`. | Done. |
| 8G | Connect root docs and documentation indexes. | Done. |
| 8H | Repair broken references. | Done. |
| 8I | Archive selected historical docs. | Done. |
| 8J | Update `.gitignore` for local Python virtualenv noise. | Done. |
| 8K | Add repo-wide modularization ROI framework. | Done. |
| 8L | Refresh modularization ROI docs for 2026 evidence, freshness, and AI-assisted refactor risk. | Done. |
| 8M | Compact the App shell modularization archive. | Done. |
| 8N | Refresh repo KB ownership docs after the current line-count review. | Done. |
| 8O | Refresh active KB after runtime root boundary commits. | Done. |

## Agent rule

Before using any historical modularization document as a source of truth, agents must:

1. Check `git status --short`.
2. Check recent commits.
3. Compare the document's verified commit against current `HEAD`.
4. Compare the document against current files.
5. Inspect the current tests for the touched area.
6. Prefer current source files and tests over old checkpoint notes.
7. Treat old baseline hashes as historical unless they match current `HEAD`.

## Adaptive Listening Brain

- `docs/adaptive-listening-brain.md` — canonical KB entry for the adaptive listening brain. Covers Browser TTS pacing telemetry, controller state scoping, language profiles, reason codes, benchmark suffix normalization, validation baseline, and future improvement backlog.

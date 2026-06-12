# Documentation Inventory

This document is the current inventory of Markdown documentation in the Dicta repo.

Status as of: 2026-06-12  
Current branch: `product/input-2`  
Current baseline observed: `aa7f0ee Document final recommendation cleanup`

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
| `AGENTS.md` | ACTIVE | Primary agent instructions and repo safety rules. | Should later point to `docs/agent-onboarding.md` once that exists. |
| `README.md` | ACTIVE | Product overview, setup, and high-level documentation entry. | Should later point to `docs/README.md` and avoid becoming a detailed internal map. |
| `ARCHITECTURE.md` | ACTIVE | Root architecture pointer. | Should remain short; it currently redirects to `docs/architecture.md`. |
| `docs/architecture.md` | ACTIVE | Current architecture map and system boundaries. | Should feed future `docs/repo-map.md`. |
| `docs/listening-first-architecture.md` | ACTIVE | Product/learning architecture around listening-first training. | Keep as product architecture context. |
| `docs/README.md` | ACTIVE | Canonical documentation index. | Added in Stage 8B. |
| `docs/agent-onboarding.md` | ACTIVE | Official technical onboarding flow for agents. | Added in Stage 8C. |
| `docs/repo-map.md` | ACTIVE | Repository responsibilities and boundaries. | Added in Stage 8D. |
| `docs/module-test-map.md` | ACTIVE | Module-to-test validation map. | Added in Stage 8E. |
| `docs/high-risk-runtime-boundaries.md` | ACTIVE | Centralized high-risk runtime safety rules. | Added in Stage 8F. |
| `docs/supabase-multiuser-auth.md` | REFERENCE | Supabase multi-user auth, sync, and policy context. | Important for auth/RLS/service-role boundaries. |
| `src/styles/README.md` | REFERENCE | Styling and CSS organization guidance. | Important for CSS cascade/import-order safety. |
| `docs/android-pwa-performance-debugging.md` | REFERENCE | Android/PWA performance debugging notes. | Keep as runtime/performance context. |
| `docs/app-shell-modularization-map.md` | REFERENCE, OBSOLETE-CANDIDATE | App shell modularization map and remaining extraction guidance. | Contains stale baseline references such as `abe497a` and `3ef3b91`; update or mark historical later. |
| `docs/archive/app-shell-modularization-checkpoint.md` | HISTORICAL, ARCHIVED | Historical checkpoint log for app shell modularization. | Contains several old baselines: `ad42cef`, `522a983`, `637e479`, `3ef3b91`, `abe497a`. Do not use as current baseline. |
| `docs/next-modularization-plan.md` | REFERENCE | Current/near-term modularization planning context. | Verify against current branch before using as source of truth. |
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

The Stage 8 canonical onboarding docs now exist:

- `docs/README.md`
- `docs/agent-onboarding.md`
- `docs/repo-map.md`
- `docs/module-test-map.md`
- `docs/high-risk-runtime-boundaries.md`

### Repaired modularization references

The former missing modularization-map reference now points to `docs/app-shell-modularization-map.md` in the historical modularization docs.

Repaired sources:

- `docs/adaptive-workspace-modularization.md`
- `docs/openrouter-workspace-modularization.md`
- `docs/pending-session-lane-modularization.md`
- `docs/session-dashboard-modularization.md`

Historical context was preserved; only the broken target was repaired.

### Stale baseline references

These commit baselines appear in historical modularization docs and should not be treated as the current baseline:

- `ad42cef`
- `522a983`
- `637e479`
- `3ef3b91`
- `abe497a`

Current observed baseline for this inventory pass:

- `aa7f0ee Document final recommendation cleanup`

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
| 8I | Archive selected historical docs. | In progress. |
| 8J | Update `.gitignore` for local Python virtualenv noise. | Separate non-docs commit. |

## Agent rule

Before using any historical modularization document as a source of truth, agents must:

1. Check `git status --short`.
2. Check recent commits.
3. Compare the document against current files.
4. Prefer current source files and tests over old checkpoint notes.
5. Treat old baseline hashes as historical unless they match current `HEAD`.

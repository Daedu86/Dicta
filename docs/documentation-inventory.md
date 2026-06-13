# Documentation Inventory

This document is the current inventory of Markdown documentation in the Dicta repo.

Status as of: 2026-06-13  
Current branch: `product/input-2`  
Current baseline observed before this inventory refresh: `10ad99d`

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
| `docs/high-risk-runtime-boundaries.md` | ACTIVE | Centralized high-risk runtime safety rules. | Refreshed on 2026-06-13 with AI-assisted refactor risk, documentation-only safety, and ROI override language. |
| `docs/modularization-roi.md` | ACTIVE | Repo-wide modularization ROI scoring framework. | Refreshed on 2026-06-13 with benchmark-alignment, freshness, score calibration, and AI-assisted refactor risk guidance. Use before future modularization iterations. |
| `docs/supabase-multiuser-auth.md` | REFERENCE | Supabase multi-user auth, sync, and policy context. | Important for auth/RLS/service-role boundaries. |
| `src/styles/README.md` | REFERENCE | Styling and CSS organization guidance. | Important for CSS cascade/import-order safety. |
| `docs/android-pwa-performance-debugging.md` | REFERENCE | Android/PWA performance debugging notes. | Keep as runtime/performance context. |
| `docs/app-shell-modularization-map.md` | REFERENCE | App shell modularization map and remaining extraction guidance. | Refreshed on 2026-06-13; active candidate queue is separated from completed extraction log. Verify recent commits and LOC before using. |
| `docs/archive/app-shell-modularization-checkpoint.md` | HISTORICAL, ARCHIVED | Historical checkpoint log for app shell modularization. | Contains several old baselines: `ad42cef`, `522a983`, `637e479`, `3ef3b91`, `abe497a`. Do not use as current baseline. |
| `docs/next-modularization-plan.md` | REFERENCE, HISTORICAL | Former near-term modularization planning context. | Refreshed on 2026-06-13 to mark old candidate recommendations as historical. Do not use as the active queue. |
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

### 2026-06-13 modularization documentation refresh

The modularization docs were refreshed to reduce stale-plan risk and align candidate selection with safe-flow evidence instead of local LOC reduction alone.

Changed areas:

- `docs/modularization-roi.md` now includes 2026 benchmark-alignment guidance, documentation freshness rules, AI-assisted implementation risk, evidence calibration, and expanded scorecard fields.
- `docs/app-shell-modularization-map.md` now separates the active candidate queue from completed extraction history.
- `docs/next-modularization-plan.md` is explicitly marked as a historical checkpoint, not the active next-target source.
- `docs/high-risk-runtime-boundaries.md` now calls out AI-assisted refactor risk and documentation-only safety risk explicitly.
- `docs/README.md` now has a dedicated modularization decision docs section.

### Stale baseline references

These commit baselines appear in historical modularization docs and should not be treated as the current baseline:

- `ad42cef`
- `522a983`
- `637e479`
- `3ef3b91`
- `abe497a`
- `b1fc1d8`

Current observed baseline for this inventory pass before updating this file:

- `10ad99d`

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

## Agent rule

Before using any historical modularization document as a source of truth, agents must:

1. Check `git status --short`.
2. Check recent commits.
3. Compare the document's verified commit against current `HEAD`.
4. Compare the document against current files.
5. Inspect the current tests for the touched area.
6. Prefer current source files and tests over old checkpoint notes.
7. Treat old baseline hashes as historical unless they match current `HEAD`.

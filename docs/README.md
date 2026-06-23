# Dicta Documentation

This directory contains the canonical technical documentation for Dicta.

Agents should use this index to decide which documents are current sources of truth, supporting references, and historical notes.

## Start here

| Document | Purpose |
| --- | --- |
| `../AGENTS.md` | Primary repo instructions and safety rules for agents. |
| `../README.md` | Product overview, setup, and high-level project entry point. |
| `../ARCHITECTURE.md` | Root architecture pointer. |
| `architecture.md` | Current architecture map and system boundaries. |
| `documentation-inventory.md` | Current inventory and status classification of Markdown docs. |

## Current architecture and product docs

| Document | Status | Purpose |
| --- | --- | --- |
| `architecture.md` | Active | Current architecture map. |
| `listening-first-architecture.md` | Active | Listening-first product and learning architecture. |
| `listening-first-product-language.md` | Active | Product labels and legacy mapping. |
| `listening-first-precision-signals.md` | Active | Listening metrics. |
| `listening-first-policy-guardrails.md` | Active | Policy constraints. |
| `listening-first-compatibility-matrix.md` | Active | Visible vs legacy value map. |
| `runtime-access-boundary.md` | Active reference | Auth/profile/OpenRouter access runtime boundary. |
| `supabase-multiuser-auth.md` | Reference | Supabase auth, sync, RLS, and service-role context. |
| `android-pwa-performance-debugging.md` | Reference | Android/PWA performance investigation notes. |
| `../src/styles/README.md` | Reference | CSS and styling organization guidance. |
| `adaptive-listening-brain.md` | Active | Adaptive listening brain index. |
| `adaptive-listening-brain-runtime.md` | Active | Adaptive runtime behavior. |
| `adaptive-listening-brain-boundaries.md` | Active | Adaptive guardrails and gaps. |
| `adaptive-listening-brain-implementation-map.md` | Active | Adaptive implementation index. |

## Agent onboarding and repository navigation

| Document | Purpose |
| --- | --- |
| `agent-onboarding.md` | Official entry flow for agents. |
| `repo-map.md` | Repository owner map. |
| `module-test-map.md` | Module-to-test validation map. |
| `high-risk-runtime-boundaries.md` | Runtime safety rules for fragile areas. |

## Modularization decision docs

Use these in this order before modularization:

| Document | Status | Purpose |
| --- | --- | --- |
| `modularization-roi.md` | Active | Repo-wide ROI scoring and current candidate guidance. |
| `app-shell-modularization-map.md` | Active reference | Current App shell/runtime owner map and candidate queue. |
| `session-persistence-sync-kb.md` | Active reference | Owner map for session persistence sync. |
| `module-test-map.md` | Active | Focused validation map. |
| `high-risk-runtime-boundaries.md` | Active | Runtime risk rules. |
| `next-modularization-plan.md` | Historical | Old near-term plan; do not use as active queue. |

## Historical modularization docs

Historical notes are context only. Verify against current source before using them.

| Document | Current handling |
| --- | --- |
| `admin-workspace-modularization.md` | Historical note. |
| `app-post-leaderboard-measurement.md` | Historical note. |
| `app-shell-header-modularization.md` | Historical note. |
| `archive/app-shell-modularization-checkpoint.md` | Archived historical checkpoint. |
| `auth-workspace-modularization.md` | Historical note. |
| `leaderboard-workspace-modularization.md` | Historical note. |
| `archive/legacy-multi-input-2026-06-05.md` | Archived historical snapshot. |
| `openrouter-workspace-modularization.md` | Compact historical note; OpenRouter workspace/runtime and jobs route split are closed. |
| `pending-session-lane-modularization.md` | Historical note. |
| `session-dashboard-modularization.md` | Historical note. |

## Rules for agents

Before using historical modularization docs:

1. Check status and recent commits.
2. Inspect current source files.
3. Inspect current tests for the touched area.
4. Prefer current source/tests over old checkpoint notes.
5. Treat old commit hashes as historical unless they match current `HEAD`.

## Adaptive Listening Brain KB

- [Adaptive Listening Brain](./adaptive-listening-brain.md)

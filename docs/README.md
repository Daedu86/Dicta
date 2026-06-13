# Dicta Documentation

This directory contains the canonical technical documentation for Dicta.

Agents should use this index to decide which documents are current sources of truth, which are supporting references, and which are historical checkpoint notes.

## Start here

| Document | Purpose |
| --- | --- |
| `../AGENTS.md` | Primary repo instructions and safety rules for agents. |
| `../README.md` | Product overview, setup, and high-level project entry point. |
| `../ARCHITECTURE.md` | Root architecture pointer. |
| `architecture.md` | Current architecture map and system boundaries. |
| `listening-first-architecture.md` | Listening-first product and learning architecture. |
| `documentation-inventory.md` | Current inventory and status classification of Markdown docs. |

## Current architecture and product docs

| Document | Status | Purpose |
| --- | --- | --- |
| `architecture.md` | Active | Current architecture map for app, core domain, inputs, server routes, Supabase, local services, and PWA shell. |
| `listening-first-architecture.md` | Active | Product architecture for listening-first dictation training. |
| `supabase-multiuser-auth.md` | Reference | Supabase auth, sync, RLS, and service-role context. |
| `android-pwa-performance-debugging.md` | Reference | Android/PWA performance investigation notes. |
| `../src/styles/README.md` | Reference | CSS and styling organization guidance. |

## Documentation management

| Document | Status | Purpose |
| --- | --- | --- |
| `documentation-inventory.md` | Active | Markdown inventory, status labels, known broken references, stale baselines, and planned documentation stages. |

## Agent onboarding and repository navigation

The following canonical onboarding documents are active:

| Document | Purpose |
| --- | --- |
| `agent-onboarding.md` | Official entry flow for agents before they inspect or change code. |
| `repo-map.md` | Repository tree, folder responsibilities, and boundary notes. |
| `module-test-map.md` | Map of important modules to the tests that protect them. |
| `high-risk-runtime-boundaries.md` | Centralized runtime safety rules for fragile or high-risk areas. |

## Modularization decision docs

Use these documents in this order before proposing or applying modularization:

| Document | Status | Purpose |
| --- | --- | --- |
| `modularization-roi.md` | Active | Repo-wide ROI scoring framework, evidence calibration, freshness rules, and AI-assisted refactor risk guidance. |
| `app-shell-modularization-map.md` | Reference | Current App shell candidate queue and completed extraction log. Verify branch, commit, source anchors, and LOC before use. |
| `module-test-map.md` | Active | Module-to-test validation map for narrow test selection. |
| `high-risk-runtime-boundaries.md` | Active | Runtime risk rules for Browser TTS, persistence, auth, mobile/PWA, CSS cascade, and related fragile boundaries. |
| `next-modularization-plan.md` | Reference / Historical | Former near-term plan. Preserved for checkpoint context only; do not use as the active candidate queue. |

## Historical modularization docs

These documents may contain useful context, but they are not current sources of truth unless verified against the current branch and source files.

| Document | Current handling |
| --- | --- |
| `adaptive-advanced-diagnostics-modularization.md` | Historical modularization note. |
| `adaptive-workspace-modularization.md` | Historical note; reference repaired to `docs/app-shell-modularization-map.md`. |
| `admin-workspace-modularization.md` | Historical modularization note. |
| `app-post-leaderboard-measurement.md` | Historical measurement/modularization note. |
| `app-shell-header-modularization.md` | Historical modularization note. |
| `archive/app-shell-modularization-checkpoint.md` | Historical checkpoint log with stale baseline hashes. |
| `auth-workspace-modularization.md` | Historical modularization note. |
| `leaderboard-workspace-modularization.md` | Historical modularization note. |
| `archive/legacy-multi-input-2026-06-05.md` | Historical legacy snapshot. |
| `openrouter-workspace-modularization.md` | Historical note; reference repaired to `docs/app-shell-modularization-map.md`. |
| `pending-session-lane-modularization.md` | Historical note; reference repaired to `docs/app-shell-modularization-map.md`. |
| `session-dashboard-modularization.md` | Historical note; reference repaired to `docs/app-shell-modularization-map.md`. |

## Rules for agents

Before using any historical modularization document as implementation guidance:

1. Check `git status --short`.
2. Check recent commits.
3. Inspect the current source files.
4. Inspect the current tests for the area being changed.
5. Compare the document's verified commit against current `HEAD`.
6. Prefer current source and tests over old checkpoint notes.
7. Treat old commit hashes as historical unless they match current `HEAD`.

## Known documentation issues

See `documentation-inventory.md` for the current list of missing canonical docs, broken references, stale baseline hashes, and future cleanup stages.

## Adaptive Listening Brain KB

The canonical KB entry for the adaptive listening/pacing brain is:

- [Adaptive Listening Brain](./adaptive-listening-brain.md)

Use that document as the single source of truth for Browser TTS adaptive pacing, listening precision, correction pressure, language-scoped controller state, structured reason codes, benchmark suffix handling, and pending adaptive improvements.

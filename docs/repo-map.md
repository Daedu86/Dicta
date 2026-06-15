# Repository Map

This document maps the main Dicta repository areas and their responsibilities.

Use this as a navigation guide before changing code. It is not a replacement for inspecting the current source files and tests.

## Root files

| Path | Responsibility | Notes |
| --- | --- | --- |
| `AGENTS.md` | Primary agent instructions and safety rules. | Read before planning changes. |
| `README.md` | Product overview, setup, and high-level project entry. | Keep broad and user-facing. |
| `ARCHITECTURE.md` | Root pointer to the detailed architecture doc. | Should stay short. |
| `package.json` | Frontend scripts, dependencies, and test commands. | Check scripts before adding new commands. |
| `vite.config.ts` | Vite app/test configuration. | Treat changes as app-wide. |
| `tsconfig*.json` | TypeScript configuration. | Treat changes as app-wide. |

## Documentation

| Path | Responsibility | Notes |
| --- | --- | --- |
| `docs/` | Technical documentation, architecture notes, onboarding, and historical modularization plans. | Start with `docs/README.md`. |
| `docs/README.md` | Documentation index. | Canonical docs navigation. |
| `docs/documentation-inventory.md` | Markdown inventory and status classification. | Tracks stale docs and broken references. |
| `docs/agent-onboarding.md` | Official onboarding path for agents. | Required before code changes. |
| `src/styles/README.md` | CSS organization and styling guidance. | Relevant before style/cascade changes. |

## Application source

| Path | Responsibility | Notes |
| --- | --- | --- |
| `src/App.tsx` | Shell-only React entrypoint. | Imports `App.css` and renders `DictaAppRuntime`; it must not regain runtime ownership. |
| `src/app/DictaAppRuntime.tsx` | Main browser composition root. | Wires auth/profile, sync, workspace routing, OpenRouter, focused training, presentation props, and route rendering. This is the current App-runtime hotspot. |
| `src/app/` | App-level hooks, runtimes, workspace orchestration, and feature composition. | Inspect owner hooks and tests before editing. |
| `src/components/` | React UI components. | Preserve props and user-visible behavior. |
| `src/core/` | Core TypeScript domain logic. | Prefer pure helpers and direct unit tests. |
| `src/core/adaptive/` | Adaptive training/domain logic. | Keep behavior covered by adaptive tests. |
| `src/inputs/` | Input adapters and input-specific runtime code. | Treat browser TTS input as high-risk. |
| `src/inputs/browserTts/` | Browser TTS input/runtime area. | High-risk: avoid casual edits. |
| `src/styles/` | Global CSS, design tokens, and style modules. | Watch cascade and import order. |
| `src/types/` | Shared TypeScript types. | Type changes can be app-wide. |
| `src/utils/` | Shared utilities. | Prefer focused tests for behavior changes. |

## Server and integration areas

| Path | Responsibility | Notes |
| --- | --- | --- |
| `api/` | Server routes and backend-facing API handlers. | OpenRouter and auth-sensitive routes require extra care. |
| `supabase/` | Supabase schema, migrations, policies, and SQL context. | High-risk for auth, RLS, and service-role boundaries. |
| `services/` | Local sidecars and service integrations. | Exclude local virtualenvs from broad scans. |
| `services/kokoro_tts/` | Kokoro TTS local service area. | Do not scan or commit `.venv/`. |

## Tests and validation

| Path | Responsibility | Notes |
| --- | --- | --- |
| `tests/` | Unit and integration tests. | Prefer narrow tests for the changed area. |
| `e2e/` | End-to-end tests. | Relevant for flows, mobile/PWA, and UI regressions. |
| `playwright-report/` | Generated Playwright report. | Do not treat as source. |
| `test-results/` | Generated test artifacts. | Do not treat as source. |
| `coverage/` | Generated coverage artifacts. | Do not treat as source. |

## Public and build assets

| Path | Responsibility | Notes |
| --- | --- | --- |
| `public/` | Static public assets and PWA resources. | PWA changes can affect install/mobile behavior. |
| `dist/` | Build output. | Generated; do not edit directly. |
| `build/` | Build output if present. | Generated; do not edit directly. |

## Scripts and development tooling

| Path | Responsibility | Notes |
| --- | --- | --- |
| `scripts/` | Project scripts and maintenance utilities. | Check callers before changing script behavior. |
| `dev/` | Development helpers and local tooling if present. | Verify whether scripts are active before editing. |

## High-risk boundaries

Use `docs/high-risk-runtime-boundaries.md` as the detailed safety guide. The table below is only the quick navigation list.

| Area | Risk |
| --- | --- |
| Browser TTS runtime | Audio playback, browser capability behavior, and user training flow can regress subtly. |
| Phrase progression | Mistakes can break session flow or scoring. |
| `playTtsFromWord` | Runtime playback behavior and word-level training can regress. |
| `resetSession` | Session lifecycle and persistence can regress. |
| TTS refs, timers, telemetry | Timing-sensitive and hard to validate casually. |
| `LowLatencyTextarea` | Typing latency and mobile behavior can regress. |
| Debounced session persistence | Local/profile-scoped state, pending sync, and reload behavior can regress. |
| Supabase auth/RLS/service role | Security and multi-user data boundaries. |
| OpenRouter routes/jobs/rate limits | Server/API behavior, model availability, and quotas. |
| PWA/mobile performance | Device-specific regressions. |
| CSS cascade/import order | Visual regressions can appear far from the edited file. |

## Change guidance

For code changes:

1. Identify the smallest path boundary to touch.
2. Inspect the source file and nearby tests.
3. Check `docs/module-test-map.md`.
4. Avoid mixing refactor and behavior changes.
5. Run the narrowest relevant validation first.
6. Check the staged diff before committing.

For documentation changes:

1. Update canonical docs before archiving historical docs.
2. Keep root docs short and link to `docs/`.
3. Preserve historical context unless it is clearly harmful.
4. Repair broken references in dedicated cleanup commits.

## Modularization decision layer

Use `docs/modularization-roi.md` before extracting, moving, or splitting repo areas. The repo map explains ownership; the ROI framework decides whether a proposed boundary is worth creating now.

## Adaptive Listening Brain

The adaptive listening brain is documented in `docs/adaptive-listening-brain.md`.

Primary runtime/code areas:

- `src/core/adaptive/AdaptiveDictationController.ts`
- `src/core/adaptive/types.ts`
- `src/core/adaptive/pacingReasonCodes.ts`
- `src/app/adaptiveControllerRegistry.ts`
- `src/app/useAdaptiveRuntime.ts`
- `src/app/browserTtsPlaybackPlan.ts`
- `src/inputs/browserTts/browserTtsTelemetryAdapter.ts`
- `src/inputs/browserTts/browserTtsAdaptiveProfiles.ts`
- `src/inputs/browserTts/browserTtsRatePolicy.ts`
- `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts`

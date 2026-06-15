# Repo-wide Modularization ROI Framework

Status: ACTIVE
Scope: whole repository
Last updated: 2026-06-15
Verified against branch: `product/input-2`
Verified against code baseline: post OpenRouter direct generation, job polling, and failure-policy extraction.
Test map checked: `docs/module-test-map.md`
Current App-shell checkpoint: `docs/app-shell-modularization-map.md`

## Rule

Modularization is useful only when it creates a real owner, lowers cognitive load, improves testability, or reduces future change risk.

Do **not** select work only because it removes lines from `src/App.tsx` or moves code into a new file.

## Current repo posture

Dicta is in consolidation phase.

Already completed:

- Browser TTS playback-loop ownership.
- TTS controls, metrics, telemetry, UI publishing, progress estimation, reset, and submit runtimes.
- Focused training runtime and delegate grouping.
- TTS orchestration runtime and delegate grouping.
- OpenRouter generation/model runtime extraction.
- OpenRouter direct generation lifecycle extraction.
- OpenRouter job polling lifecycle extraction.
- OpenRouter generation failure policy extraction.
- Auth/profile, session persistence, session creation, workspace session, app presentation, and route rendering ownership.

Default next step:

1. Prefer concrete product/runtime fixes.
2. Add characterization tests before touching high-risk behavior.
3. Update docs/test-map when ownership moves.
4. Avoid broad App-shell extraction unless a new owner/test seam is clear.

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

Do not start another broad App-shell or OpenRouter extraction by default.

The last OpenRouter lifecycle cuts created clear owners:

- `useOpenRouterDirectGenerationRuntime` for direct generation.
- `useOpenRouterJobPollingRuntime` for job polling/settlement.
- `openRouterGenerationFailurePolicy` for shared failure policy.

Next work should be selected from concrete bugs or product/runtime hardening. Use `docs/module-test-map.md` to choose validation.

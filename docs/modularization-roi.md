# Repo-wide Modularization ROI Framework

Status: ACTIVE
Scope: whole repository
Last updated: 2026-06-12

This is the canonical ROI framework for deciding whether a repo area should be modularized, left as-is, documented first, or postponed.

Use this document before proposing or implementing modularization in any part of Dicta. It applies to current code, historical components, and future features.

## Purpose

Modularization is not automatically good.

A modularization patch is valuable only when it creates a clearer ownership boundary, reduces cognitive load, improves testability, lowers future change risk, or makes the repo safer for human and agent contributors.

The expected output of each modularization iteration is a scorecard, a validation plan, and a decision.

## ROI definition

ROI means the expected repo benefit after preserving current product behavior.

For Dicta, high ROI comes from:

- reduced cognitive load in `src/App.tsx` or another overloaded owner file;
- a stronger test seam for behavior that is currently hard to characterize;
- easier future iteration in areas likely to change again;
- lower coupling between app orchestration, domain policy, adapters, persistence, and presentation;
- deletion or consolidation of repeated logic;
- improved ownership boundaries with explicit inputs and outputs;
- preserved product behavior, including Browser TTS playback, adaptive profile isolation, persistence, sync, auth, rate limits, and mobile/PWA performance.

Line reduction is useful evidence, but it is not the definition of ROI. A change can add total repo LOC and still have good ROI if it creates a durable test seam or separates a real ownership boundary.

## Risk definition

Risk is validation cost and blast radius, not an automatic veto.

For Dicta, risk comes from:

- probability of behavioral regression;
- blast radius if the behavior breaks;
- hidden coupling through refs, effects, timers, browser APIs, storage, or server contracts;
- test coverage gaps;
- observability gaps that make regressions hard to diagnose;
- rollback difficulty;
- manual QA burden, especially for Browser TTS, mobile/PWA, Supabase, OpenRouter, and CSS cascade behavior.

High risk means the extraction needs a smaller slice, stronger characterization tests, narrower manual smoke checks, and clearer rollback notes. Risk should block a candidate only when the change is not realistically testable, not reversible, cannot be bounded, or is too ambiguous to verify.

## ROI-first decision rule

Choose the highest-ROI candidate that can be bounded and validated.

Do not reject high-risk candidates automatically. Convert risk into required validation:

- characterization tests for existing behavior before movement;
- focused unit tests for pure helpers, state transitions, and policy decisions;
- integration tests for hooks, adapters, persistence, server routes, and sync boundaries;
- manual smoke checks for browser-only behavior, mobile/PWA behavior, auth, and playback;
- rollback notes that explain how to restore the previous owner and behavior.

Only reject or defer a candidate when it is unbounded, untestable, too ambiguous to verify, or mostly creates indirection without an ownership or testability payoff.

## ROI scoring model

Score ROI from 0 to 100.

| Category | Max | What earns points |
| --- | ---: | --- |
| Ownership boundary | 20 | The extracted unit has one clear responsibility and a stable owner area. |
| Testability | 20 | The extraction enables focused tests or strengthens existing tests. |
| Cognitive-load reduction | 15 | The caller becomes easier to understand without hiding essential flow. |
| Coupling reduction | 15 | The change isolates fragile behavior or makes inputs/outputs explicit. |
| Future change frequency | 10 | The area is likely to change again, so the boundary will pay back soon. |
| Agent-readiness | 10 | Future agents can inspect, modify, and validate the unit without scanning unrelated code. |
| Net codebase effect | 10 | The change reduces meaningful complexity, not just local LOC. |

## Validation-cost scoring

Score risk / validation cost separately from ROI, from 0 to 100.

| Cost range | Meaning |
| ---: | --- |
| 0-24 | Low validation cost; focused diff and direct tests are enough. |
| 25-49 | Moderate validation cost; add or update focused tests and inspect the relevant UI/API flow. |
| 50-74 | High validation cost; write characterization tests first and run integration or manual smoke checks. |
| 75-100 | Very high validation cost; split the candidate unless it is already bounded, reversible, and directly testable. |

Risk is not subtracted from ROI by default. Use it to size the execution plan. A candidate with ROI 90 and validation cost 85 may still be the right next target if the slice is bounded and the validation plan is realistic.

## Anti-pattern penalties

Apply these as ROI penalties because they reduce actual payoff.

| Penalty | Points | Trigger |
| --- | ---: | --- |
| Prop-drilling wrapper | -20 | Adds a component or hook mostly to pass props through. |
| String/copy extraction only | -15 | Moves text/constants without a behavioral or ownership boundary. |
| No test seam | -20 | The extraction does not enable useful characterization, unit, or integration coverage. |
| Hidden coupling stays hidden | -15 | The new module still depends on broad app state or unstable side effects without making the contract explicit. |
| Larger review surface without payoff | -10 | More files change without proportional clarity, ownership, or validation benefit. |
| Historical-doc drift | -10 | Candidate is based on historical docs without checking current source and tests. |

Do not apply a penalty merely because a candidate is high risk. Penalize only when the risk is not converted into a bounded plan.

## Decision bands

| ROI score | Default decision |
| ---: | --- |
| 85-100 | Strong candidate. Select if the validation plan bounds the risk. |
| 70-84 | Good candidate. Select when the diff is focused and tests are clear. |
| 50-69 | Investigate, characterize, or defer unless the slice is especially clean. |
| 30-49 | Usually reject or defer. Prefer tests, comments, or smaller cleanup. |
| 0-29 | Reject. The candidate is likely churn. |

The final decision must explain both ROI and validation cost.

## Required scorecard template

Before each modularization patch, record:

- Candidate name
- Current location / line range
- Proposed extraction target
- Expected net LOC movement
- Main behavior preserved
- ROI score
- Risk / validation cost score
- Required tests
- Required manual smoke checks
- Rollback plan
- Decision: select / defer / reject
- Reason

For high-risk candidates, also record:

- exact risk mechanisms, such as playback timing, lifecycle persistence, phrase progression, refs/timers, telemetry sampling, reset semantics, auth scoping, rate limits, or CSS cascade;
- stop conditions before editing;
- whether the first patch should add characterization tests only.

## Relationship to existing docs

Read this document with:

1. `docs/README.md`
2. `docs/agent-onboarding.md`
3. `docs/repo-map.md`
4. `docs/module-test-map.md`
5. `docs/high-risk-runtime-boundaries.md`

Historical modularization documents may explain why a boundary exists, but this document decides whether the next modularization iteration has enough ROI and a realistic validation plan.

## Current default recommendation

Use ROI-first selection. Prefer the highest-payoff candidate that can be bounded, tested, manually smoked where needed, and rolled back cleanly.

For high-risk runtime areas, do not default to avoidance. Start with characterization tests and a small reversible slice. Defer only when the candidate remains unbounded, untestable, or too ambiguous after inspection.

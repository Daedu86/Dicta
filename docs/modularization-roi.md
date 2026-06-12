# Repo-wide Modularization ROI Framework

Status: ACTIVE
Scope: whole repository
Last updated: 2026-06-12

This is the canonical ROI framework for deciding whether a repo area should be modularized, left as-is, documented first, or postponed.

Use this document before proposing or implementing modularization in any part of Dicta. It applies to current code, historical components, and future features.

## Purpose

Modularization is not automatically good.

A modularization patch is valuable only when it creates a clearer ownership boundary, reduces cognitive load, improves testability, lowers future change risk, or makes the repo safer for human and agent contributors.

The expected output of each modularization iteration is a score and a decision.

## Core rule

A modularization candidate must pass this question:

Will this extraction make the next correct change easier and safer?

If the answer is not clearly yes, do not modularize yet.

## ROI scoring model

Score every candidate from 0 to 100.

| Category | Max | What earns points |
| --- | ---: | --- |
| Ownership boundary | 20 | The extracted unit has one clear responsibility and a stable owner area. |
| Testability | 20 | The extraction enables focused tests or strengthens existing tests. |
| Cognitive-load reduction | 15 | The change makes the caller easier to understand without hiding essential flow. |
| Runtime-risk reduction | 15 | The change isolates fragile behavior or reduces accidental coupling. |
| Future change frequency | 10 | The area is likely to change again, so a boundary will pay back soon. |
| Agent-readiness | 10 | Future agents can inspect, modify, and validate the unit without scanning unrelated code. |
| Net codebase effect | 10 | The change reduces meaningful complexity, not just local LOC. |

## Penalties

| Penalty | Points | Trigger |
| --- | ---: | --- |
| High-risk runtime touch without dedicated test plan | -30 | Browser TTS playback, phrase progression, timers, refs, playTtsFromWord, or resetSession. |
| Prop-drilling wrapper | -20 | Adds a component or hook mostly to pass props through. |
| String/copy extraction only | -15 | Moves text/constants without a behavioral or ownership boundary. |
| Test gap | -20 | No existing or planned test protects the changed behavior. |
| Hidden coupling | -15 | New module still depends on broad app state or unstable side effects. |
| Larger review surface | -10 | More files changed without proportional clarity. |
| Historical-doc drift | -10 | Candidate is based on historical docs without checking current source. |

## Decision bands

| Final score | Decision |
| ---: | --- |
| 85-100 | Modularize now, with tests in the same patch or adjacent patch. |
| 70-84 | Modularize if validation is clear and the diff is small. |
| 50-69 | Investigate or document first; do not refactor yet unless risk is low. |
| 30-49 | Usually do not modularize. Prefer comments, tests, or smaller cleanup. |
| 0-29 | Do not modularize. The candidate is likely churn. |

## High-risk override

A high score does not authorize risky runtime rewrites.

If the candidate touches any area listed in docs/high-risk-runtime-boundaries.md, first identify the exact behavior that must not change, find or add focused tests, and keep the patch small.

## Required scorecard

Before each modularization patch, record:

- Candidate
- Current files
- Proposed boundary
- Current pain
- Expected payoff
- Behavior changed: yes/no
- High-risk boundary touched: yes/no
- Existing tests
- Tests to add or update
- Validation command
- Category scores
- Penalties
- Final score
- Decision
- Stop conditions

## Relationship to existing docs

Read this document with:

1. docs/README.md
2. docs/agent-onboarding.md
3. docs/repo-map.md
4. docs/module-test-map.md
5. docs/high-risk-runtime-boundaries.md

Historical modularization documents may explain why a boundary exists, but this document decides whether the next modularization iteration has enough ROI.

## Current default recommendation

Continue conservative modularization only when the candidate scores at least 70 and has a clear validation path.

For high-risk runtime areas, prefer documentation, characterization tests, and tiny extractions before moving behavior.

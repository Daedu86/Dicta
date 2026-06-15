# Repo-wide Modularization ROI Framework

Status: ACTIVE
Scope: whole repository
Last updated: 2026-06-15
Verified against branch: `product/input-2`
Verified against code baseline: post focused-training and TTS orchestration delegate-arg grouping; see `docs/app-shell-modularization-map.md` for the current App-shell checkpoint.
Source inspection command: `git status --short && git log --oneline --decorate -10 && git grep -n -e "buildFocusedTrainingRuntimeDelegateArgs" -e "buildTtsSessionOrchestrationDelegateArgs" -e "useOpenRouterGenerationRuntime" src/App.tsx src/app tests docs`
Test map checked: `docs/module-test-map.md`
Last candidate decision updated: see active candidate queue in `docs/app-shell-modularization-map.md`.

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
- preserved product behavior, including Browser TTS playback, adaptive profile isolation, persistence, sync, auth, rate limits, OpenRouter generation, and mobile/PWA performance.

Line reduction is useful evidence, but it is not the definition of ROI. A change can add total repo LOC and still have good ROI if it creates a durable test seam or separates a real ownership boundary.

## 2026 benchmark alignment

There is no repo-wide LOC threshold or universal module-size benchmark that defines successful modularization in Dicta. Modularization ROI should be evaluated by whether the change improves the safe flow of future work.

Use the ROI score together with evidence from:

- delivery flow: smaller review surface, clearer rollback path, and fewer unrelated files touched;
- validation flow: narrower tests, stronger characterization coverage, and explicit manual smoke checks for browser-only behavior;
- cognitive load: fewer unrelated concerns required to understand or modify the touched behavior;
- runtime safety: smaller blast radius for Browser TTS, persistence, auth, sync, Supabase, OpenRouter, PWA/mobile, and CSS cascade changes;
- agent-readiness: future human or AI contributors can inspect and modify the module through explicit inputs and outputs without scanning unrelated App shell state.

Do not use generated code volume, `src/App.tsx` LOC reduction, or number of extracted files as standalone success metrics. These are supporting signals only.

A candidate should be considered high ROI only when the scorecard can point to concrete evidence: the current owner, the proposed owner, the test seam created or strengthened, the runtime boundaries touched, the expected review size, and the rollback path.

## Documentation freshness rule

Every active modularization document must state the branch and code baseline it was verified against. If the documented baseline does not match current `HEAD`, treat candidate rankings, line numbers, LOC counts, and "next recommended pass" text as historical guidance only.

Before using any modularization document to drive implementation:

1. check current branch and `HEAD`;
2. inspect the current source around the candidate;
3. inspect the module-to-test map;
4. update stale line numbers or mark them as observational anchors;
5. prefer current source and tests over historical checkpoint text.

## AI-assisted implementation risk

AI-assisted modularization can increase output speed without improving maintainability. For AI-generated or AI-assisted refactors, require stricter evidence that the patch is small, reversible, and behavior-preserving.

Reject or split the candidate when:

- the hook or helper accepts one broad opaque App state object;
- the patch mixes behavior change with mechanical movement;
- the review surface grows without a clear ownership or testability payoff;
- the change touches more than one high-risk runtime boundary;
- the validation plan cannot be run before commit;
- the candidate mostly moves code to satisfy local LOC reduction.

AI assistance should be used to make small, explicit, test-backed seams easier to implement, not to justify broad runtime rewrites.

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

### Evidence calibration

Use the scale below to make scores comparable across iterations.

| Category | Low evidence | Medium evidence | High evidence |
| --- | --- | --- | --- |
| Ownership boundary | New name mostly wraps existing flow. | Responsibility is named but still depends on several unrelated concerns. | Module has a narrow responsibility, explicit inputs/outputs, and no broad opaque App state object. |
| Testability | Existing tests only run the broad app path. | One focused test can cover part of the moved behavior. | New or existing focused tests characterize the behavior without unrelated UI/runtime setup. |
| Cognitive-load reduction | Caller loses lines but still requires reading the old owner to understand behavior. | Caller becomes shorter and the extracted module has a readable contract. | Future change can be understood by reading the extracted module plus its focused tests. |
| Coupling reduction | Coupling moves to a new file unchanged. | Some refs/setters/effects are grouped with named dependencies. | Fragile dependencies become explicit, narrow, and independently reviewable. |
| Future change frequency | Area is unlikely to change or is already stable. | Area has occasional feature or bug-fix pressure. | Area is an active product/runtime seam where future changes are likely. |
| Agent-readiness | Future agents still need to scan unrelated code. | The module narrows the search area but needs surrounding context. | The module, tests, and map entry are enough to guide safe future edits. |
| Net codebase effect | More files and indirection without proportional clarity. | Local complexity drops without increasing global complexity much. | Meaningful complexity drops, review surface narrows, and validation becomes more targeted. |

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
- Review size / changed files estimate
- Runtime boundaries touched
- Main behavior preserved
- ROI score
- Risk / validation cost score
- Required narrow tests
- Required full validation command, when needed
- Required manual smoke checks
- Observed failure / recovery notes, when applicable
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
6. `docs/app-shell-modularization-map.md`

Historical modularization documents may explain why a boundary exists, but this document decides whether the next modularization iteration has enough ROI and a realistic validation plan.

## Current default recommendation

Use ROI-first selection, but treat the current App shell as a consolidation-phase area.

The major App-shell ownership moves are already implemented: focused training runtime, TTS session orchestration runtime, reset-session runtime, OpenRouter generation/model runtimes, auth/profile runtime, session persistence runtime, session creation runtime, workspace session runtime, app presentation runtime, route renderer, and Browser TTS playback-loop ownership.

The latest contract-cleanup passes also improved the two widest App-shell delegate seams:

1. `src/app/useFocusedTrainingRuntime.ts` now groups its delegate arguments internally without changing the caller-facing compatibility shape.
2. `src/app/useTtsSessionOrchestrationRuntime.ts` now groups its delegate arguments internally without changing the caller-facing compatibility shape.

Therefore, the default next step is no longer "extract more lines from `App.tsx`" or "keep grouping runtime contracts." Prefer:

1. product-visible fixes and runtime hardening, especially OpenRouter UX/jobs/errors/access messaging and mobile smoke paths;
2. documentation and test-map freshness when source ownership moves;
3. focused tests or characterization before touching Browser TTS, reset, persistence, auth/profile scoping, OpenRouter jobs, or PWA/mobile flow;
4. new modularization only when current source inspection finds a real owner/test seam, not local LOC reduction.

Reject any new App-shell extraction whose main justification is local LOC reduction. The current candidate queue and contract evaluation live in `docs/app-shell-modularization-map.md`.

## Latest App-shell checkpoint

On 2026-06-15, the App-shell checkpoint moved beyond broad extraction and initial delegate-contract grouping. The current baseline is:

1. `src/App.tsx` acts primarily as the composition root.
2. `src/app/useFocusedTrainingRuntime.ts` owns focused-training composition and delegates TTS work to `useTtsSessionOrchestrationRuntime`; its child delegate args are now internally grouped.
3. `src/app/useTtsSessionOrchestrationRuntime.ts` owns TTS orchestration across keyboard input, practice input, metrics, playback loop, controls, reset, and submit; its child delegate args are now internally grouped.
4. `src/app/useResetSessionRuntime.ts` owns reset-session side-effect sequencing. `resetSession` is no longer an active App-shell extraction candidate.
5. `src/app/useBrowserTtsPlaybackLoop.ts` remains the high-risk Browser TTS playback-loop owner. The expected chain is `App.tsx -> useFocusedTrainingRuntime -> useTtsSessionOrchestrationRuntime -> useBrowserTtsPlaybackLoop`.
6. `src/app/useOpenRouterGenerationRuntime.ts` and `src/app/useOpenRouterModelRuntime.ts` own OpenRouter generation/model wiring outside App.
7. Session, workspace, auth/profile, presentation, and route-rendering ownership have also moved into focused runtimes/components.

Future App-shell work should start from `docs/app-shell-modularization-map.md`, not from historical candidate rankings that predate these extractions.

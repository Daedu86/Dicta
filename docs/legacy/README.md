# Legacy Documentation

_Last updated: 2026-06-17_

This folder is the target home for historical documentation that should no longer drive active implementation.

## Current rule

Do not delete or move existing V1/V2 documentation until an active V3 replacement covers the same operational purpose.

Use this classification instead:

```text
Active V3 docs explain how the current system works.
Legacy docs preserve historical decisions and migration context.
```

## Active V3 references

- `docs/listening-cycle-v3-plan.md`
- `docs/listening-cycle-v3-architecture.md`

## Legacy definition

A document is legacy when it describes an older cycle or implementation rule that conflicts with the V3 baseline:

- timing controlled by a single global pause
- speed-first training goals
- causal reporting based mostly on WPM
- replay dependent on browser word-boundary events
- LLM-owned runtime pacing decisions
- undifferentiated listener diagnosis

## Migration rule

When migrating a legacy document:

1. Keep the old document available.
2. Add a short pointer to the active V3 replacement.
3. Do not remove historical rationale unless it is duplicated in the active V3 docs.
4. Prefer small documentation commits.
5. Run the focused V3 validation suite if code references are changed.

## V3 validation suite

```bash
npm test -- ttsDynamicChunkPlanner
npm test -- browserTtsPlaybackLoopPauseModel
npm test -- browserTtsVoiceCalibration
npm test -- listenerStateV3
npm test -- browserTtsSurgicalReplayPlan
npm test -- listeningCycleInsightReportV3
npm run build
```

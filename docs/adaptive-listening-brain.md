# Adaptive Listening Brain

This is the index for the adaptive listening brain KB. Keep it short and push detail into focused child docs.

## Start here

- [Adaptive Training Cycle](./adaptive-training-cycle.md)
- [Runtime Brain](./adaptive-listening-brain-runtime.md)
- [Decision Boundaries](./adaptive-listening-brain-boundaries.md)
- [Implementation Map](./adaptive-listening-brain-implementation-map.md)

## Scope

The adaptive brain is the runtime layer that observes live dictation/listening telemetry and adapts Browser TTS pacing, phrase sizing, pause behavior, replay pressure, and language-scoped feedback.

Keep the system coherent:

`live telemetry -> scoped controller -> Browser TTS policies -> benchmark/history feedback -> debug/reporting`

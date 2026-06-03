# Dicta (Local MVP)

Real-time, adaptive dictation trainer. Dicta runs locally (Vite + React) and adapts pace, chunking, and recovery behavior based on how you type, what language you are practicing, and what the current input mode can actually execute.

## Required Reading Before Changes

Before proposing or making code changes, read these files in order:

1. `AGENTS.md` for repo rules, guardrails, and the required change workflow.
2. `README.md` for product terminology, deployment assumptions, and current access/security model.
3. `docs/architecture.md` for topology, data flow, runtime boundaries, and known gaps.

After reading them, propose changes from the architecture. Do not start from an isolated file edit. A proposal should identify the affected boundary: browser, core TypeScript domain, input adapter, Vercel/server route, Supabase/RLS, or local-only sidecar. If the change touches adaptive behavior, it must also identify the affected `(inputMode, language)` profile and explain how neighboring profiles stay unchanged.

If a change updates behavior, keep `AGENTS.md`, `README.md`, and `docs/architecture.md` aligned.

## Product Overview
...(UNCHANGED CONTENT OMITTED FOR BREVITY)...
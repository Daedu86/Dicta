# Agent Onboarding

This document is the official technical onboarding path for agents working in the Dicta repository.

Its goal is to prevent agents from making changes based on stale checkpoints, incomplete repo context, or assumptions about fragile runtime areas.

## Required entry flow

Before proposing or making code changes, agents must follow this sequence:

1. Read `AGENTS.md`.
2. Read `README.md`.
3. Read `docs/README.md`.
4. Read this file.
5. Read `docs/architecture.md`.
6. Read `docs/documentation-inventory.md`.
7. Read any area-specific reference docs linked from `docs/README.md`.
8. Check the current branch and working tree.
9. Check recent commits.
10. Inspect the real source files and tests for the area being changed.
11. Propose the smallest safe change.
12. Run the narrowest relevant validation first.
13. Expand validation only when the change area requires it.

## Required repo checks

Run these before planning implementation work:

- `git status --short`
- `git log --oneline --decorate -8`

If the working tree is dirty, agents must identify whether the changes are user-authored or agent-authored before modifying files.

If the current branch does not match the expected working branch, agents must stop and ask for direction before writing changes.

## Source-of-truth order

When documents conflict, use this priority order:

1. Current source files.
2. Current tests.
3. `AGENTS.md`.
4. `docs/README.md`.
5. `docs/architecture.md`.
6. Area-specific active/reference docs.
7. Historical checkpoint docs.

Historical modularization docs are useful context, but they are not implementation authority unless verified against current files and tests.

## Scan exclusions

Agents should exclude generated, vendored, dependency, cache, and local environment directories from broad scans.

Do not use these paths for repo-wide documentation or source analysis unless there is a specific reason:

- `.git/`
- `node_modules/`
- `dist/`
- `coverage/`
- `build/`
- `.cache/`
- `playwright-report/`
- `test-results/`
- `services/kokoro_tts/.venv/`
- dependency README/license files

Preferred Markdown inventory command:

- `find . \( -path './.git' -o -path './node_modules' -o -path './dist' -o -path './coverage' -o -path './build' -o -path './services/kokoro_tts/.venv' \) -prune -o -name '*.md' -print | sort`

## High-risk areas

Agents must treat these areas as high-risk and avoid touching them without an explicit plan:

- Browser TTS runtime.
- Phrase progression.
- `playTtsFromWord`.
- `resetSession`.
- TTS refs, timers, and telemetry.
- Low-latency typing and `LowLatencyTextarea`.
- Debounced session persistence.
- Page lifecycle flush behavior.
- Supabase auth, RLS, and service-role boundaries.
- OpenRouter server routes, model refresh, jobs, and rate limits.
- PWA/mobile performance.
- CSS cascade and import order.

Changes in these areas require narrower inspection, relevant tests, and a clear rollback path.

## Safe change protocol

Prefer small, isolated changes.

For modularization work:

1. Extract pure helpers before runtime hooks when possible.
2. Preserve public behavior and prop contracts.
3. Keep naming consistent with existing modules.
4. Add or update focused tests for extracted logic.
5. Avoid mixing refactors with behavior changes.
6. Avoid opportunistic cleanup outside the selected boundary.
7. Commit only after checking the staged diff.

For documentation work:

1. Add canonical docs before moving or deleting historical docs.
2. Mark stale information before removing it.
3. Repair broken references after the replacement target exists.
4. Do not delete checkpoint docs only because they are old.
5. Prefer `docs/archive/` for historical material that still explains risk or context.

## Validation expectations

Use the narrowest relevant validation for the change.

Examples:

- Pure helper extraction: run the direct unit test for that helper.
- React hook extraction: run the hook or module test that covers the extracted logic.
- Input/typing changes: run low-latency textarea and performance gate tests.
- Supabase sync changes: run sync and persistence tests.
- OpenRouter changes: run OpenRouter route/job/model tests.
- Documentation-only changes: inspect Markdown diffs and run link/reference greps when relevant.

Before committing, always run:

- `git diff --stat`
- `git diff -- <changed-files>`
- `git status --short`

After committing, always run:

- `git status --short`
- `git log --oneline --decorate -8`

## Handling stale docs

If a document mentions an old baseline commit, agents must treat that hash as historical unless it matches current `HEAD`.

Known stale baseline references are tracked in `docs/documentation-inventory.md`.

If a document references a missing file, do not guess the target silently. Check `docs/documentation-inventory.md` and repair references in a dedicated documentation cleanup pass.

## Stop conditions

Agents should stop and ask for direction before writing changes when:

- The working tree has unexpected user changes.
- The requested change requires touching high-risk runtime areas.
- Current source files contradict the proposed documentation plan.
- The repo branch is not the expected branch.
- Tests fail in a way unrelated to the current change.
- A historical doc conflicts with current tests or source files.

## Current onboarding status

This document is part of the canonical documentation onboarding set.

Planned companion docs:

- `docs/repo-map.md`
- `docs/module-test-map.md`
- `docs/high-risk-runtime-boundaries.md`

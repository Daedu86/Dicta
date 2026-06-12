# Dicta Architecture Pointer

The repo-owned architecture source of truth is `docs/architecture.md`.

Agents should read, in order:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`

This root file exists so tools or agents looking for `ARCHITECTURE.md` do not miss the actual architecture document.

<!-- agent-kb-entry -->
## Agent architecture entry points

Use these docs before changing architecture or runtime boundaries:

- `docs/architecture.md` - current architecture map
- `docs/repo-map.md` - repository map
- `docs/module-test-map.md` - module/test map
- `docs/high-risk-runtime-boundaries.md` - high-risk runtime boundaries

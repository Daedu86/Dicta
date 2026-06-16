# Runtime access boundary

Date: 2026-06-16  
Branch: `product/input-2`

## Purpose

`src/app/useDictaAccessRuntime.ts` owns the access-oriented runtime wiring that previously lived inline in the app runtime root.

This boundary groups:

- Supabase runtime configuration and client creation.
- Auth/profile runtime.
- OpenRouter model/default model runtime.
- Admin file inventory runtime.
- Admin profile access actions.

## Why this boundary exists

`src/app/DictaAppRuntimeRoot.tsx` is the browser composition root. It should keep routing/training/workspace orchestration visible, but auth/admin/model access setup was a separable cluster with a clear dependency chain:

```text
useDictaSupabaseRuntime
  -> useAuthProfileRuntime
    -> useOpenRouterModelRuntime
    -> useAdminProfileAccessActions
  -> useAdminFileInventory
```

`useDictaAccessRuntime` keeps that chain together and returns the same public values consumed by the app composition root. `src/app/DictaAppRuntime.tsx` is only the export shim for `DictaAppRuntimeRoot`.

## Validation

When changing this boundary, run:

```bash
npx vitest run tests/dictaAccessRuntimeBoundary.test.ts tests/appProfiles.test.ts tests/supabaseProfileRoute.test.ts tests/workspaceModelRefreshRuntime.test.ts
npm run build
```

If admin inventory or local-dev behavior changes, also validate the admin workspace route manually in local dev.

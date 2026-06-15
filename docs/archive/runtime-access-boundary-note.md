# Runtime access boundary note

Date: 2026-06-15  
Branch: `product/input-2`

`useDictaAccessRuntime` extracts the access/admin/model setup from `DictaAppRuntime.tsx`.

It groups:

- `useDictaSupabaseRuntime`
- `useAuthProfileRuntime`
- `useOpenRouterModelRuntime`
- `useAdminFileInventory`
- `useAdminProfileAccessActions`

The intent is to reduce `DictaAppRuntime.tsx` while keeping the top-level app composition readable.

Validation target:

```bash
npx vitest run tests/dictaAccessRuntimeBoundary.test.ts tests/appProfiles.test.ts tests/supabaseProfileRoute.test.ts tests/workspaceModelRefreshRuntime.test.ts
npm run build
```

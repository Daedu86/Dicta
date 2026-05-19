# Dicta Supabase Multiuser Auth

This setup keeps the existing single-profile data and adds invite-only Supabase Auth.

## Free-tier fit

For the current family use case, Supabase free tier is enough: the app needs email/password Auth, one small Postgres database, and a few JSON sync rows per user. Vercel remains the static/app/API host.

## Migration order

1. Create your owner user in Supabase Auth.
2. Apply `supabase/migrations/20260519000000_dicta_multiuser_auth.sql` after replacing the commented bootstrap values:
   - `replace-with-current-admin-user-id`: your Supabase Auth user id.
   - `replace-with-current-profile-id`: the current `VITE_SUPABASE_SYNC_PROFILE_ID` value.
3. Keep `VITE_SUPABASE_SYNC_PROFILE_ID` in Vercel during rollout. It remains the legacy owner profile id and fallback.
4. Redeploy Vercel after env changes.
5. Sign in as admin, confirm existing sessions sync under your current profile, then create member users from Admin.

## Required env vars

Client-safe Vite vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SYNC_PROFILE_ID`

Server-only vars:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is used only by Vercel API routes for admin user creation and durable OpenRouter jobs. It must never be exposed through `VITE_*`.

## Behavior

- Users sign in with Supabase email/password.
- Each user is mapped to exactly one `dicta_app_profiles.profile_id`.
- Regular members can sync only their own `dicta_sync_items`.
- Admin can read all profiles and all sync rows through RLS.
- Session deletes remain tombstones in `dicta_sync_items`; do not hard-delete rows as the normal delete path.

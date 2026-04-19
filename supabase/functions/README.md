# Supabase Edge Functions

## `admin-orphan-users`

Lists Supabase Auth user IDs that do not yet have a `public.users` profile row.

1. Apply the Prisma migration that defines `public.admin_list_orphan_auth_user_ids()`.
2. In Supabase Dashboard → Edge Functions → set secrets: `ADMIN_ORPHAN_SECRET` (choose a long random value), `SUPABASE_SERVICE_ROLE_KEY` (often injected automatically; verify), `SUPABASE_URL`.
3. Deploy: `supabase functions deploy admin-orphan-users`
4. Call with header `x-admin-secret: <your secret>`.

This does not auto-create rows; use `POST /api/ensure-profile` from a signed-in client or extend the function later with an explicit `fix=1` mode if you accept the risk profile.

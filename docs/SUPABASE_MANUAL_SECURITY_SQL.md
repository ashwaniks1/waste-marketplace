# Supabase Manual Security SQL

Some Supabase-owned extension tables cannot be altered by the normal Prisma
migration role. Run these snippets in Supabase SQL Editor, or with an admin DB
role that owns the target object.

## PostGIS `public.spatial_ref_sys` RLS

`public.spatial_ref_sys` is PostGIS SRID metadata and may be owned by
`supabase_admin`. Enabling RLS requires that owner role. Keep read-only access
for `anon` and `authenticated` so geospatial metadata access is not changed for
clients or PostGIS helper flows.

```sql
alter table public.spatial_ref_sys enable row level security;

drop policy if exists "spatial_ref_sys_read_public" on public.spatial_ref_sys;
create policy "spatial_ref_sys_read_public"
on public.spatial_ref_sys
for select
to anon, authenticated
using (true);
```

-- Supabase storage policy for profile avatars.
-- This keeps avatar URLs public for the current getPublicUrl() client flow,
-- while limiting writes to the authenticated user's own avatar files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists "Public can view avatars" on storage.objects;
create policy "Public can view avatars"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload own avatars" on storage.objects;
create policy "Authenticated users can upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like 'avatars/' || auth.uid()::text || '-%'
);

drop policy if exists "Authenticated users can update own avatars" on storage.objects;
create policy "Authenticated users can update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like 'avatars/' || auth.uid()::text || '-%'
)
with check (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like 'avatars/' || auth.uid()::text || '-%'
);

drop policy if exists "Authenticated users can delete own avatars" on storage.objects;
create policy "Authenticated users can delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like 'avatars/' || auth.uid()::text || '-%'
);

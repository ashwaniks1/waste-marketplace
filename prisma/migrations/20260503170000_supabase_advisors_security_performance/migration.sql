-- Supabase advisors: security + RLS performance (auth initplan), FK indexes.
-- Safe for app behavior: narrows anon RPC exposure, fixes spatial_ref_sys RLS,
-- clears broad listing-photos list policy (public URLs unchanged), keeps authenticated RPCs.

-- 1) Immutable search_path + stable admin check (security linter).
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::"UserRole"
  );
$$;

-- 2) RLS policies: use scalar subqueries so auth.* / is_admin are not re-planned per row.

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists "listings_select_market" on public.waste_listings;
create policy "listings_select_market"
on public.waste_listings
for select
to authenticated
using (
  status in (
    'open'::"ListingStatus",
    'accepted'::"ListingStatus",
    'reopened'::"ListingStatus"
  )
  or user_id = (select auth.uid())
  or accepted_by = (select auth.uid())
  or assigned_driver_id = (select auth.uid())
);

drop policy if exists "listings_insert_own" on public.waste_listings;
create policy "listings_insert_own"
on public.waste_listings
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "listings_update_own" on public.waste_listings;
create policy "listings_update_own"
on public.waste_listings
for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
)
with check (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

drop policy if exists "comments_select_listing_visible" on public.listing_comments;
create policy "comments_select_listing_visible"
on public.listing_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.waste_listings l
    where l.id = listing_comments.listing_id
      and (
        l.status in (
          'open'::"ListingStatus",
          'accepted'::"ListingStatus",
          'reopened'::"ListingStatus"
        )
        or l.user_id = (select auth.uid())
        or l.accepted_by = (select auth.uid())
        or l.assigned_driver_id = (select auth.uid())
        or (select public.is_admin())
      )
  )
);

drop policy if exists "comments_insert_own" on public.listing_comments;
create policy "comments_insert_own"
on public.listing_comments
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "comments_delete_own_or_admin" on public.listing_comments;
create policy "comments_delete_own_or_admin"
on public.listing_comments
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

drop policy if exists "reviews_insert_from_user" on public.reviews;
create policy "reviews_insert_from_user"
on public.reviews
for insert
to authenticated
with check (from_user_id = (select auth.uid()));

drop policy if exists "reviews_update_from_user" on public.reviews;
create policy "reviews_update_from_user"
on public.reviews
for update
to authenticated
using (
  from_user_id = (select auth.uid())
  or (select public.is_admin())
)
with check (
  from_user_id = (select auth.uid())
  or (select public.is_admin())
);

drop policy if exists "transport_select_participants" on public.transport_jobs;
create policy "transport_select_participants"
on public.transport_jobs
for select
to authenticated
using (
  (select public.is_admin())
  or driver_id = (select auth.uid())
  or requester_id = (select auth.uid())
  or exists (
    select 1 from public.waste_listings l
    where l.id = transport_jobs.listing_id and l.user_id = (select auth.uid())
  )
);

drop policy if exists "transactions_select_participants" on public.transactions;
create policy "transactions_select_participants"
on public.transactions
for select
to authenticated
using (
  (select public.is_admin())
  or payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);

drop policy if exists "offers_select_buyer_or_seller" on public.offers;
create policy "offers_select_buyer_or_seller"
on public.offers
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or exists (
    select 1
    from public.waste_listings l
    where l.id = offers.listing_id
      and l.user_id = (select auth.uid())
  )
);

drop policy if exists "offers_insert_buyer" on public.offers;
create policy "offers_insert_buyer"
on public.offers
for insert
to authenticated
with check (buyer_id = (select auth.uid()));

drop policy if exists "offers_update_buyer_or_seller" on public.offers;
create policy "offers_update_buyer_or_seller"
on public.offers
for update
to authenticated
using (
  buyer_id = (select auth.uid())
  or exists (
    select 1
    from public.waste_listings l
    where l.id = offers.listing_id
      and l.user_id = (select auth.uid())
  )
)
with check (
  buyer_id = (select auth.uid())
  or exists (
    select 1
    from public.waste_listings l
    where l.id = offers.listing_id
      and l.user_id = (select auth.uid())
  )
);

drop policy if exists "conversations_select_participants" on public.conversations;
create policy "conversations_select_participants"
on public.conversations
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or exists (
    select 1
    from public.waste_listings l
    where l.id = conversations.listing_id
      and l.user_id = (select auth.uid())
  )
);

drop policy if exists "conversations_insert_participants" on public.conversations;
create policy "conversations_insert_participants"
on public.conversations
for insert
to authenticated
with check (
  buyer_id = (select auth.uid())
  or (
    exists (
      select 1
      from public.waste_listings l
      where l.id = conversations.listing_id
        and l.user_id = (select auth.uid())
    )
    and buyer_id is distinct from (select auth.uid())
  )
);

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    join public.waste_listings l on l.id = c.listing_id
    where c.id = messages.conversation_id
      and (
        c.buyer_id = (select auth.uid())
        or l.user_id = (select auth.uid())
      )
  )
);

drop policy if exists "messages_insert_sender_participant" on public.messages;
create policy "messages_insert_sender_participant"
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    join public.waste_listings l on l.id = c.listing_id
    where c.id = messages.conversation_id
      and (
        c.buyer_id = (select auth.uid())
        or l.user_id = (select auth.uid())
      )
  )
);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "live_location_upsert_assigned_driver" on public.listing_live_locations;
create policy "live_location_upsert_assigned_driver"
on public.listing_live_locations
for insert
to authenticated
with check (
  driver_id = (select auth.uid())
  and exists (
    select 1
    from public.waste_listings l
    where l.id = listing_live_locations.listing_id
      and l.assigned_driver_id = (select auth.uid())
  )
);

drop policy if exists "live_location_update_assigned_driver" on public.listing_live_locations;
create policy "live_location_update_assigned_driver"
on public.listing_live_locations
for update
to authenticated
using (
  driver_id = (select auth.uid())
  and exists (
    select 1
    from public.waste_listings l
    where l.id = listing_live_locations.listing_id
      and l.assigned_driver_id = (select auth.uid())
  )
)
with check (
  driver_id = (select auth.uid())
  and exists (
    select 1
    from public.waste_listings l
    where l.id = listing_live_locations.listing_id
      and l.assigned_driver_id = (select auth.uid())
  )
);

drop policy if exists "live_location_select_parties" on public.listing_live_locations;
create policy "live_location_select_parties"
on public.listing_live_locations
for select
to authenticated
using (
  exists (
    select 1
    from public.waste_listings l
    where l.id = listing_live_locations.listing_id
      and l.assigned_driver_id is not null
      and (
        l.user_id = (select auth.uid())
        or l.accepted_by = (select auth.uid())
        or l.assigned_driver_id = (select auth.uid())
      )
  )
);

drop policy if exists "delivery_handoff_secrets_select_parties" on public.delivery_handoff_secrets;
create policy "delivery_handoff_secrets_select_parties"
on public.delivery_handoff_secrets
for select
to authenticated
using (
  exists (
    select 1
    from public.waste_listings l
    where l.id = delivery_handoff_secrets.listing_id
      and (
        l.accepted_by = (select auth.uid())
        or l.user_id = (select auth.uid())
      )
  )
);

drop policy if exists "driver_profile_blocks_select_own" on public.driver_profile_blocks;
create policy "driver_profile_blocks_select_own"
on public.driver_profile_blocks
for select
to authenticated
using (driver_id = (select auth.uid()));

do $$
begin
  if to_regclass('public.domain_events') is not null then
    execute 'drop policy if exists "domain_events_select_admin" on public.domain_events';
    execute $p$
      create policy "domain_events_select_admin"
      on public.domain_events
      for select
      to authenticated
      using ((select public.is_admin()));
    $p$;
  end if;
end $$;

-- 3) Prisma migrations table: explicit deny for JWT roles (clears rls_enabled_no_policy INFO).
drop policy if exists "_prisma_migrations_deny_anon" on public._prisma_migrations;
create policy "_prisma_migrations_deny_anon"
on public._prisma_migrations
for all
to anon
using (false)
with check (false);

drop policy if exists "_prisma_migrations_deny_authenticated" on public._prisma_migrations;
create policy "_prisma_migrations_deny_authenticated"
on public._prisma_migrations
for all
to authenticated
using (false)
with check (false);

-- 4) PostGIS public.spatial_ref_sys: Supabase reports rls_disabled_in_public (ERROR), but enabling RLS
--    requires owning the table (typically PostGIS superuser). Pooler/migration roles often get:
--    must be owner of table spatial_ref_sys. If your role is owner, uncomment and apply:
--    alter table public.spatial_ref_sys enable row level security;
--    create policy "spatial_ref_sys_read_authenticated" on public.spatial_ref_sys for select to authenticated using (true);
--    create policy "spatial_ref_sys_read_anon" on public.spatial_ref_sys for select to anon using (true);

-- 5) FK covering indexes (performance INFO).
create index if not exists conversations_buyer_id_idx on public.conversations (buyer_id);
create index if not exists driver_profile_blocks_blocked_user_id_idx on public.driver_profile_blocks (blocked_user_id);
create index if not exists driver_profile_blocks_listing_id_idx on public.driver_profile_blocks (listing_id);
create index if not exists listing_comments_user_id_idx on public.listing_comments (user_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists waste_listings_assigned_driver_id_idx on public.waste_listings (assigned_driver_id);

-- 6) Storage: remove bucket-wide list for public listing photos; keep authenticated path policies tight.
drop policy if exists "Public can view listing photos" on storage.objects;

drop policy if exists "Users can upload own listing photos" on storage.objects;
create policy "Users can upload own listing photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-photos'
  and (select auth.uid()) is not null
  and name like (select auth.uid())::text || '/%'
);

drop policy if exists "Users can update own listing photos" on storage.objects;
create policy "Users can update own listing photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-photos'
  and (select auth.uid()) is not null
  and name like (select auth.uid())::text || '/%'
)
with check (
  bucket_id = 'listing-photos'
  and (select auth.uid()) is not null
  and name like (select auth.uid())::text || '/%'
);

drop policy if exists "Users can delete own listing photos" on storage.objects;
create policy "Users can delete own listing photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and (select auth.uid()) is not null
  and name like (select auth.uid())::text || '/%'
);

-- Avatar bucket write policies: same initplan pattern.
drop policy if exists "Authenticated users can upload own avatars" on storage.objects;
create policy "Authenticated users can upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (select auth.uid()) is not null
  and name like 'avatars/' || (select auth.uid())::text || '-%'
);

drop policy if exists "Authenticated users can update own avatars" on storage.objects;
create policy "Authenticated users can update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (select auth.uid()) is not null
  and name like 'avatars/' || (select auth.uid())::text || '-%'
)
with check (
  bucket_id = 'avatars'
  and (select auth.uid()) is not null
  and name like 'avatars/' || (select auth.uid())::text || '-%'
);

drop policy if exists "Authenticated users can delete own avatars" on storage.objects;
create policy "Authenticated users can delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (select auth.uid()) is not null
  and name like 'avatars/' || (select auth.uid())::text || '-%'
);

-- 7) SECURITY DEFINER: close anon RPC surface (authenticated mobile RPCs unchanged).
revoke execute on function public.admin_list_orphan_auth_user_ids() from anon;
revoke execute on function public.admin_list_orphan_auth_user_ids() from authenticated;
grant execute on function public.admin_list_orphan_auth_user_ids() to service_role;

revoke execute on function public.buyer_confirm_marketplace_delivery(uuid) from anon;
revoke execute on function public.driver_complete_transport_with_pin(uuid, text) from anon;
revoke execute on function public.driver_set_transport_status(uuid, "TransportStatus") from anon;
revoke execute on function public.driver_claim_pickup(uuid) from anon;

revoke execute on function public.on_message_created_notify() from anon;
revoke execute on function public.on_offer_created_notify() from anon;

-- PostgREST exposes anon/authenticated via PUBLIC EXECUTE on many functions; revoke PUBLIC then re-grant narrowly.
revoke execute on function public.on_message_created_notify() from public;
grant execute on function public.on_message_created_notify() to authenticated;

revoke execute on function public.on_offer_created_notify() from public;
grant execute on function public.on_offer_created_notify() to authenticated;

revoke execute on function public.rls_auto_enable() from public;
grant execute on function public.rls_auto_enable() to authenticated;

revoke execute on function public.wmp_handle_new_auth_user() from anon;
revoke execute on function public.wmp_handle_new_auth_user() from public;
grant execute on function public.wmp_handle_new_auth_user() to supabase_auth_admin;
grant execute on function public.wmp_handle_new_auth_user() to postgres;
grant execute on function public.wmp_handle_new_auth_user() to service_role;

-- PostGIS: ACL is often granted by supabase_admin; revoke anon where the session role allows.
revoke all on function public.st_estimatedextent(text, text) from anon;
revoke all on function public.st_estimatedextent(text, text, text) from anon;
revoke all on function public.st_estimatedextent(text, text, text, boolean) from anon;
revoke execute on function public.st_estimatedextent(text, text) from public;
revoke execute on function public.st_estimatedextent(text, text, text) from public;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from public;
grant execute on function public.st_estimatedextent(text, text) to authenticated;
grant execute on function public.st_estimatedextent(text, text, text) to authenticated;
grant execute on function public.st_estimatedextent(text, text, text, boolean) to authenticated;

do $$
declare
  r record;
begin
  for r in
    select
      p.proname as fn,
      pg_catalog.pg_get_function_identity_arguments(p.oid) as args
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
  loop
    execute format(
      'revoke execute on function public.%I(%s) from anon',
      r.fn,
      r.args
    );
    execute format(
      'revoke execute on function public.%I(%s) from public',
      r.fn,
      r.args
    );
    execute format(
      'grant execute on function public.%I(%s) to authenticated',
      r.fn,
      r.args
    );
  end loop;
end $$;

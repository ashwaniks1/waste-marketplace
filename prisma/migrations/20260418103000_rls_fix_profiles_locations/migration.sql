-- Fix RLS recursion + add public profiles + live driver location.
-- Goal: eliminate "stack limit exceeded" from self-referential policies,
-- while enabling mobile to load listings/chat and view other users safely.

-- 1) Remove the recursive admin policy path.
--    Keep admin operations server-side via service_role / Edge Functions.
drop policy if exists "users_select_admin" on public.users;
drop policy if exists "platform_settings_select_admin" on public.platform_settings;

-- 2) Recreate core policies without calling is_admin().
-- USERS: own profile only (full row).
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- WASTE LISTINGS: market listings (open/accepted) + parties involved.
drop policy if exists "listings_select_market" on public.waste_listings;
create policy "listings_select_market"
on public.waste_listings
for select
to authenticated
using (
  status in ('open'::"ListingStatus", 'accepted'::"ListingStatus")
  or user_id = auth.uid()
  or accepted_by = auth.uid()
  or assigned_driver_id = auth.uid()
);

-- OFFERS: buyer or listing owner.
drop policy if exists "offers_select_buyer_or_seller" on public.offers;
create policy "offers_select_buyer_or_seller"
on public.offers
for select
to authenticated
using (
  buyer_id = auth.uid()
  or exists (
    select 1
    from public.waste_listings l
    where l.id = offers.listing_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists "offers_insert_buyer" on public.offers;
create policy "offers_insert_buyer"
on public.offers
for insert
to authenticated
with check (buyer_id = auth.uid());

drop policy if exists "offers_update_buyer_or_seller" on public.offers;
create policy "offers_update_buyer_or_seller"
on public.offers
for update
to authenticated
using (
  buyer_id = auth.uid()
  or exists (
    select 1
    from public.waste_listings l
    where l.id = offers.listing_id
      and l.user_id = auth.uid()
  )
)
with check (
  buyer_id = auth.uid()
  or exists (
    select 1
    from public.waste_listings l
    where l.id = offers.listing_id
      and l.user_id = auth.uid()
  )
);

-- CONVERSATIONS: buyer or listing owner.
drop policy if exists "conversations_select_participants" on public.conversations;
create policy "conversations_select_participants"
on public.conversations
for select
to authenticated
using (
  buyer_id = auth.uid()
  or exists (
    select 1
    from public.waste_listings l
    where l.id = conversations.listing_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists "conversations_insert_buyer" on public.conversations;
create policy "conversations_insert_buyer"
on public.conversations
for insert
to authenticated
with check (buyer_id = auth.uid());

-- MESSAGES: participants of the conversation (buyer or seller via listing ownership).
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
      and (c.buyer_id = auth.uid() or l.user_id = auth.uid())
  )
);

drop policy if exists "messages_insert_sender_participant" on public.messages;
create policy "messages_insert_sender_participant"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    join public.waste_listings l on l.id = c.listing_id
    where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or l.user_id = auth.uid())
  )
);

-- NOTIFICATIONS: own only.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 3) Public profiles table (safe subset) so users can view other users.
create table if not exists public.user_public_profiles (
  id uuid primary key,
  name text not null,
  role "UserRole" not null,
  avatar_url text,
  vehicle_type text,
  zip_code text,
  profile_lat double precision,
  profile_lng double precision,
  updated_at timestamptz not null default now(),
  constraint user_public_profiles_id_fkey
    foreign key (id) references public.users(id) on delete cascade
);

alter table public.user_public_profiles enable row level security;

drop policy if exists "public_profiles_select_authenticated" on public.user_public_profiles;
create policy "public_profiles_select_authenticated"
on public.user_public_profiles
for select
to authenticated
using (true);

-- Keep writes locked down (no insert/update/delete policies).

create schema if not exists private;

-- Sync function for public profile rows (runs as definer).
create or replace function private.sync_user_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    delete from public.user_public_profiles where id = old.id;
    return old;
  end if;

  insert into public.user_public_profiles (
    id, name, role, avatar_url, vehicle_type, zip_code, profile_lat, profile_lng, updated_at
  )
  values (
    new.id,
    new.name,
    new.role,
    new.avatar_url,
    new.vehicle_type,
    new.zip_code,
    new.profile_lat,
    new.profile_lng,
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    role = excluded.role,
    avatar_url = excluded.avatar_url,
    vehicle_type = excluded.vehicle_type,
    zip_code = excluded.zip_code,
    profile_lat = excluded.profile_lat,
    profile_lng = excluded.profile_lng,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists trg_sync_user_public_profile on public.users;
create trigger trg_sync_user_public_profile
after insert or update or delete on public.users
for each row execute function private.sync_user_public_profile();

-- Backfill existing users.
insert into public.user_public_profiles (id, name, role, avatar_url, vehicle_type, zip_code, profile_lat, profile_lng, updated_at)
select id, name, role, avatar_url, vehicle_type, zip_code, profile_lat, profile_lng, now()
from public.users
on conflict (id) do nothing;

-- 4) Live driver location (latest point per listing/job).
create table if not exists public.listing_live_locations (
  listing_id uuid primary key,
  driver_id uuid not null,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  speed double precision,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_live_locations_listing_id_fkey
    foreign key (listing_id) references public.waste_listings(id) on delete cascade
);

create index if not exists listing_live_locations_driver_id_idx on public.listing_live_locations(driver_id);

alter table public.listing_live_locations enable row level security;

-- Driver can upsert their own location *only* when assigned to that listing.
drop policy if exists "live_location_upsert_assigned_driver" on public.listing_live_locations;
create policy "live_location_upsert_assigned_driver"
on public.listing_live_locations
for insert
to authenticated
with check (
  driver_id = auth.uid()
  and exists (
    select 1
    from public.waste_listings l
    where l.id = listing_live_locations.listing_id
      and l.assigned_driver_id = auth.uid()
  )
);

drop policy if exists "live_location_update_assigned_driver" on public.listing_live_locations;
create policy "live_location_update_assigned_driver"
on public.listing_live_locations
for update
to authenticated
using (
  driver_id = auth.uid()
  and exists (
    select 1
    from public.waste_listings l
    where l.id = listing_live_locations.listing_id
      and l.assigned_driver_id = auth.uid()
  )
)
with check (
  driver_id = auth.uid()
  and exists (
    select 1
    from public.waste_listings l
    where l.id = listing_live_locations.listing_id
      and l.assigned_driver_id = auth.uid()
  )
);

-- Seller or buyer (acceptor) can view live location once a driver is assigned.
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
        l.user_id = auth.uid()
        or l.accepted_by = auth.uid()
        or l.assigned_driver_id = auth.uid()
      )
  )
);

-- Realtime: add live locations too.
alter table public.listing_live_locations replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'listing_live_locations'
  ) then
    alter publication supabase_realtime add table public.listing_live_locations;
  end if;
end $$;


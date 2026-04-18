-- RLS + Realtime + PostGIS baseline for mobile (Buyer/Seller/Driver).
-- This migration is intentionally idempotent where possible.

-- Enable PostGIS for distance-based jobs / matching.
create extension if not exists postgis;

-- Helper: admin check from the app profile table (public.users).
-- Note: auth.uid() is null for anon.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'::"UserRole"
  );
$$;

-- Enable RLS on core public tables.
alter table public.users enable row level security;
alter table public.waste_listings enable row level security;
alter table public.offers enable row level security;
alter table public.listing_comments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.transport_jobs enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_settings enable row level security;

-- USERS (profiles)
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

drop policy if exists "users_select_admin" on public.users;
create policy "users_select_admin"
on public.users
for select
to authenticated
using (public.is_admin());

-- WASTE LISTINGS
-- Visible to authenticated users when open/accepted, plus always visible to parties involved.
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
  or public.is_admin()
);

drop policy if exists "listings_insert_own" on public.waste_listings;
create policy "listings_insert_own"
on public.waste_listings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "listings_update_own" on public.waste_listings;
create policy "listings_update_own"
on public.waste_listings
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- OFFERS
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
      and (l.user_id = auth.uid() or public.is_admin())
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
      and (l.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  buyer_id = auth.uid()
  or exists (
    select 1
    from public.waste_listings l
    where l.id = offers.listing_id
      and (l.user_id = auth.uid() or public.is_admin())
  )
);

-- LISTING COMMENTS
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
        l.status in ('open'::"ListingStatus", 'accepted'::"ListingStatus")
        or l.user_id = auth.uid()
        or l.accepted_by = auth.uid()
        or l.assigned_driver_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "comments_insert_own" on public.listing_comments;
create policy "comments_insert_own"
on public.listing_comments
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "comments_delete_own_or_admin" on public.listing_comments;
create policy "comments_delete_own_or_admin"
on public.listing_comments
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- CONVERSATIONS (listing + buyer; seller is listing owner)
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
      and (l.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "conversations_insert_buyer" on public.conversations;
create policy "conversations_insert_buyer"
on public.conversations
for insert
to authenticated
with check (buyer_id = auth.uid());

-- MESSAGES
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
        c.buyer_id = auth.uid()
        or l.user_id = auth.uid()
        or public.is_admin()
      )
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
      and (
        c.buyer_id = auth.uid()
        or l.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

-- REVIEWS
drop policy if exists "reviews_select_authenticated" on public.reviews;
create policy "reviews_select_authenticated"
on public.reviews
for select
to authenticated
using (true);

drop policy if exists "reviews_insert_from_user" on public.reviews;
create policy "reviews_insert_from_user"
on public.reviews
for insert
to authenticated
with check (from_user_id = auth.uid());

drop policy if exists "reviews_update_from_user" on public.reviews;
create policy "reviews_update_from_user"
on public.reviews
for update
to authenticated
using (from_user_id = auth.uid() or public.is_admin())
with check (from_user_id = auth.uid() or public.is_admin());

-- TRANSPORT JOBS
drop policy if exists "transport_select_participants" on public.transport_jobs;
create policy "transport_select_participants"
on public.transport_jobs
for select
to authenticated
using (
  public.is_admin()
  or driver_id = auth.uid()
  or requester_id = auth.uid()
  or exists (
    select 1 from public.waste_listings l
    where l.id = transport_jobs.listing_id and l.user_id = auth.uid()
  )
);

-- TRANSACTIONS
drop policy if exists "transactions_select_participants" on public.transactions;
create policy "transactions_select_participants"
on public.transactions
for select
to authenticated
using (
  public.is_admin()
  or payer_id = auth.uid()
  or payee_id = auth.uid()
);

-- NOTIFICATIONS
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- PLATFORM SETTINGS (admin only)
drop policy if exists "platform_settings_select_admin" on public.platform_settings;
create policy "platform_settings_select_admin"
on public.platform_settings
for select
to authenticated
using (public.is_admin());

-- Realtime: add core tables (chat + notifications + optional listings).
-- Also set replica identity to full (useful for future UPDATE events).
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
alter table public.notifications replica identity full;

do $$
declare
  r record;
  tbl text;
begin
  foreach tbl in array array['messages','conversations','notifications'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', tbl);
    end if;
  end loop;
end $$;


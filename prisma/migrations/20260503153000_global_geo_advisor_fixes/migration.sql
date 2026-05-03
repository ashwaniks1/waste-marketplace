-- Advisor follow-up for the global geo rollout.
-- Keep new geo RLS policies efficient and add the missing FK covering index.

create index if not exists driver_service_profiles_base_location_id_idx
  on public.driver_service_profiles (base_location_id);

drop policy if exists "geo_locations_insert_own" on public.geo_locations;
create policy "geo_locations_insert_own"
on public.geo_locations
for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "geo_locations_update_own" on public.geo_locations;
create policy "geo_locations_update_own"
on public.geo_locations
for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

drop policy if exists "geo_locations_select_linked_or_own" on public.geo_locations;
create policy "geo_locations_select_linked_or_own"
on public.geo_locations
for select
to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.users u
    where u.primary_location_id = geo_locations.id
      and u.id = (select auth.uid())
  )
  or exists (
    select 1
    from public.waste_listings l
    where l.pickup_location_id = geo_locations.id
      and (
        l.status in ('open'::"ListingStatus", 'reopened'::"ListingStatus", 'accepted'::"ListingStatus")
        or l.user_id = (select auth.uid())
        or l.accepted_by = (select auth.uid())
        or l.assigned_driver_id = (select auth.uid())
      )
  )
  or exists (
    select 1
    from public.transport_jobs tj
    where (tj.pickup_location_id = geo_locations.id or tj.dropoff_location_id = geo_locations.id)
      and (
        tj.driver_id = (select auth.uid())
        or tj.requester_id = (select auth.uid())
        or exists (
          select 1 from public.waste_listings l
          where l.id = tj.listing_id and l.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "driver_service_profiles_select_own" on public.driver_service_profiles;
create policy "driver_service_profiles_select_own"
on public.driver_service_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "driver_service_profiles_insert_own" on public.driver_service_profiles;
create policy "driver_service_profiles_insert_own"
on public.driver_service_profiles
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "driver_service_profiles_update_own" on public.driver_service_profiles;
create policy "driver_service_profiles_update_own"
on public.driver_service_profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke execute on function public.driver_claim_pickup(uuid) from anon;

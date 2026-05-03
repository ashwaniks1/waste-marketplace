-- Global geospatial-first location model.
-- This migration is additive: legacy address/lat/lng fields remain for web/mobile
-- compatibility while new writes move toward normalized geo_locations references.

create extension if not exists postgis;
create schema if not exists private;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'LocationSource') then
    create type "LocationSource" as enum ('manual', 'browser_gps', 'mobile_gps', 'geocoder', 'backfill');
  end if;
  if not exists (select 1 from pg_type where typname = 'VisibilityScope') then
    create type "VisibilityScope" as enum ('local', 'national', 'international');
  end if;
  if not exists (select 1 from pg_type where typname = 'DriverOperatingScope') then
    create type "DriverOperatingScope" as enum ('local', 'national');
  end if;
end $$;

create table if not exists public.geo_locations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  label text,
  street text,
  city text,
  state text,
  postal_code text,
  country_code char(2) not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  point geography(Point, 4326) not null,
  geohash text not null,
  timezone text,
  formatted_address text,
  source "LocationSource" not null default 'manual',
  provider_place_id text,
  raw_provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint geo_locations_created_by_fkey
    foreign key (created_by) references public.users(id) on delete set null,
  constraint geo_locations_country_code_upper_chk
    check (country_code = upper(country_code))
);

create or replace function private.set_geo_location_derived()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.country_code := upper(new.country_code);
  new.point := ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326)::geography;
  new.geohash := ST_GeoHash(ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326), 12);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_geo_locations_derived on public.geo_locations;
create trigger trg_geo_locations_derived
before insert or update of latitude, longitude, country_code on public.geo_locations
for each row execute function private.set_geo_location_derived();

create index if not exists geo_locations_point_gist
  on public.geo_locations using gist (point);
create index if not exists geo_locations_country_region_idx
  on public.geo_locations (country_code, state, city);
create index if not exists geo_locations_geohash_prefix_idx
  on public.geo_locations (geohash text_pattern_ops);
create index if not exists geo_locations_created_by_idx
  on public.geo_locations (created_by);

alter table public.geo_locations enable row level security;

drop policy if exists "geo_locations_insert_own" on public.geo_locations;
create policy "geo_locations_insert_own"
on public.geo_locations
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "geo_locations_update_own" on public.geo_locations;
create policy "geo_locations_update_own"
on public.geo_locations
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

alter table public.users
  add column if not exists primary_location_id uuid,
  add constraint users_primary_location_id_fkey
    foreign key (primary_location_id) references public.geo_locations(id) on delete set null;

alter table public.waste_listings
  add column if not exists pickup_location_id uuid,
  add column if not exists visibility_scope "VisibilityScope" not null default 'local',
  add column if not exists origin_city text,
  add column if not exists origin_state text,
  add column if not exists origin_postal_code text,
  add column if not exists origin_country_code char(2),
  add column if not exists pickup_point geography(Point, 4326),
  add column if not exists pickup_geohash text,
  add constraint waste_listings_pickup_location_id_fkey
    foreign key (pickup_location_id) references public.geo_locations(id) on delete set null,
  add constraint waste_listings_origin_country_code_upper_chk
    check (origin_country_code is null or origin_country_code = upper(origin_country_code));

alter table public.transport_jobs
  add column if not exists pickup_location_id uuid,
  add column if not exists dropoff_location_id uuid,
  add column if not exists service_scope "DriverOperatingScope" not null default 'local',
  add constraint transport_jobs_pickup_location_id_fkey
    foreign key (pickup_location_id) references public.geo_locations(id) on delete set null,
  add constraint transport_jobs_dropoff_location_id_fkey
    foreign key (dropoff_location_id) references public.geo_locations(id) on delete set null;

drop policy if exists "geo_locations_select_linked_or_own" on public.geo_locations;
create policy "geo_locations_select_linked_or_own"
on public.geo_locations
for select
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.users u
    where u.primary_location_id = geo_locations.id
      and u.id = auth.uid()
  )
  or exists (
    select 1
    from public.waste_listings l
    where l.pickup_location_id = geo_locations.id
      and (
        l.status in ('open'::"ListingStatus", 'reopened'::"ListingStatus", 'accepted'::"ListingStatus")
        or l.user_id = auth.uid()
        or l.accepted_by = auth.uid()
        or l.assigned_driver_id = auth.uid()
      )
  )
  or exists (
    select 1
    from public.transport_jobs tj
    where (tj.pickup_location_id = geo_locations.id or tj.dropoff_location_id = geo_locations.id)
      and (
        tj.driver_id = auth.uid()
        or tj.requester_id = auth.uid()
        or exists (
          select 1 from public.waste_listings l
          where l.id = tj.listing_id and l.user_id = auth.uid()
        )
      )
  )
);

create table if not exists public.driver_service_profiles (
  user_id uuid primary key,
  operating_scope "DriverOperatingScope" not null default 'local',
  base_location_id uuid,
  country_code char(2) not null,
  state text,
  city text,
  service_radius_meters integer check (service_radius_meters is null or service_radius_meters > 0),
  enabled_country_codes text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_service_profiles_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade,
  constraint driver_service_profiles_base_location_id_fkey
    foreign key (base_location_id) references public.geo_locations(id) on delete set null,
  constraint driver_service_profiles_country_code_upper_chk
    check (country_code = upper(country_code))
);

alter table public.driver_service_profiles enable row level security;

drop policy if exists "driver_service_profiles_select_own" on public.driver_service_profiles;
create policy "driver_service_profiles_select_own"
on public.driver_service_profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "driver_service_profiles_insert_own" on public.driver_service_profiles;
create policy "driver_service_profiles_insert_own"
on public.driver_service_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "driver_service_profiles_update_own" on public.driver_service_profiles;
create policy "driver_service_profiles_update_own"
on public.driver_service_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists users_primary_location_id_idx
  on public.users (primary_location_id);
create index if not exists waste_listings_pickup_location_id_idx
  on public.waste_listings (pickup_location_id);
create index if not exists waste_listings_visibility_region_idx
  on public.waste_listings (status, visibility_scope, origin_country_code, origin_state, origin_city);
create index if not exists waste_listings_pickup_point_gist
  on public.waste_listings using gist (pickup_point);
create index if not exists waste_listings_pickup_geohash_prefix_idx
  on public.waste_listings (pickup_geohash text_pattern_ops);
create index if not exists transport_jobs_pickup_location_id_idx
  on public.transport_jobs (pickup_location_id);
create index if not exists transport_jobs_dropoff_location_id_idx
  on public.transport_jobs (dropoff_location_id);
create index if not exists driver_service_profiles_scope_idx
  on public.driver_service_profiles (country_code, operating_scope);

create or replace function private.sync_listing_pickup_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  loc record;
begin
  if new.pickup_location_id is null then
    return new;
  end if;

  select * into loc
  from public.geo_locations
  where id = new.pickup_location_id;

  if not found then
    return new;
  end if;

  new.origin_city := loc.city;
  new.origin_state := loc.state;
  new.origin_postal_code := loc.postal_code;
  new.origin_country_code := loc.country_code;
  new.pickup_point := loc.point;
  new.pickup_geohash := loc.geohash;
  new.latitude := loc.latitude;
  new.longitude := loc.longitude;
  new.pickup_zip := coalesce(loc.postal_code, new.pickup_zip);
  new.address := coalesce(nullif(new.address, ''), loc.formatted_address, concat_ws(', ', loc.street, loc.city, loc.state, loc.postal_code, loc.country_code));

  return new;
end;
$$;

drop trigger if exists trg_waste_listings_pickup_location on public.waste_listings;
create trigger trg_waste_listings_pickup_location
before insert or update of pickup_location_id on public.waste_listings
for each row execute function private.sync_listing_pickup_location();

create or replace function private.sync_live_location_derived()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.point := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  new.geohash := ST_GeoHash(ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326), 12);
  new.updated_at := now();
  new.expires_at := coalesce(new.expires_at, new.recorded_at + interval '15 minutes');
  return new;
end;
$$;

alter table public.listing_live_locations
  add column if not exists point geography(Point, 4326),
  add column if not exists geohash text,
  add column if not exists accuracy_m double precision,
  add column if not exists expires_at timestamptz;

drop trigger if exists trg_listing_live_locations_derived on public.listing_live_locations;
create trigger trg_listing_live_locations_derived
before insert or update of lat, lng, recorded_at, expires_at on public.listing_live_locations
for each row execute function private.sync_live_location_derived();

create index if not exists listing_live_locations_point_gist
  on public.listing_live_locations using gist (point);
create index if not exists listing_live_locations_expires_at_idx
  on public.listing_live_locations (expires_at);

do $$
declare
  l record;
  new_location_id uuid;
begin
  for l in
    select wl.id, wl.user_id, wl.address, wl.pickup_zip, wl.latitude, wl.longitude, u.country_code, u.timezone
    from public.waste_listings wl
    left join public.users u on u.id = wl.user_id
    where wl.pickup_location_id is null
      and wl.latitude is not null
      and wl.longitude is not null
  loop
    insert into public.geo_locations (
      created_by, label, postal_code, country_code, latitude, longitude, timezone, formatted_address, source
    )
    values (
      l.user_id,
      'Listing pickup',
      l.pickup_zip,
      coalesce(upper(l.country_code), 'US'),
      l.latitude,
      l.longitude,
      l.timezone,
      l.address,
      'backfill'
    )
    returning id into new_location_id;

    update public.waste_listings
    set pickup_location_id = new_location_id
    where id = l.id;
  end loop;
end $$;

do $$
declare
  u record;
  new_location_id uuid;
begin
  for u in
    select id, address, zip_code, profile_lat, profile_lng, country_code, timezone
    from public.users
    where primary_location_id is null
      and profile_lat is not null
      and profile_lng is not null
  loop
    insert into public.geo_locations (
      created_by, label, postal_code, country_code, latitude, longitude, timezone, formatted_address, source
    )
    values (
      u.id,
      'Profile location',
      u.zip_code,
      coalesce(upper(u.country_code), 'US'),
      u.profile_lat,
      u.profile_lng,
      u.timezone,
      u.address,
      'backfill'
    )
    returning id into new_location_id;

    update public.users
    set primary_location_id = new_location_id
    where id = u.id;
  end loop;
end $$;

update public.listing_live_locations
set
  lat = lat,
  lng = lng,
  expires_at = coalesce(expires_at, recorded_at + interval '15 minutes')
where point is null or geohash is null or expires_at is null;

drop view if exists public.listing_public_feed;

create view public.listing_public_feed
with (security_invoker = true) as
select
  l.id,
  l.waste_type,
  l.quantity,
  l.title,
  l.description,
  l.asking_price,
  l.currency,
  l.status,
  l.address,
  l.images,
  l.delivery_required,
  l.delivery_fee,
  l.pickup_job_status,
  l.pickup_zip,
  l.latitude,
  l.longitude,
  l.assigned_driver_id,
  l.accepted_by,
  l.user_id as seller_id,
  l.created_at,
  l.driver_commission_amount,
  l.driver_commission_percent,
  l.commission_kind,
  coalesce(p.name, 'Seller') as seller_name,
  p.avatar_url as seller_avatar_url,
  p.role as seller_role,
  l.delivery_privacy_locked,
  l.buyer_delivery_confirmed,
  l.visibility_scope,
  l.origin_city,
  l.origin_state,
  l.origin_postal_code,
  l.origin_country_code,
  l.pickup_geohash,
  l.pickup_location_id,
  jsonb_build_object(
    'id', gl.id,
    'label', gl.label,
    'street', gl.street,
    'city', gl.city,
    'state', gl.state,
    'postalCode', gl.postal_code,
    'country', gl.country_code,
    'latitude', gl.latitude,
    'longitude', gl.longitude,
    'geohash', gl.geohash,
    'timezone', gl.timezone,
    'formattedAddress', gl.formatted_address
  ) as pickup_location
from public.waste_listings l
left join public.user_public_profiles p on p.id = l.user_id
left join public.geo_locations gl on gl.id = l.pickup_location_id;

grant select on public.listing_public_feed to authenticated;

create or replace function public.driver_claim_pickup(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  driver_role "UserRole";
  l record;
  dsp record;
  base numeric;
  default_pct numeric;
  payout numeric;
  pct numeric;
  kind "CommissionKind";
  job_id uuid;
  scheduled_at timestamptz;
  v_row_count int;
  effective_scope "DriverOperatingScope" := 'local'::"DriverOperatingScope";
  effective_country text;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.role, upper(u.country_code) into driver_role, effective_country
  from public.users u
  where u.id = me;

  if driver_role is distinct from 'driver'::"UserRole" then
    return jsonb_build_object('ok', false, 'error', 'not_driver');
  end if;

  select * into dsp
  from public.driver_service_profiles
  where user_id = me;

  if found then
    effective_scope := dsp.operating_scope;
    effective_country := upper(dsp.country_code);
  end if;

  select * into l from public.waste_listings where id = p_listing_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if l.delivery_required = true and coalesce(l.buyer_delivery_confirmed, false) = false then
    return jsonb_build_object('ok', false, 'error', 'awaiting_buyer_delivery_confirm');
  end if;

  if not (
    l.delivery_required = true
    and l.pickup_job_status = 'available'::"PickupJobStatus"
    and l.assigned_driver_id is null
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_available');
  end if;

  if not (
    l.status = any (
      array[
        'open'::"ListingStatus",
        'accepted'::"ListingStatus",
        'reopened'::"ListingStatus"
      ]
    )
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_available');
  end if;

  if l.visibility_scope = 'international'::"VisibilityScope" then
    return jsonb_build_object('ok', false, 'error', 'ineligible_region');
  end if;

  if effective_country is not null
    and l.origin_country_code is not null
    and upper(l.origin_country_code) is distinct from effective_country then
    return jsonb_build_object('ok', false, 'error', 'ineligible_region');
  end if;

  if effective_scope = 'local'::"DriverOperatingScope" then
    if l.visibility_scope is distinct from 'local'::"VisibilityScope" then
      return jsonb_build_object('ok', false, 'error', 'ineligible_region');
    end if;
    if dsp.state is not null and l.origin_state is not null and dsp.state is distinct from l.origin_state then
      return jsonb_build_object('ok', false, 'error', 'ineligible_region');
    end if;
    if dsp.city is not null and l.origin_city is not null and dsp.city is distinct from l.origin_city then
      return jsonb_build_object('ok', false, 'error', 'ineligible_region');
    end if;
  end if;

  select o.amount into base
  from public.offers o
  where o.listing_id = p_listing_id
    and o.status = 'accepted'::"OfferStatus"
  order by o.created_at desc
  limit 1;

  if base is null then
    base := l.asking_price;
  end if;

  select ps.default_driver_commission_percent into default_pct
  from public.platform_settings ps
  where ps.id = 1;

  if default_pct is null then
    default_pct := 10;
  end if;

  kind := coalesce(l.commission_kind, 'percent'::"CommissionKind");

  if kind = 'fixed'::"CommissionKind" then
    payout := greatest(coalesce(l.driver_commission_amount, 0), 0);
    pct := null;
  else
    pct := coalesce(l.driver_commission_percent, default_pct);
    payout := round((base * (pct / 100.0))::numeric, 2);
  end if;

  update public.waste_listings wl
  set
    assigned_driver_id = me,
    pickup_job_status = 'claimed'::"PickupJobStatus",
    driver_commission_amount = payout,
    driver_commission_percent = pct,
    commission_kind = kind,
    updated_at = now()
  where wl.id = p_listing_id
    and wl.pickup_job_status = 'available'::"PickupJobStatus"
    and wl.assigned_driver_id is null;

  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'race');
  end if;

  scheduled_at := coalesce(l.pickup_deadline_at, now() + interval '48 hours');

  insert into public.transport_jobs (
    id,
    listing_id,
    driver_id,
    requester_id,
    scheduled_at,
    status,
    delivery_fee,
    pickup_location_id,
    service_scope,
    notes,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    p_listing_id,
    me,
    l.accepted_by,
    scheduled_at,
    'scheduled'::"TransportStatus",
    l.delivery_fee,
    l.pickup_location_id,
    effective_scope,
    format('Driver commission: %s %s', payout::text, l.currency),
    now(),
    now()
  )
  returning id into job_id;

  insert into public.notifications (id, user_id, type, title, body, listing_id)
  values (
    gen_random_uuid(),
    l.user_id,
    'pickup_claimed',
    'Driver claimed your pickup',
    format('A driver claimed delivery for listing %s...', left(l.id::text, 8)),
    l.id
  );

  if l.accepted_by is not null then
    insert into public.notifications (id, user_id, type, title, body, listing_id)
    values (
      gen_random_uuid(),
      l.accepted_by,
      'pickup_claimed',
      'Driver assigned to pickup',
      'A driver accepted the delivery job for your purchase.',
      l.id
    );
  end if;

  return jsonb_build_object('ok', true, 'listing_id', p_listing_id, 'job_id', job_id, 'payout', payout, 'currency', l.currency);
end;
$$;

revoke all on function public.driver_claim_pickup(uuid) from public;
grant execute on function public.driver_claim_pickup(uuid) to authenticated;

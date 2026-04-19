-- Buyer must confirm marketplace delivery before drivers can claim.
-- Post-delivery: driver_profile_blocks for app-level PII isolation (no profile RLS change).

alter table public.waste_listings
  add column if not exists buyer_delivery_confirmed boolean not null default false;

-- Legacy: accepted + delivery + job open for drivers but column new -> treat as already released.
update public.waste_listings l
set buyer_delivery_confirmed = true
where l.delivery_required = true
  and l.status = 'accepted'::"ListingStatus"
  and l.assigned_driver_id is null
  and l.pickup_job_status = 'available'::"PickupJobStatus";

-- Open/reopened listings should never advertise driver pickup before acceptance flow.
update public.waste_listings l
set
  pickup_job_status = 'none'::"PickupJobStatus",
  buyer_delivery_confirmed = false
where l.delivery_required = true
  and l.status in ('open'::"ListingStatus", 'reopened'::"ListingStatus")
  and l.pickup_job_status = 'available'::"PickupJobStatus";

create table if not exists public.driver_profile_blocks (
  driver_id uuid not null references public.users (id) on delete cascade,
  blocked_user_id uuid not null references public.users (id) on delete cascade,
  listing_id uuid not null references public.waste_listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (driver_id, blocked_user_id)
);

create index if not exists driver_profile_blocks_driver_idx on public.driver_profile_blocks (driver_id);

alter table public.driver_profile_blocks enable row level security;

drop policy if exists "driver_profile_blocks_select_own" on public.driver_profile_blocks;
create policy "driver_profile_blocks_select_own"
on public.driver_profile_blocks
for select
to authenticated
using (driver_id = auth.uid());

revoke all on public.driver_profile_blocks from public;
grant select on public.driver_profile_blocks to authenticated;

-- Feed: expose buyer confirmation for driver UX.
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
  l.buyer_delivery_confirmed
from public.waste_listings l
left join public.user_public_profiles p on p.id = l.user_id;

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
  base numeric;
  default_pct numeric;
  payout numeric;
  pct numeric;
  kind "CommissionKind";
  job_id uuid;
  scheduled_at timestamptz;
  v_row_count int;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.role into driver_role from public.users u where u.id = me;
  if driver_role is distinct from 'driver'::"UserRole" then
    return jsonb_build_object('ok', false, 'error', 'not_driver');
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
    format('A driver claimed delivery for listing %s…', left(l.id::text, 8)),
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

create or replace function public.buyer_confirm_marketplace_delivery(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  l record;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into l from public.waste_listings where id = p_listing_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if l.accepted_by is distinct from me then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if l.delivery_required is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_delivery_listing');
  end if;

  if l.status is distinct from 'accepted'::"ListingStatus" then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if coalesce(l.buyer_delivery_confirmed, false) = true then
    return jsonb_build_object('ok', true, 'listing_id', p_listing_id, 'already', true);
  end if;

  update public.waste_listings wl
  set
    buyer_delivery_confirmed = true,
    pickup_job_status = case
      when wl.assigned_driver_id is null and wl.pickup_job_status in ('none'::"PickupJobStatus", 'available'::"PickupJobStatus")
        then 'available'::"PickupJobStatus"
      else wl.pickup_job_status
    end,
    updated_at = now()
  where wl.id = p_listing_id;

  return jsonb_build_object('ok', true, 'listing_id', p_listing_id);
end;
$$;

revoke all on function public.buyer_confirm_marketplace_delivery(uuid) from public;
grant execute on function public.buyer_confirm_marketplace_delivery(uuid) to authenticated;

create or replace function public.driver_complete_transport_with_pin(p_job_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  driver_role "UserRole";
  j record;
  expected text;
  trimmed text := nullif(trim(coalesce(p_pin, '')), '');
  seller_uid uuid;
  buyer_uid uuid;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.role into driver_role from public.users u where u.id = me;
  if driver_role is distinct from 'driver'::"UserRole" then
    return jsonb_build_object('ok', false, 'error', 'not_driver');
  end if;

  select * into j from public.transport_jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if j.driver_id is distinct from me then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if j.status = 'completed'::"TransportStatus" then
    return jsonb_build_object('ok', false, 'error', 'already_completed');
  end if;

  select s.pin into expected
  from public.delivery_handoff_secrets s
  where s.listing_id = j.listing_id
    and s.consumed_at is null
  limit 1;

  if expected is not null then
    if trimmed is null or trimmed <> expected then
      return jsonb_build_object('ok', false, 'error', 'bad_pin');
    end if;
  end if;

  update public.transport_jobs t
  set
    status = 'completed'::"TransportStatus",
    completed_at = now(),
    updated_at = now()
  where t.id = p_job_id;

  update public.delivery_handoff_secrets s
  set consumed_at = now()
  where s.listing_id = j.listing_id;

  update public.waste_listings wl
  set
    delivery_privacy_locked = true,
    updated_at = now()
  where wl.id = j.listing_id;

  select wl.user_id, wl.accepted_by into seller_uid, buyer_uid
  from public.waste_listings wl
  where wl.id = j.listing_id;

  if seller_uid is not null and seller_uid is distinct from me then
    insert into public.driver_profile_blocks (driver_id, blocked_user_id, listing_id)
    values (me, seller_uid, j.listing_id)
    on conflict (driver_id, blocked_user_id) do nothing;
  end if;

  if buyer_uid is not null and buyer_uid is distinct from me then
    insert into public.driver_profile_blocks (driver_id, blocked_user_id, listing_id)
    values (me, buyer_uid, j.listing_id)
    on conflict (driver_id, blocked_user_id) do nothing;
  end if;

  return jsonb_build_object('ok', true, 'job_id', p_job_id);
end;
$$;

revoke all on function public.driver_complete_transport_with_pin(uuid, text) from public;
grant execute on function public.driver_complete_transport_with_pin(uuid, text) to authenticated;

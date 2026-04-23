-- Public listing feed view + driver claim RPC + small RLS tuning.
-- Goals:
-- - Allow buyers to see seller display fields without exposing full `users` rows.
-- - Allow mobile (Supabase JWT) to claim pickups with the same core rules as web `/api/driver/listings/[id]/claim`.
-- - Include `reopened` listings in marketplace visibility.

-- 1) Marketplace visibility: include reopened listings.
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
  or user_id = auth.uid()
  or accepted_by = auth.uid()
  or assigned_driver_id = auth.uid()
);

-- 2) Public feed view (safe seller fields joined from user_public_profiles).
-- Postgres 15+: security invoker so underlying RLS applies to the current role.
create or replace view public.listing_public_feed
with (security_invoker = true) as
select
  l.id,
  l.waste_type,
  l.quantity,
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
  p.name as seller_name,
  p.avatar_url as seller_avatar_url,
  p.role as seller_role
from public.waste_listings l
join public.user_public_profiles p on p.id = l.user_id;

grant select on public.listing_public_feed to authenticated;

-- 3) Driver claim pickup (SECURITY DEFINER) — mirrors web claim transaction (core parts).
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

  -- Best-effort notifications (SECURITY DEFINER bypasses RLS).
  insert into public.notifications (user_id, type, title, body, listing_id)
  values (
    l.user_id,
    'pickup_claimed',
    'Driver claimed your pickup',
    format('A driver claimed delivery for listing %s…', left(l.id::text, 8)),
    l.id
  );

  if l.accepted_by is not null then
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (
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

-- 4) Driver transport status updates (prevents arbitrary column edits via broad UPDATE policies).
create or replace function public.driver_set_transport_status(p_job_id uuid, p_status "TransportStatus")
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  driver_role "UserRole";
  j record;
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

  update public.transport_jobs t
  set
    status = p_status,
    updated_at = now(),
    completed_at = case when p_status = 'completed'::"TransportStatus" then now() else t.completed_at end
  where t.id = p_job_id;

  return jsonb_build_object('ok', true, 'job_id', p_job_id, 'status', p_status::text);
end;
$$;

revoke all on function public.driver_set_transport_status(uuid, "TransportStatus") from public;
grant execute on function public.driver_set_transport_status(uuid, "TransportStatus") to authenticated;

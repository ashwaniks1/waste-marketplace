-- Allow an accepted buyer to request marketplace driver delivery when the
-- seller offered delivery but the listing was not pre-marked as driver pickup.
create or replace function public.buyer_confirm_marketplace_delivery(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  l record;
  generated_pin text := (floor(random() * 900000 + 100000))::int::text;
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

  if l.delivery_required is distinct from true and l.delivery_available is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_delivery_listing');
  end if;

  if l.status is distinct from 'accepted'::"ListingStatus" then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if coalesce(l.buyer_delivery_confirmed, false) = true and l.delivery_required is true then
    return jsonb_build_object('ok', true, 'listing_id', p_listing_id, 'already', true);
  end if;

  update public.waste_listings wl
  set
    delivery_required = true,
    delivery_available = true,
    buyer_delivery_confirmed = true,
    pickup_job_status = case
      when wl.assigned_driver_id is null and wl.pickup_job_status in ('none'::"PickupJobStatus", 'available'::"PickupJobStatus")
        then 'available'::"PickupJobStatus"
      else wl.pickup_job_status
    end,
    updated_at = now()
  where wl.id = p_listing_id;

  insert into public.delivery_handoff_secrets (listing_id, pin)
  values (p_listing_id, generated_pin)
  on conflict (listing_id)
  do update set pin = excluded.pin, consumed_at = null;

  return jsonb_build_object('ok', true, 'listing_id', p_listing_id);
end;
$$;

revoke all on function public.buyer_confirm_marketplace_delivery(uuid) from public;
grant execute on function public.buyer_confirm_marketplace_delivery(uuid) to authenticated;

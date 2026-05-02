-- Security hardening for direct Supabase access.
-- Keep mobile/profile edits working, but make server-owned user fields immutable to authenticated clients.

revoke update on table public.users from authenticated;

grant update (
  name,
  first_name,
  last_name,
  phone,
  address,
  country_code,
  currency,
  vehicle_type,
  license_number,
  availability,
  avatar_url,
  zip_code,
  timezone,
  profile_lat,
  profile_lng
) on table public.users to authenticated;

create or replace function private.protect_user_client_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  jwt_role text := nullif(trim(coalesce(auth.jwt()->'app_metadata'->>'role', '')), '');
  jwt_email text := nullif(trim(coalesce(auth.jwt()->>'email', '')), '');
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if jwt_role in ('customer', 'buyer', 'driver', 'admin') then
      new.role := jwt_role::"UserRole";
    else
      new.role := 'buyer'::"UserRole";
    end if;
    if jwt_email is not null then
      new.email := jwt_email;
    end if;
    new.last_activity_at := coalesce(new.last_activity_at, now());
    return new;
  end if;

  new.id := old.id;
  new.email := old.email;
  new.role := old.role;
  new.last_activity_at := old.last_activity_at;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_client_fields on public.users;
create trigger trg_protect_user_client_fields
before insert or update on public.users
for each row execute function private.protect_user_client_fields();

-- Keep the mobile PIN completion RPC aligned with the web completion flow:
-- completion consumes the PIN and completes the listing atomically.
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

  if j.status is distinct from 'in_transit'::"TransportStatus" then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  select s.pin into expected
  from public.delivery_handoff_secrets s
  where s.listing_id = j.listing_id
    and s.consumed_at is null
  limit 1;

  if expected is null then
    return jsonb_build_object('ok', false, 'error', 'missing_pin');
  end if;

  if trimmed is null or trimmed <> expected then
    return jsonb_build_object('ok', false, 'error', 'bad_pin');
  end if;

  update public.transport_jobs t
  set
    status = 'completed'::"TransportStatus",
    completed_at = now(),
    updated_at = now()
  where t.id = p_job_id;

  update public.delivery_handoff_secrets s
  set consumed_at = now()
  where s.listing_id = j.listing_id
    and s.consumed_at is null;

  update public.waste_listings wl
  set
    status = 'completed'::"ListingStatus",
    pickup_job_status = 'completed'::"PickupJobStatus",
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

  if seller_uid is not null then
    insert into public.notifications (id, user_id, type, title, body, listing_id)
    values (
      gen_random_uuid(),
      seller_uid,
      'pickup_completed',
      'Pickup completed',
      'The driver completed delivery with the buyer handoff PIN.',
      j.listing_id
    )
    on conflict do nothing;
  end if;

  if buyer_uid is not null then
    insert into public.notifications (id, user_id, type, title, body, listing_id)
    values (
      gen_random_uuid(),
      buyer_uid,
      'pickup_completed',
      'Pickup completed',
      'Your order pickup was completed by the driver.',
      j.listing_id
    )
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'job_id', p_job_id);
end;
$$;

revoke all on function public.driver_complete_transport_with_pin(uuid, text) from public;
grant execute on function public.driver_complete_transport_with_pin(uuid, text) to authenticated;

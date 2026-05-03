create schema if not exists private;

create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  actor_id uuid,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  occurred_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists domain_events_event_type_occurred_at_idx
  on public.domain_events (event_type, occurred_at desc);

create index if not exists domain_events_aggregate_occurred_at_idx
  on public.domain_events (aggregate_type, aggregate_id, occurred_at desc);

create index if not exists domain_events_processed_at_occurred_at_idx
  on public.domain_events (processed_at, occurred_at);

alter table public.domain_events enable row level security;

revoke all on public.domain_events from anon, authenticated;
grant select on public.domain_events to authenticated;

drop policy if exists "domain_events_select_admin" on public.domain_events;
create policy "domain_events_select_admin"
on public.domain_events
for select
to authenticated
using (public.is_admin());

create or replace function private.record_domain_event(
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_actor_id uuid,
  p_payload jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_id uuid;
begin
  insert into public.domain_events (
    event_type,
    aggregate_type,
    aggregate_id,
    actor_id,
    payload,
    idempotency_key
  )
  values (
    p_event_type,
    p_aggregate_type,
    p_aggregate_id,
    p_actor_id,
    coalesce(p_payload, '{}'::jsonb),
    p_idempotency_key
  )
  on conflict (idempotency_key) do update
  set idempotency_key = excluded.idempotency_key
  returning id into event_id;

  return event_id;
end;
$$;

revoke all on function private.record_domain_event(text, text, uuid, uuid, jsonb, text) from public;

create or replace function private.on_listing_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.record_domain_event(
      'listing.created',
      'listing',
      new.id,
      new.user_id,
      jsonb_build_object(
        'status', new.status,
        'waste_type', new.waste_type,
        'seller_id', new.user_id,
        'origin_country_code', new.origin_country_code,
        'origin_state', new.origin_state,
        'origin_city', new.origin_city,
        'delivery_required', new.delivery_required
      ),
      'listing:' || new.id::text || ':created'
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    perform private.record_domain_event(
      'listing.status_changed',
      'listing',
      new.id,
      coalesce(new.accepted_by, new.assigned_driver_id, new.user_id),
      jsonb_build_object(
        'from_status', old.status,
        'to_status', new.status,
        'seller_id', new.user_id,
        'buyer_id', new.accepted_by,
        'driver_id', new.assigned_driver_id
      ),
      'listing:' || new.id::text || ':status:' || new.status::text
    );
  end if;

  if coalesce(old.buyer_delivery_confirmed, false) = false
    and coalesce(new.buyer_delivery_confirmed, false) = true then
    perform private.record_domain_event(
      'delivery.released',
      'listing',
      new.id,
      new.accepted_by,
      jsonb_build_object(
        'seller_id', new.user_id,
        'buyer_id', new.accepted_by,
        'pickup_job_status', new.pickup_job_status,
        'origin_country_code', new.origin_country_code,
        'origin_state', new.origin_state,
        'origin_city', new.origin_city
      ),
      'listing:' || new.id::text || ':delivery_released'
    );
  end if;

  if old.assigned_driver_id is null and new.assigned_driver_id is not null then
    perform private.record_domain_event(
      'delivery.driver_claimed',
      'listing',
      new.id,
      new.assigned_driver_id,
      jsonb_build_object(
        'seller_id', new.user_id,
        'buyer_id', new.accepted_by,
        'driver_id', new.assigned_driver_id,
        'pickup_job_status', new.pickup_job_status,
        'driver_commission_amount', new.driver_commission_amount,
        'currency', new.currency
      ),
      'listing:' || new.id::text || ':driver_claimed:' || new.assigned_driver_id::text
    );
  end if;

  if new.pickup_job_status is distinct from old.pickup_job_status then
    perform private.record_domain_event(
      'pickup.status_changed',
      'listing',
      new.id,
      coalesce(new.assigned_driver_id, new.accepted_by, new.user_id),
      jsonb_build_object(
        'from_status', old.pickup_job_status,
        'to_status', new.pickup_job_status,
        'seller_id', new.user_id,
        'buyer_id', new.accepted_by,
        'driver_id', new.assigned_driver_id
      ),
      'listing:' || new.id::text || ':pickup_status:' || new.pickup_job_status::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_domain_events_waste_listings on public.waste_listings;
create trigger trg_domain_events_waste_listings
after insert or update of status, pickup_job_status, buyer_delivery_confirmed, assigned_driver_id
on public.waste_listings
for each row execute function private.on_listing_domain_event();

create or replace function private.on_offer_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.record_domain_event(
      'offer.created',
      'offer',
      new.id,
      new.buyer_id,
      jsonb_build_object(
        'listing_id', new.listing_id,
        'buyer_id', new.buyer_id,
        'status', new.status,
        'amount', new.amount,
        'currency', new.currency
      ),
      'offer:' || new.id::text || ':created'
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    perform private.record_domain_event(
      'offer.' || new.status::text,
      'offer',
      new.id,
      new.buyer_id,
      jsonb_build_object(
        'listing_id', new.listing_id,
        'buyer_id', new.buyer_id,
        'from_status', old.status,
        'to_status', new.status,
        'amount', new.amount,
        'currency', new.currency
      ),
      'offer:' || new.id::text || ':status:' || new.status::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_domain_events_offers on public.offers;
create trigger trg_domain_events_offers
after insert or update of status
on public.offers
for each row execute function private.on_offer_domain_event();

create or replace function private.on_transport_job_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.record_domain_event(
      'transport_job.created',
      'transport_job',
      new.id,
      new.driver_id,
      jsonb_build_object(
        'listing_id', new.listing_id,
        'driver_id', new.driver_id,
        'requester_id', new.requester_id,
        'status', new.status,
        'service_scope', new.service_scope
      ),
      'transport_job:' || new.id::text || ':created'
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    perform private.record_domain_event(
      'transport_job.status_changed',
      'transport_job',
      new.id,
      new.driver_id,
      jsonb_build_object(
        'listing_id', new.listing_id,
        'driver_id', new.driver_id,
        'requester_id', new.requester_id,
        'from_status', old.status,
        'to_status', new.status,
        'completed_at', new.completed_at
      ),
      'transport_job:' || new.id::text || ':status:' || new.status::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_domain_events_transport_jobs on public.transport_jobs;
create trigger trg_domain_events_transport_jobs
after insert or update of status
on public.transport_jobs
for each row execute function private.on_transport_job_domain_event();

create or replace function private.on_notification_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.record_domain_event(
    'notification.created',
    'notification',
    new.id,
    new.user_id,
    jsonb_build_object(
      'user_id', new.user_id,
      'type', new.type,
      'listing_id', new.listing_id,
      'conversation_id', new.conversation_id
    ),
    'notification:' || new.id::text || ':created'
  );

  return new;
end;
$$;

drop trigger if exists trg_domain_events_notifications on public.notifications;
create trigger trg_domain_events_notifications
after insert on public.notifications
for each row execute function private.on_notification_domain_event();

create or replace function private.on_review_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.record_domain_event(
    'review.created',
    'review',
    new.id,
    new.from_user_id,
    jsonb_build_object(
      'listing_id', new.listing_id,
      'from_user_id', new.from_user_id,
      'to_user_id', new.to_user_id,
      'score', new.score
    ),
    'review:' || new.id::text || ':created'
  );

  return new;
end;
$$;

drop trigger if exists trg_domain_events_reviews on public.reviews;
create trigger trg_domain_events_reviews
after insert on public.reviews
for each row execute function private.on_review_domain_event();

alter table public.transport_jobs replica identity full;
alter table public.domain_events replica identity full;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['transport_jobs','domain_events'] loop
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

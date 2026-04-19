-- Extend public listing feed with commission fields (used for driver UI estimates).
-- Postgres cannot `CREATE OR REPLACE VIEW` when output column order/names shift incompatibly,
-- so drop and recreate.
drop view if exists public.listing_public_feed;

create view public.listing_public_feed
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
  l.driver_commission_amount,
  l.driver_commission_percent,
  l.commission_kind,
  p.name as seller_name,
  p.avatar_url as seller_avatar_url,
  p.role as seller_role
from public.waste_listings l
join public.user_public_profiles p on p.id = l.user_id;

grant select on public.listing_public_feed to authenticated;

-- Allow all authenticated users to read the singleton platform settings row (defaults).
drop policy if exists "platform_settings_select_singleton" on public.platform_settings;
create policy "platform_settings_select_singleton"
on public.platform_settings
for select
to authenticated
using (id = 1);

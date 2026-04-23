-- Feed view: LEFT JOIN so listings still appear if user_public_profiles row is missing.
-- Add description for marketplace detail screens (mobile + future web reads).

drop view if exists public.listing_public_feed;

create view public.listing_public_feed
with (security_invoker = true) as
select
  l.id,
  l.waste_type,
  l.quantity,
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
  p.role as seller_role
from public.waste_listings l
left join public.user_public_profiles p on p.id = l.user_id;

grant select on public.listing_public_feed to authenticated;

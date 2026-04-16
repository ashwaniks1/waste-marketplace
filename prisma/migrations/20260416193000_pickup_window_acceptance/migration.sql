alter table "waste_listings"
  add column if not exists "accepted_at" timestamp(3),
  add column if not exists "pickup_deadline_at" timestamp(3),
  add column if not exists "pickup_extended_at" timestamp(3);

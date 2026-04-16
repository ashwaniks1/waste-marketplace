-- Bring the live users table in sync with the profile feature.
alter table "users"
  add column if not exists "avatar_url" text;

alter table "users"
  add column if not exists "updated_at" timestamp(3) not null default current_timestamp;

notify pgrst, 'reload schema';

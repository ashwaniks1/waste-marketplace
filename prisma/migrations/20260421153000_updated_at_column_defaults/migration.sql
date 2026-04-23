-- Inserts from Supabase/PostgREST omit Prisma-managed columns; these NOT NULL updated_at
-- columns had no DB default, causing "null value in column updated_at".

-- Backfill (defensive): any legacy nulls before NOT NULL was enforced
update public.offers set updated_at = coalesce(updated_at, created_at, current_timestamp) where updated_at is null;
update public.conversations set updated_at = coalesce(updated_at, created_at, current_timestamp) where updated_at is null;
update public.waste_listings set updated_at = coalesce(updated_at, created_at, current_timestamp) where updated_at is null;
update public.transport_jobs set updated_at = coalesce(updated_at, created_at, current_timestamp) where updated_at is null;
update public.transactions set updated_at = coalesce(updated_at, created_at, current_timestamp) where updated_at is null;

alter table public.offers alter column updated_at set default current_timestamp;
alter table public.conversations alter column updated_at set default current_timestamp;
alter table public.waste_listings alter column updated_at set default current_timestamp;
alter table public.transport_jobs alter column updated_at set default current_timestamp;
alter table public.transactions alter column updated_at set default current_timestamp;

-- users.updated_at added in a later migration; backfill + default if column exists
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'updated_at'
  ) then
    update public.users
    set updated_at = coalesce(updated_at, created_at, current_timestamp)
    where updated_at is null;
    execute 'alter table public.users alter column updated_at set default current_timestamp';
  end if;
end $$;

-- platform_settings (Prisma @updatedAt; ensure insert-safe default)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'platform_settings'
      and column_name = 'updated_at'
  ) then
    update public.platform_settings
    set updated_at = coalesce(updated_at, current_timestamp)
    where updated_at is null;
    execute 'alter table public.platform_settings alter column updated_at set default current_timestamp';
  end if;
end $$;

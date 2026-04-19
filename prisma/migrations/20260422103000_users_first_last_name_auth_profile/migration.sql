-- First / last name on profiles + create public.users when auth.users is inserted (mobile signup).

alter table public.users add column if not exists first_name text not null default '';
alter table public.users add column if not exists last_name text not null default '';

update public.users u
set
  first_name = case
    when nullif(trim(u.first_name), '') is not null then trim(u.first_name)
    when position(' ' in trim(coalesce(u.name, ''))) > 0 then trim(split_part(trim(u.name), ' ', 1))
    else trim(coalesce(u.name, 'Member'))
  end,
  last_name = case
    when nullif(trim(u.last_name), '') is not null then trim(u.last_name)
    when position(' ' in trim(coalesce(u.name, ''))) > 0 then trim(substring(trim(u.name) from position(' ' in trim(u.name)) + 1))
    else trim(coalesce(u.name, 'Member'))
  end;

-- Allow the signed-in user to insert their own profile row (fallback if trigger is unavailable).
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (id = auth.uid());

-- After a new Supabase Auth user is created, ensure a matching public.users row exists.
create or replace function public.wmp_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fn text := trim(coalesce(meta->>'first_name', ''));
  ln text := trim(coalesce(meta->>'last_name', ''));
  disp text;
  app_role text := trim(coalesce(new.raw_app_meta_data->>'role', ''));
  role_val "UserRole";
begin
  if fn = '' or ln = '' then
    disp := trim(coalesce(meta->>'name', ''));
    if disp = '' then
      disp := 'Member';
    end if;
    fn := trim(split_part(disp, ' ', 1));
    ln := trim(substring(disp from length(fn) + 2));
    if ln = '' then
      ln := fn;
    end if;
    disp := trim(fn || ' ' || ln);
  else
    disp := trim(fn || ' ' || ln);
  end if;

  begin
    role_val := app_role::"UserRole";
  exception when others then
    role_val := 'buyer'::"UserRole";
  end;

  insert into public.users (id, email, name, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    disp,
    fn,
    ln,
    role_val
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    first_name = excluded.first_name,
    last_name = excluded.last_name;

  return new;
end;
$$;

drop trigger if exists wmp_on_auth_user_created on auth.users;
create trigger wmp_on_auth_user_created
after insert on auth.users
for each row execute function public.wmp_handle_new_auth_user();

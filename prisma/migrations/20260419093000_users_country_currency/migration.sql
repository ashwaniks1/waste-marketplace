-- Add country + currency preference to profiles.
-- Country is ISO-3166-1 alpha-2; currency is ISO-4217.

alter table public.users add column if not exists country_code text;
alter table public.users add column if not exists currency text not null default 'USD';

update public.users set currency = 'USD' where currency is null or trim(currency) = '';


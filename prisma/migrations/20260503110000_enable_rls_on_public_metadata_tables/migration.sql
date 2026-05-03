-- Supabase security linter: public-schema metadata tables exposed to PostgREST
-- should have row level security enabled.
--
-- _prisma_migrations is operational metadata. App users do not need direct
-- PostgREST access to it; Prisma/server-side DB users can still manage it as
-- table owner / elevated roles because FORCE RLS is not enabled.
alter table if exists public._prisma_migrations enable row level security;

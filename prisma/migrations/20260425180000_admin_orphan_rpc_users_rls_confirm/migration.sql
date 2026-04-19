-- Admin health: list auth.users IDs missing a public.users row (service_role / Edge only).
-- Avatar bucket SELECT stays public-read so anonymous marketplace pages can render seller images;
-- writes remain scoped to owner paths (see prior migrations).

CREATE OR REPLACE FUNCTION public.admin_list_orphan_auth_user_ids()
RETURNS TABLE(id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT a.id
  FROM auth.users AS a
  WHERE NOT EXISTS (SELECT 1 FROM public.users AS u WHERE u.id = a.id)
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.admin_list_orphan_auth_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_orphan_auth_user_ids() TO service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users FROM anon;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

/**
 * GET/POST — returns auth user IDs without a matching public.users row.
 * Headers: x-admin-secret must match env ADMIN_ORPHAN_SECRET.
 * Env (Supabase dashboard): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_ORPHAN_SECRET
 */
Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = Deno.env.get("ADMIN_ORPHAN_SECRET");
  const hdr = req.headers.get("x-admin-secret");
  if (!secret || hdr !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.rpc("admin_list_orphan_auth_user_ids");

  if (error) {
    return new Response(JSON.stringify({ error: error.message, code: error.code }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const rows = (data ?? []) as { id: string }[];
  return new Response(
    JSON.stringify({
      orphans: rows.map((r) => r.id),
      count: rows.length,
    }),
    { headers: { "content-type": "application/json" } },
  );
});

import { handleRouteError, jsonOk } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}

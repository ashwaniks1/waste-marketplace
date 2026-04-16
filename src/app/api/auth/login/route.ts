import { z } from "zod";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Password login — sets Supabase session cookies via @supabase/ssr. */
export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) return jsonError(error.message, 401);
    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}

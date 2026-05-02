import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const limited = rateLimitCombinedResponse(request, "resend-verification", 5, 10_000);
    if (limited) return limited;

    const body = resendSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const emailLimited = rateLimitCombinedResponse(request, "resend-verification-email", 3, 15 * 60_000, email);
    if (emailLimited) return emailLimited;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return jsonError("Auth is not configured", 503);
    }

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await supabase.auth.resend({ type: "signup", email }).catch(() => undefined);

    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e, { route: "POST /api/auth/resend-verification" });
  }
}

import { z } from "zod";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";
import { createServiceSupabase } from "@/lib/supabase/service";

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const limited = rateLimitCombinedResponse(request, "resend-verification", 5, 10_000);
    if (limited) return limited;

    const body = resendSchema.parse(await request.json());
    const service = createServiceSupabase();
    const { data, error } = await service.auth.admin.inviteUserByEmail(body.email.trim());

    if (error) {
      return jsonError(error.message || "Unable to resend verification email", 400);
    }

    if (!data?.user?.id) {
      return jsonError("Could not resend verification email", 500);
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e, { route: "POST /api/auth/resend-verification" });
  }
}

import { z } from "zod";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";
import { createServerSupabase } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Password login — sets Supabase session cookies via @supabase/ssr. */
export async function POST(request: Request) {
  try {
    const limited = rateLimitCombinedResponse(request, "auth-login", 10, 10_000);
    if (limited) return limited;

    const body = loginSchema.parse(await request.json());
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) return jsonError(error.message, 401);

    // Mark activity on login so users with old profiles don't immediately hit idle-expiry.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      await prisma.user
        .update({
          where: { id: user.id },
          data: { lastActivityAt: new Date() },
          select: { id: true },
        })
        .catch(() => undefined);
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e, { route: "POST /api/auth/login" });
  }
}

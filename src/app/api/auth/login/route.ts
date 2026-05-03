import { z } from "zod";
import { getRoleFromSupabaseUser } from "@/lib/auth";
import { ensureAppUserProfile } from "@/lib/ensureAppUserProfile";
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
    if (error) {
      const emailConfirmationRequired = /not confirmed|confirm|verification/i.test(error.message);
      return jsonError(
        emailConfirmationRequired ? "Email confirmation required." : "We couldn’t sign you in with those details.",
        401,
        { code: emailConfirmationRequired ? "email_confirmation_required" : "invalid_credentials" },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id && user.email) {
      await ensureAppUserProfile(user);

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        typeof meta.name === "string" && meta.name.trim().length > 0 ? meta.name.trim() : user.email;
      const phone = typeof meta.phone === "string" ? meta.phone.trim() : null;
      const address = typeof meta.address === "string" ? meta.address.trim() : null;
      const role = getRoleFromSupabaseUser(user) ?? "buyer";
      const now = new Date();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email,
          name,
          phone,
          address,
          role,
          lastActivityAt: now,
        },
      });
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e, { route: "POST /api/auth/login" });
  }
}

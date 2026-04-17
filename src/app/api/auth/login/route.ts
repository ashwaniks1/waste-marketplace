import { z } from "zod";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getRoleFromSupabaseUser } from "@/lib/auth";

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

    // Ensure the business-profile row exists for users created outside the app (Supabase Auth only).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id && user.email) {
      const role = getRoleFromSupabaseUser(user) ?? "customer";
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        typeof meta.name === "string" && meta.name.trim().length > 0 ? meta.name.trim() : user.email;
      const phone = typeof meta.phone === "string" ? meta.phone.trim() : null;
      const address = typeof meta.address === "string" ? meta.address.trim() : null;

      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          name,
          phone,
          address,
          role,
        },
        create: {
          id: user.id,
          email: user.email,
          name,
          phone,
          address,
          role,
        },
      });
    }
    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}

import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";
import { signupFormSchema } from "@/lib/validation";
import { createServiceSupabase } from "@/lib/supabase/service";

/**
 * Creates the auth user with the service role (sets app_metadata.role in one request),
 * then inserts the Prisma profile. Avoids signUp + updateUserById, which often returns
 * "User not found" when service/anon keys point at different projects or GoTrue lags.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitCombinedResponse(request, "signup", 5, 10_000);
    if (limited) return limited;

    const body = signupFormSchema.parse(await request.json());
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const finalRole: UserRole =
      adminEmail && body.email.toLowerCase() === adminEmail ? "admin" : body.role;

    const service = createServiceSupabase();
    const requireEmailVerification = process.env.SUPABASE_REQUIRE_EMAIL_VERIFICATION !== "false";
    const emailConfirm = !requireEmailVerification;

    const displayName = `${body.firstName.trim()} ${body.lastName.trim()}`.trim();

    const { data, error } = await service.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: emailConfirm,
      user_metadata: {
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
        name: displayName,
        phone: body.phone,
        vehicleType: body.vehicleType,
        licenseNumber: body.licenseNumber,
        availability: body.availability,
      },
      app_metadata: { role: finalRole },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        return jsonError("An account with this email already exists", 409);
      }
      return jsonError(error.message, 400);
    }
    if (!data.user?.id) return jsonError("Signup failed", 400);

    try {
      await prisma.user.upsert({
        where: { id: data.user.id },
        create: {
          id: data.user.id,
          email: body.email.trim(),
          name: displayName,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          phone: body.phone.trim() || null,
          role: finalRole,
          address: body.address.trim() || null,
          vehicleType: body.vehicleType?.trim() || null,
          licenseNumber: body.licenseNumber?.trim() || null,
          availability: body.availability?.trim() || null,
        },
        update: {
          email: body.email.trim(),
          name: displayName,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          phone: body.phone.trim() || null,
          role: finalRole,
          address: body.address.trim() || null,
          vehicleType: body.vehicleType?.trim() || null,
          licenseNumber: body.licenseNumber?.trim() || null,
          availability: body.availability?.trim() || null,
        },
      });
    } catch (pe) {
      if (pe instanceof Prisma.PrismaClientKnownRequestError && pe.code === "P2002") {
        await service.auth.admin.deleteUser(data.user.id).catch(() => undefined);
        return jsonError("An account with this email already exists", 409);
      }
      await service.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      throw pe;
    }

    return jsonOk({
      id: data.user.id,
      email: data.user.email,
      role: finalRole,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return jsonError("Server misconfiguration: set SUPABASE_SERVICE_ROLE_KEY in .env", 503);
    }
    return handleRouteError(e, { route: "POST /api/auth/signup" });
  }
}

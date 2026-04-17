import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { createServiceSupabase } from "@/lib/supabase/service";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().min(10).optional(),
  address: z.string().min(1).optional(),
  role: z.enum(["customer", "buyer", "driver"]),
  vehicleType: z.string().trim().optional(),
  licenseNumber: z.string().trim().optional(),
  availability: z.string().trim().optional(),
});

/**
 * Creates the auth user with the service role (sets app_metadata.role in one request),
 * then inserts the Prisma profile. Avoids signUp + updateUserById, which often returns
 * "User not found" when service/anon keys point at different projects or GoTrue lags.
 */
export async function POST(request: Request) {
  try {
    const body = signupSchema.parse(await request.json());
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const finalRole: UserRole =
      adminEmail && body.email.toLowerCase() === adminEmail ? "admin" : body.role;

    const service = createServiceSupabase();
    const requireEmailVerification = process.env.SUPABASE_REQUIRE_EMAIL_VERIFICATION !== "false";
    const emailConfirm = !requireEmailVerification;

    const { data, error } = await service.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: emailConfirm,
      user_metadata: {
        name: body.name,
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
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: body.email.trim(),
          name: body.name.trim(),
          phone: body.phone?.trim() || null,
          role: finalRole,
          address: body.address?.trim() || null,
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
    return handleRouteError(e);
  }
}

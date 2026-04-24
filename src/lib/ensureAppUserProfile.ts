import { Prisma, type User, type UserRole } from "@prisma/client";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { getRoleFromSupabaseUser } from "@/lib/auth";
import { currencyForCountry, normalizeCountryCode } from "@/lib/currency";
import { HttpError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { namesFromAuthMetadata } from "@/lib/userProfileFromAuth";

/**
 * Ensures a Prisma `User` row exists for the given Supabase Auth user (server-only).
 * Uses metadata + email — no service-role Supabase table writes.
 */
export async function ensureAppUserProfile(authUser: SupabaseAuthUser): Promise<{ user: User; created: boolean }> {
  const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (existing) return { user: existing, created: false };

  const email = authUser.email?.trim();
  if (!email) {
    throw new HttpError(400, "A verified email is required before your profile can be created.");
  }

  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const nameFromMeta = typeof meta.name === "string" ? meta.name : "";
  const emailLocal = email.split("@")[0] ?? "Member";
  const { firstName, lastName, displayName } = namesFromAuthMetadata(meta, nameFromMeta, emailLocal);
  const role = (getRoleFromSupabaseUser(authUser) ?? "customer") as UserRole;

  const metaCountryRaw =
    typeof meta.country_code === "string"
      ? meta.country_code
      : typeof meta.country === "string"
        ? meta.country
        : "";
  const metaCountry = normalizeCountryCode(metaCountryRaw);
  const currency = metaCountry ? currencyForCountry(metaCountry) : "USD";

  try {
    const user = await prisma.user.create({
      data: {
        id: authUser.id,
        email,
        name: displayName,
        firstName,
        lastName,
        role,
        phone: typeof meta.phone === "string" ? meta.phone.trim() || null : null,
        address: typeof meta.address === "string" ? meta.address.trim() || null : null,
        currency,
        ...(metaCountry ? { countryCode: metaCountry } : {}),
      },
    });
    return { user, created: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.user.findUnique({ where: { id: authUser.id } });
      if (again) return { user: again, created: false };
    }
    throw e;
  }
}

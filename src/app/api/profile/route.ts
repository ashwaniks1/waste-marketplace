import { z } from "zod";
import { getSupabaseUserFromRoute, withEffectiveAuthRole } from "@/lib/auth";
import { currencyForCountry, normalizeCountryCode } from "@/lib/currency";
import { ensureAppUserProfile } from "@/lib/ensureAppUserProfile";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { profileToClientDto } from "@/lib/profileDto";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  zipCode: z.string().trim().max(20).optional().nullable(),
  countryCode: z.string().trim().length(2).optional().nullable(),
});

export async function GET(request: Request) {
  let authedId: string | undefined;
  try {
    const ipRl = rateLimitCombinedResponse(request, "profile-get-ip", 40, 10_000);
    if (ipRl) return ipRl;

    const authUser = await getSupabaseUserFromRoute(request);
    if (!authUser) return jsonError("Unauthorized", 401);
    authedId = authUser.id;

    const userRl = rateLimitCombinedResponse(request, "profile-get-user", 80, 60_000, authUser.id);
    if (userRl) return userRl;

    let user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      await ensureAppUserProfile(authUser);
      user = await prisma.user.findUnique({ where: { id: authUser.id } });
    }
    if (!user) return jsonError("Profile not available", 404);
    user = withEffectiveAuthRole(user, authUser);

    const reviewSummary = await prisma.review.aggregate({
      _avg: { score: true },
      _count: { score: true },
      where: { toUserId: user.id },
    });

    return jsonOk({
      profile: profileToClientDto(user),
      avatarColumnAvailable: true,
      reviewSummary: {
        averageRating: reviewSummary._avg.score ?? null,
        reviewCount: reviewSummary._count.score,
      },
    });
  } catch (e) {
    return handleRouteError(e, { route: "GET /api/profile", userId: authedId });
  }
}

export async function PATCH(request: Request) {
  let authedId: string | undefined;
  try {
    const ipRl = rateLimitCombinedResponse(request, "profile-patch-ip", 25, 10_000);
    if (ipRl) return ipRl;

    const authUser = await getSupabaseUserFromRoute(request);
    if (!authUser) return jsonError("Unauthorized", 401);
    authedId = authUser.id;

    const userRl = rateLimitCombinedResponse(request, "profile-patch", 5, 10_000, authUser.id);
    if (userRl) return userRl;

    const body = updateProfileSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!existing) return jsonError("Profile not found", 404);

    const normalizedCountry = normalizeCountryCode(body.countryCode);
    const nextCurrency = body.countryCode !== undefined ? currencyForCountry(normalizedCountry) : undefined;

    let nextFirst = existing.firstName ?? "";
    let nextLast = existing.lastName ?? "";
    let nextName = existing.name;

    if (body.firstName !== undefined || body.lastName !== undefined) {
      if (body.firstName !== undefined) nextFirst = body.firstName;
      if (body.lastName !== undefined) nextLast = body.lastName;
      const display = [nextFirst, nextLast].map((s) => s.trim()).filter(Boolean).join(" ").trim();
      if (display.length < 2) {
        return jsonError("First and last name must combine to at least 2 characters.", 400);
      }
      nextName = display;
    } else if (body.name !== undefined) {
      nextName = body.name;
      const parts = body.name.trim().split(/\s+/);
      nextFirst = parts[0] ?? "";
      nextLast = parts.length > 1 ? parts.slice(1).join(" ") : "";
    }

    const user = withEffectiveAuthRole(await prisma.user.update({
      where: { id: authUser.id },
      data: {
        name: nextName,
        firstName: nextFirst,
        lastName: nextLast,
        phone: body.phone !== undefined ? body.phone : undefined,
        address: body.address !== undefined ? body.address : undefined,
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        ...(body.zipCode !== undefined ? { zipCode: body.zipCode?.trim() || null } : {}),
        ...(body.countryCode !== undefined ? { countryCode: normalizedCountry } : {}),
        ...(nextCurrency !== undefined ? { currency: nextCurrency } : {}),
      },
    }), authUser);

    return jsonOk({
      profile: profileToClientDto(user),
      avatarColumnAvailable: true,
    });
  } catch (e) {
    return handleRouteError(e, { route: "PATCH /api/profile", userId: authedId });
  }
}

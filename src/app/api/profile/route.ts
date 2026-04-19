import { z } from "zod";
import { getSupabaseUserFromRoute } from "@/lib/auth";
import { ensureAppUserProfile } from "@/lib/ensureAppUserProfile";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { profileToClientDto } from "@/lib/profileDto";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  zipCode: z.string().trim().max(20).optional().nullable(),
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

    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        name: body.name,
        phone: body.phone ?? null,
        address: body.address ?? null,
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        ...(body.zipCode !== undefined ? { zipCode: body.zipCode?.trim() || null } : {}),
      },
    });

    return jsonOk({
      profile: profileToClientDto(user),
      avatarColumnAvailable: true,
    });
  } catch (e) {
    return handleRouteError(e, { route: "PATCH /api/profile", userId: authedId });
  }
}

import { getSupabaseUserFromRoute, withEffectiveAuthRole } from "@/lib/auth";
import { currencyForCountry, normalizeCountryCode } from "@/lib/currency";
import { ensureAppUserProfile } from "@/lib/ensureAppUserProfile";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { profileToClientDto } from "@/lib/profileDto";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";

/**
 * Server-only profile provisioning (replaces direct client inserts on mobile).
 * Auth: cookie session or `Authorization: Bearer <access_token>`.
 */
export async function POST(request: Request) {
  let authedId: string | undefined;
  try {
    const ipBurst = rateLimitCombinedResponse(request, "ensure-profile-ip", 25, 10_000);
    if (ipBurst) return ipBurst;

    const authUser = await getSupabaseUserFromRoute(request);
    if (!authUser) return jsonError("Unauthorized", 401);
    authedId = authUser.id;

    const limited = rateLimitCombinedResponse(request, "ensure-profile", 5, 10_000, authUser.id);
    if (limited) return limited;

    const { user: ensured, created } = await ensureAppUserProfile(authUser);
    // If we have no country/currency yet, try to initialize from metadata (non-destructive).
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const metaCountryRaw = typeof meta.country_code === "string" ? meta.country_code : typeof meta.country === "string" ? meta.country : "";
    const metaCountry = normalizeCountryCode(metaCountryRaw);
    const user = withEffectiveAuthRole(
      ensured.countryCode || !metaCountry
        ? ensured
        : await prisma.user.update({
            where: { id: ensured.id },
            data: { countryCode: metaCountry, currency: currencyForCountry(metaCountry) },
          }),
      authUser,
    );

    const reviewSummary = await prisma.review.aggregate({
      _avg: { score: true },
      _count: { score: true },
      where: { toUserId: user.id },
    });

    return jsonOk({
      profile: profileToClientDto(user),
      created,
      avatarColumnAvailable: true,
      reviewSummary: {
        averageRating: reviewSummary._avg.score ?? null,
        reviewCount: reviewSummary._count.score,
      },
    });
  } catch (e) {
    return handleRouteError(e, { route: "POST /api/ensure-profile", userId: authedId });
  }
}

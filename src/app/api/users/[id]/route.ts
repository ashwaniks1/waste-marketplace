import { ListingStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getRoleFromSupabaseUser, getSupabaseUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/service";
import { namesFromAuthMetadata } from "@/lib/userProfileFromAuth";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    paramsSchema.parse({ id });

    const auth = await getSupabaseUser();
    if (!auth) return jsonError("Unauthorized", 401);

    let user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      try {
        const service = createServiceSupabase();
        const { data, error } = await service.auth.admin.getUserById(id);
        if (error || !data.user) return jsonError("User not found", 404);

        const meta = data.user.user_metadata as Record<string, unknown> | null | undefined;
        const nameFromMeta = typeof meta?.name === "string" ? meta.name.trim() : "";
        const email = data.user.email?.trim() ?? "";
        const emailLocal = email.split("@")[0] || "User";
        const { firstName, lastName, displayName } = namesFromAuthMetadata(meta, nameFromMeta, emailLocal);
        const roleFromMeta = getRoleFromSupabaseUser(data.user);
        const role = (roleFromMeta ?? UserRole.customer) as UserRole;

        user = await prisma.user.create({
          data: {
            id: data.user.id,
            email,
            name: displayName,
            firstName,
            lastName,
            role,
            phone: typeof meta?.phone === "string" ? meta.phone.trim() || null : null,
            address: typeof meta?.address === "string" ? meta.address.trim() || null : null,
            vehicleType: typeof meta?.vehicleType === "string" ? meta.vehicleType.trim() || null : null,
            licenseNumber: typeof meta?.licenseNumber === "string" ? meta.licenseNumber.trim() || null : null,
            availability: typeof meta?.availability === "string" ? meta.availability.trim() || null : null,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            role: true,
            avatarUrl: true,
          },
        });
      } catch (e) {
        if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
          return jsonError("We couldn’t load this profile right now. Try again in a moment.", 503);
        }
        return jsonError("We couldn’t find this profile.", 404);
      }
    }

    const reviewSummary = await prisma.review.aggregate({
      _avg: { score: true },
      _count: { score: true },
      where: { toUserId: id },
    });

    const reviews = await prisma.review.findMany({
      where: { toUserId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    const userListings = await prisma.wasteListing.findMany({
      where: { userId: id, status: ListingStatus.open },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        wasteType: true,
        quantity: true,
        address: true,
        askingPrice: true,
        currency: true,
        deliveryAvailable: true,
      },
      take: 3,
    });

    const viewerId = auth.id;
    const isSelf = viewerId === user.id;
    const profile = isSelf
      ? user
      : {
          id: user.id,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          email: null,
          phone: null,
          address: null,
        };

    return jsonOk({
      profile,
      reviewSummary: {
        averageRating: reviewSummary._avg.score ?? null,
        reviewCount: reviewSummary._count.score,
      },
      reviews,
      openListings: userListings,
      viewerId,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

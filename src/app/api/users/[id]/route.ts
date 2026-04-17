import { ListingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getSupabaseUser } from "@/lib/auth";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    paramsSchema.parse({ id });

    const user = await prisma.user.findUnique({
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
    if (!user) return jsonError("User not found", 404);

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

    const auth = await getSupabaseUser();
    const viewerId = auth?.id ?? null;

    return jsonOk({
      profile: user,
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

import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  toUserId: z.string().uuid(),
});

/** Whether the current user already has a review for this recipient (one per pair). */
export async function GET(request: Request) {
  try {
    const me = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ toUserId: searchParams.get("toUserId") ?? "" });
    if (!parsed.success) return jsonError("Missing or invalid toUserId", 400);
    const { toUserId } = parsed.data;

    const review = await prisma.review.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId: me.id, toUserId },
      },
      select: { id: true, score: true, body: true, listingId: true },
    });

    return jsonOk({ hasReview: Boolean(review), review });
  } catch (e) {
    return handleRouteError(e);
  }
}

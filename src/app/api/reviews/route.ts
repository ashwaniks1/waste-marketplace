import { ListingStatus } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  listingId: z.string().uuid(),
  toUserId: z.string().uuid(),
  score: z.number().min(1).max(5),
  body: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const current = await requireAppUser();
    const body = reviewSchema.parse(await request.json());

    const listing = await prisma.wasteListing.findUnique({
      where: { id: body.listingId },
      include: {
        seller: { select: { id: true } },
        acceptor: { select: { id: true } },
      },
    });
    if (!listing) return jsonError("Listing not found", 404);
    if (listing.status !== ListingStatus.completed) {
      throw new HttpError(409, "Reviews can only be submitted after a completed pickup");
    }

    const validReviewer = current.id === listing.userId || current.id === listing.acceptedById;
    if (!validReviewer) {
      throw new HttpError(403, "Cannot review this listing");
    }
    const validTarget = body.toUserId === listing.userId || body.toUserId === listing.acceptedById;
    if (!validTarget || body.toUserId === current.id) {
      throw new HttpError(400, "Invalid review recipient");
    }

    const existing = await prisma.review.findFirst({
      where: {
        listingId: listing.id,
        fromUserId: current.id,
        toUserId: body.toUserId,
      },
    });
    if (existing) {
      return jsonError("You have already reviewed this user for this listing", 409);
    }

    const review = await prisma.review.create({
      data: {
        listingId: listing.id,
        fromUserId: current.id,
        toUserId: body.toUserId,
        score: body.score,
        body: body.body ?? null,
      },
    });

    return jsonOk(review);
  } catch (e) {
    return handleRouteError(e);
  }
}

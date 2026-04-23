import { Prisma, ListingStatus, UserRole } from "@prisma/client";
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

function listingParticipants(listing: {
  userId: string;
  acceptedById: string | null;
  assignedDriverId: string | null;
}) {
  return [listing.userId, listing.acceptedById, listing.assignedDriverId].filter(
    (id): id is string => Boolean(id),
  );
}

export async function POST(request: Request) {
  try {
    const current = await requireAppUser();
    const body = reviewSchema.parse(await request.json());

    const listing = await prisma.wasteListing.findUnique({
      where: { id: body.listingId },
    });
    if (!listing) return jsonError("Listing not found", 404);
    if (listing.status !== ListingStatus.completed) {
      throw new HttpError(409, "Reviews can only be submitted after a completed pickup");
    }

    const isSeller = current.id === listing.userId;
    const isBuyer = current.id === listing.acceptedById;
    const isDriver = current.role === UserRole.driver && current.id === listing.assignedDriverId;
    const validReviewer = isSeller || isBuyer || Boolean(isDriver);
    if (!validReviewer) {
      throw new HttpError(403, "Cannot review this listing");
    }

    const participants = listingParticipants(listing);
    const validTarget = participants.includes(body.toUserId) && body.toUserId !== current.id;
    if (!validTarget) {
      throw new HttpError(400, "Invalid review recipient");
    }

    const existing = await prisma.review.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId: current.id, toUserId: body.toUserId },
      },
    });
    if (existing) {
      return jsonError(
        "You have already reviewed this person. Open their profile to edit or delete your review.",
        409,
      );
    }

    let review;
    try {
      review = await prisma.review.create({
        data: {
          listingId: listing.id,
          fromUserId: current.id,
          toUserId: body.toUserId,
          score: body.score,
          body: body.body ?? null,
        },
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return jsonError(
          "You have already reviewed this person. Open their profile to edit or delete your review.",
          409,
        );
      }
      throw e;
    }

    return jsonOk(review);
  } catch (e) {
    return handleRouteError(e);
  }
}

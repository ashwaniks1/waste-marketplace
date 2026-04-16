import { ListingStatus, OfferStatus, UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";
import { serializeOffer } from "@/lib/serialize-offer";

type Ctx = { params: Promise<{ id: string }> };

/** Seller accepts one offer; listing becomes accepted; other pending offers declined. */
export async function POST(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id: offerId } = await ctx.params;

    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        include: { listing: true },
      });
      if (!offer) return { error: "not_found" as const };
      if (offer.listing.userId !== me.id && me.role !== UserRole.admin) {
        return { error: "forbidden" as const };
      }
      if (offer.status !== OfferStatus.pending || offer.listing.status !== ListingStatus.open) {
        return { error: "conflict" as const };
      }

      const listingUpdate = await tx.wasteListing.updateMany({
        where: { id: offer.listingId, status: ListingStatus.open },
        data: { status: ListingStatus.accepted, acceptedById: offer.buyerId },
      });
      if (listingUpdate.count === 0) return { error: "conflict" as const };

      await tx.offer.updateMany({
        where: {
          listingId: offer.listingId,
          status: OfferStatus.pending,
          id: { not: offer.id },
        },
        data: { status: OfferStatus.declined },
      });

      const accepted = await tx.offer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.accepted },
        include: {
          buyer: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      const listing = await tx.wasteListing.findUnique({
        where: { id: offer.listingId },
        include: {
          seller: { select: { id: true, name: true, email: true, phone: true } },
          acceptor: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      return { listing, offer: accepted };
    });

    if ("error" in result) {
      if (result.error === "not_found") return jsonError("Not found", 404);
      if (result.error === "forbidden") throw new HttpError(403, "Forbidden");
      return jsonError("Offer or listing is no longer available", 409);
    }

    const { listing, offer } = result;
    return jsonOk({
      listing: listing ? serializeListing(listing) : null,
      offer: serializeOffer(offer),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

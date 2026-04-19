import { ListingStatus, OfferStatus, PickupJobStatus, UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { buildPickupDeadline } from "@/lib/pickup-window";
import { notifyUsers } from "@/lib/notifications";
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

      const pickupForDrivers =
        offer.listing.deliveryRequired && offer.listing.assignedDriverId == null
          ? PickupJobStatus.none
          : offer.listing.pickupJobStatus;

      const listingUpdate = await tx.wasteListing.updateMany({
        where: { id: offer.listingId, status: ListingStatus.open },
        data: {
          status: ListingStatus.accepted,
          acceptedById: offer.buyerId,
          acceptedAt: new Date(),
          pickupDeadlineAt: buildPickupDeadline(),
          pickupExtendedAt: null,
          pickupJobStatus: pickupForDrivers,
          ...(offer.listing.deliveryRequired ? { buyerDeliveryConfirmed: false } : {}),
        },
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
          buyer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        },
      });

      const listing = await tx.wasteListing.findUnique({
        where: { id: offer.listingId },
        include: {
          seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          acceptor: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        },
      });

      if (listing?.deliveryRequired) {
        const pin = String(Math.floor(100000 + Math.random() * 900000));
        await tx.deliveryHandoffSecret.upsert({
          where: { listingId: offer.listingId },
          create: { listingId: offer.listingId, pin },
          update: { pin, consumedAt: null },
        });
      } else {
        await tx.deliveryHandoffSecret.deleteMany({ where: { listingId: offer.listingId } });
      }

      return { listing, offer: accepted };
    });

    if ("error" in result) {
      if (result.error === "not_found") return jsonError("Not found", 404);
      if (result.error === "forbidden") throw new HttpError(403, "Forbidden");
      return jsonError("Offer or listing is no longer available", 409);
    }

    const { listing, offer } = result;
    if (listing) {
      await notifyUsers([
        {
          userId: offer.buyerId,
          type: "offer_accepted",
          title: "Your offer was accepted",
          body: `The seller accepted your offer on a listing.`,
          listingId: listing.id,
        },
      ]);
    }
    return jsonOk({
      listing: listing ? serializeListing(listing) : null,
      offer: serializeOffer(offer),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

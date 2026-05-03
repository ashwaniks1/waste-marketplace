import { ListingStatus, PickupJobStatus, UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

/** Buyer confirms the listing is ready for driver pickup (marketplace delivery only). */
export async function POST(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.buyer && me.role !== UserRole.admin) {
      throw new HttpError(403, "Only the buyer can confirm marketplace delivery");
    }
    const { id } = await ctx.params;

    const row = await prisma.wasteListing.findUnique({ where: { id } });
    if (!row) return jsonError("Not found", 404);
    if (me.role !== UserRole.admin && row.acceptedById !== me.id) {
      throw new HttpError(403, "Forbidden");
    }
    if (!row.deliveryRequired && !row.deliveryAvailable) {
      return jsonError("This listing does not offer marketplace delivery", 409);
    }
    if (row.status !== ListingStatus.accepted) {
      return jsonError("Listing must be accepted before drivers can pick up", 409);
    }
    if (row.buyerDeliveryConfirmed && row.deliveryRequired) {
      const withParties = await prisma.wasteListing.findUnique({
        where: { id },
        include: {
          seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          acceptor: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          assignedDriver: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        },
      });
      return jsonOk(serializeListing(withParties!));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const listing = await tx.wasteListing.update({
        where: { id },
        data: {
          deliveryRequired: true,
          deliveryAvailable: true,
          buyerDeliveryConfirmed: true,
          pickupJobStatus:
            row.assignedDriverId == null &&
            (row.pickupJobStatus === PickupJobStatus.none || row.pickupJobStatus === PickupJobStatus.available)
              ? PickupJobStatus.available
              : row.pickupJobStatus,
        },
        include: {
          seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          acceptor: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          assignedDriver: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        },
      });

      const pin = String(Math.floor(100000 + Math.random() * 900000));
      await tx.deliveryHandoffSecret.upsert({
        where: { listingId: id },
        create: { listingId: id, pin },
        update: { pin, consumedAt: null },
      });

      return listing;
    });

    return jsonOk(serializeListing(updated));
  } catch (e) {
    return handleRouteError(e);
  }
}

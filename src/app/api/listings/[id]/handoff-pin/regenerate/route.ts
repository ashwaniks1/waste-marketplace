import { ListingStatus, UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.buyer && me.role !== UserRole.admin) {
      throw new HttpError(403, "Only the buyer can regenerate the delivery PIN");
    }

    const { id } = await ctx.params;
    const listing = await prisma.wasteListing.findUnique({ where: { id } });
    if (!listing) return jsonError("Not found", 404);
    if (me.role !== UserRole.admin && listing.acceptedById !== me.id) {
      throw new HttpError(403, "Forbidden");
    }
    if (listing.status !== ListingStatus.accepted || !listing.deliveryRequired || !listing.buyerDeliveryConfirmed) {
      return jsonError("Request driver delivery before regenerating the handoff PIN", 409);
    }

    const pin = String(Math.floor(100000 + Math.random() * 900000));
    await prisma.deliveryHandoffSecret.upsert({
      where: { listingId: id },
      create: { listingId: id, pin },
      update: { pin, consumedAt: null },
    });

    return jsonOk({ handoffPin: pin });
  } catch (e) {
    return handleRouteError(e);
  }
}

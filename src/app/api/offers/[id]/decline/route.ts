import { OfferStatus, UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeOffer } from "@/lib/serialize-offer";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id: offerId } = await ctx.params;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: true },
    });
    if (!offer) return jsonError("Not found", 404);
    if (offer.listing.userId !== me.id && me.role !== UserRole.admin) throw new HttpError(403, "Forbidden");
    if (offer.status !== OfferStatus.pending) {
      return jsonError("Only pending offers can be declined", 409);
    }

    const row = await prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.declined },
      include: { buyer: { select: { id: true, name: true, email: true } } },
    });
    return jsonOk(serializeOffer(row));
  } catch (e) {
    return handleRouteError(e);
  }
}

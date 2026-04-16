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
    if (me.role !== UserRole.buyer) throw new HttpError(403, "Only buyers can withdraw offers");

    const { id: offerId } = await ctx.params;
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) return jsonError("Not found", 404);
    if (offer.buyerId !== me.id) throw new HttpError(403, "Forbidden");
    if (offer.status !== OfferStatus.pending) {
      return jsonError("Only pending offers can be withdrawn", 409);
    }

    const row = await prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.withdrawn },
      include: { buyer: { select: { id: true, name: true, email: true } } },
    });
    return jsonOk(serializeOffer(row));
  } catch (e) {
    return handleRouteError(e);
  }
}

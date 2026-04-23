import { ListingStatus, OfferStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { requireListingRead } from "@/lib/listing-access";
import { prisma } from "@/lib/prisma";
import { serializeOffer } from "@/lib/serialize-offer";

const postSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

const buyerSelect = { id: true, name: true, email: true } as const;

/** List offers: seller sees all; buyer sees own; admin sees all. */
export async function GET(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id: listingId } = await ctx.params;
    await requireListingRead(listingId, me);

    const listing = await prisma.wasteListing.findUnique({ where: { id: listingId } });
    if (!listing) return jsonError("Not found", 404);

    if (me.role === UserRole.admin || (me.role === UserRole.customer && listing.userId === me.id)) {
      const rows = await prisma.offer.findMany({
        where: { listingId },
        orderBy: { createdAt: "desc" },
        include: { buyer: { select: buyerSelect } },
      });
      return jsonOk(rows.map(serializeOffer));
    }

    if (me.role === UserRole.buyer) {
      const rows = await prisma.offer.findMany({
        where: { listingId, buyerId: me.id },
        orderBy: { createdAt: "desc" },
        include: { buyer: { select: buyerSelect } },
      });
      return jsonOk(rows.map(serializeOffer));
    }

    throw new HttpError(403, "Forbidden");
  } catch (e) {
    return handleRouteError(e);
  }
}

/** Create or update pending offer (one pending per buyer per listing). */
export async function POST(request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.buyer) throw new HttpError(403, "Only buyers can make offers");

    const { id: listingId } = await ctx.params;
    const body = postSchema.parse(await request.json());
    const listing = await prisma.wasteListing.findUnique({ where: { id: listingId } });
    if (!listing) return jsonError("Not found", 404);
    if (listing.status !== ListingStatus.open) {
      return jsonError("This listing is not accepting offers", 409);
    }
    if (listing.userId === me.id) throw new HttpError(403, "Cannot offer on your own listing");

    const currency = body.currency ?? listing.currency;

    const existing = await prisma.offer.findFirst({
      where: { listingId, buyerId: me.id, status: OfferStatus.pending },
    });

    const row = existing
      ? await prisma.offer.update({
          where: { id: existing.id },
          data: { amount: body.amount, currency },
          include: { buyer: { select: buyerSelect } },
        })
      : await prisma.offer.create({
          data: {
            listingId,
            buyerId: me.id,
            amount: body.amount,
            currency,
            status: OfferStatus.pending,
          },
          include: { buyer: { select: buyerSelect } },
        });

    // Seller notification is handled by DB trigger `trg_offers_notify_seller` (covers mobile inserts too).

    return jsonOk(serializeOffer(row));
  } catch (e) {
    return handleRouteError(e);
  }
}

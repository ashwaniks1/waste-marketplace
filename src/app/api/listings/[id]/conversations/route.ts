import { UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonOk } from "@/lib/http";
import { requireListingRead } from "@/lib/listing-access";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Seller: all buyer threads for this listing (with last message).
 * Buyer: at most their own conversation (array of 0 or 1).
 */
export async function GET(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id: listingId } = await ctx.params;
    const listing = await requireListingRead(listingId, me);

    if (me.role === UserRole.customer && listing.userId === me.id) {
      const rows = await prisma.conversation.findMany({
        where: { listingId },
        orderBy: { updatedAt: "desc" },
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          messages: { take: 1, orderBy: { createdAt: "desc" } },
        },
      });
      return jsonOk(rows);
    }

    if (me.role === UserRole.buyer) {
      const row = await prisma.conversation.findUnique({
        where: { listingId_buyerId: { listingId, buyerId: me.id } },
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          messages: { take: 1, orderBy: { createdAt: "desc" } },
        },
      });
      return jsonOk(row ? [row] : []);
    }

    if (me.role === UserRole.admin) {
      const rows = await prisma.conversation.findMany({
        where: { listingId },
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          messages: { take: 1, orderBy: { createdAt: "desc" } },
        },
      });
      return jsonOk(rows);
    }

    throw new HttpError(403, "Forbidden");
  } catch (e) {
    return handleRouteError(e);
  }
}

/** Buyer opens (or reuses) a private thread with the seller for this listing. */
export async function POST(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.buyer) throw new HttpError(403, "Only buyers can start a chat");

    const { id: listingId } = await ctx.params;
    const listing = await requireListingRead(listingId, me);
    if (listing.userId === me.id) throw new HttpError(403, "Cannot chat on your own listing");

    const existing = await prisma.conversation.findUnique({
      where: { listingId_buyerId: { listingId, buyerId: me.id } },
      include: { buyer: { select: { id: true, name: true, email: true } } },
    });
    if (existing) return jsonOk(existing);

    const row = await prisma.conversation.create({
      data: { listingId, buyerId: me.id },
      include: { buyer: { select: { id: true, name: true, email: true } } },
    });
    return jsonOk(row);
  } catch (e) {
    return handleRouteError(e);
  }
}

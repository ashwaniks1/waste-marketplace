import { ListingStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonOk } from "@/lib/http";
import { requireListingRead } from "@/lib/listing-access";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  body: z.string().min(1).max(2000),
});

type Ctx = { params: Promise<{ id: string }> };

/** Public to anyone who can read the listing; includes author name. */
export async function GET(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id: listingId } = await ctx.params;
    await requireListingRead(listingId, me);

    const rows = await prisma.listingComment.findMany({
      where: { listingId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    return jsonOk(rows);
  } catch (e) {
    return handleRouteError(e);
  }
}

/**
 * Post: seller on own listing (any status except cancelled); buyer on open listing only.
 */
export async function POST(request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id: listingId } = await ctx.params;
    const listing = await requireListingRead(listingId, me);
    const parsed = postSchema.parse(await request.json());

    if (listing.status === ListingStatus.cancelled) {
      throw new HttpError(409, "Cannot comment on a cancelled listing");
    }

    const isSeller = me.role === UserRole.customer && listing.userId === me.id;
    const isBuyerComment =
      me.role === UserRole.buyer && listing.status === ListingStatus.open;

    if (!isSeller && !isBuyerComment) {
      throw new HttpError(403, "You cannot comment on this listing");
    }

    const row = await prisma.listingComment.create({
      data: {
        listingId,
        userId: me.id,
        body: parsed.body.trim(),
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    return jsonOk(row);
  } catch (e) {
    return handleRouteError(e);
  }
}

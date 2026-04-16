import { ListingStatus, UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

/** Mark completed — only the accepting buyer while status is accepted. */
export async function POST(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.buyer) throw new HttpError(403, "Only buyers can complete pickups");

    const { id } = await ctx.params;
    const result = await prisma.wasteListing.updateMany({
      where: { id, status: ListingStatus.accepted, acceptedById: me.id },
      data: { status: ListingStatus.completed },
    });

    if (result.count === 0) {
      const row = await prisma.wasteListing.findUnique({ where: { id } });
      if (!row) return jsonError("Not found", 404);
      return jsonError("Listing cannot be completed in its current state", 409);
    }

    const updated = await prisma.wasteListing.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, email: true, phone: true } },
        acceptor: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!updated) return jsonError("Not found", 404);
    return jsonOk(serializeListing(updated));
  } catch (e) {
    return handleRouteError(e);
  }
}

import { ListingStatus } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { extendPickupDeadline, relistExpiredAcceptedListing } from "@/lib/pickup-window";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;

    await relistExpiredAcceptedListing(id);

    const existing = await prisma.wasteListing.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);
    if (existing.userId !== me.id) throw new HttpError(403, "Forbidden");
    if (existing.status !== ListingStatus.accepted) {
      throw new HttpError(409, "Only accepted listings can extend the pickup window");
    }

    const anchor = existing.pickupDeadlineAt ?? new Date();
    const row = await prisma.wasteListing.update({
      where: { id },
      data: {
        pickupDeadlineAt: extendPickupDeadline(anchor),
        pickupExtendedAt: new Date(),
      },
      include: {
        seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        acceptor: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      },
    });

    return jsonOk(serializeListing(row));
  } catch (e) {
    return handleRouteError(e);
  }
}

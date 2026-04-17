import { ListingStatus, PickupJobStatus } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;

    const existing = await prisma.wasteListing.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);
    if (existing.userId !== me.id) throw new HttpError(403, "Forbidden");
    if (existing.status !== ListingStatus.no_show) {
      throw new HttpError(409, "Only no-show listings can be reopened");
    }

    const row = await prisma.wasteListing.update({
      where: { id },
      data: {
        status: ListingStatus.reopened,
        acceptedById: null,
        noShowReason: null,
        reopenedAt: new Date(),
        assignedDriverId: null,
        pickupJobStatus: existing.deliveryRequired ? PickupJobStatus.available : PickupJobStatus.none,
        driverCommissionAmount: null,
        driverCommissionPercent: null,
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

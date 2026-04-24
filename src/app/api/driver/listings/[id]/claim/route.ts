import { ListingStatus, OfferStatus, PickupJobStatus, TransportStatus, UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { computeDriverPayout, getDefaultDriverCommissionPercent } from "@/lib/commission";
import { notifyUsers } from "@/lib/notifications";
import { moneyToNumber } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

function basePayoutAmount(listing: {
  askingPrice: unknown;
  offers?: { amount: unknown }[];
}): number {
  const accepted = listing.offers?.[0];
  if (accepted) return moneyToNumber(accepted.amount);
  return moneyToNumber(listing.askingPrice);
}

/** Driver claims an open delivery pickup on a listing. */
export async function POST(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.driver) throw new HttpError(403, "Only drivers can claim pickups");

    const { id: listingId } = await ctx.params;
    const defaultPct = await getDefaultDriverCommissionPercent();

    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.wasteListing.findUnique({
        where: { id: listingId },
        include: {
          offers: { where: { status: OfferStatus.accepted }, take: 1, select: { amount: true, currency: true } },
        },
      });
      if (!listing) return { error: "not_found" as const };
      if (
        !listing.deliveryRequired ||
        listing.pickupJobStatus !== PickupJobStatus.available ||
        listing.assignedDriverId != null
      ) {
        return { error: "not_available" as const };
      }
      if (listing.deliveryRequired && !listing.buyerDeliveryConfirmed) {
        return { error: "awaiting_buyer" as const };
      }
      if (
        listing.status !== ListingStatus.open &&
        listing.status !== ListingStatus.reopened &&
        listing.status !== ListingStatus.accepted
      ) {
        return { error: "not_available" as const };
      }

      const claimed = await tx.wasteListing.updateMany({
        where: {
          id: listingId,
          pickupJobStatus: PickupJobStatus.available,
          assignedDriverId: null,
        },
        data: {
          assignedDriverId: me.id,
          pickupJobStatus: PickupJobStatus.claimed,
        },
      });
      if (claimed.count === 0) return { error: "race" as const };

      const base = basePayoutAmount(listing);
      const { payout, percentSnapshot, kind } = computeDriverPayout({
        baseAmount: base,
        listing,
        defaultPercent: defaultPct,
      });

      const updated = await tx.wasteListing.update({
        where: { id: listingId },
        data: {
          driverCommissionAmount: payout,
          driverCommissionPercent: percentSnapshot != null ? percentSnapshot : undefined,
          commissionKind: kind,
        },
        include: {
          seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          acceptor: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        },
      });

      const scheduledAt = listing.pickupDeadlineAt ?? new Date(Date.now() + 48 * 3600 * 1000);
      const job = await tx.transportJob.create({
        data: {
          listingId,
          driverId: me.id,
          scheduledAt,
          status: TransportStatus.scheduled,
          deliveryFee: listing.deliveryFee,
          notes: `Driver commission: ${payout.toFixed(2)} ${listing.currency}`,
        },
      });

      return { listing: updated, job };
    });

    if ("error" in result) {
      if (result.error === "not_found") return jsonError("Not found", 404);
      if (result.error === "not_available") return jsonError("Pickup is not available for drivers", 409);
      if (result.error === "awaiting_buyer") {
        return jsonError("The buyer has not confirmed marketplace delivery yet", 409);
      }
      return jsonError("Another driver just claimed this pickup", 409);
    }

    const { listing, job } = result;
    const notifs: { userId: string; type: string; title: string; body?: string; listingId?: string }[] = [
      {
        userId: listing.userId,
        type: "pickup_claimed",
        title: "Driver claimed your pickup",
        body: `A driver claimed delivery for listing ${listing.id.slice(0, 8)}…`,
        listingId: listing.id,
      },
    ];
    if (listing.acceptedById) {
      notifs.push({
        userId: listing.acceptedById,
        type: "pickup_claimed",
        title: "Driver assigned to pickup",
        body: "A driver accepted the delivery job for your purchase.",
        listingId: listing.id,
      });
    }
    await notifyUsers(notifs);

    return jsonOk({
      listing: serializeListing(listing),
      jobId: job.id,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

import { ListingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PICKUP_WINDOW_HOURS = 24;
export const PICKUP_EXTENSION_HOURS = 24;

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function buildPickupDeadline(from = new Date()) {
  return addHours(from, PICKUP_WINDOW_HOURS);
}

export function extendPickupDeadline(from: Date) {
  return addHours(from, PICKUP_EXTENSION_HOURS);
}

type ListingScope = Prisma.WasteListingWhereInput;

const relistData = (now: Date): Prisma.WasteListingUpdateManyMutationInput => ({
  status: ListingStatus.open,
  acceptedAt: null,
  pickupDeadlineAt: null,
  pickupExtendedAt: null,
  reopenedAt: now,
});

export async function relistExpiredAcceptedListings(extraWhere?: ListingScope) {
  const now = new Date();

  await prisma.wasteListing.updateMany({
    where: {
      status: ListingStatus.accepted,
      pickupDeadlineAt: { lte: now },
      ...(extraWhere ?? {}),
    },
    data: relistData(now),
  });
}

export async function relistExpiredAcceptedListing(listingId: string) {
  await relistExpiredAcceptedListings({ id: listingId });
}

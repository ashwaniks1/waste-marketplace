import { ListingStatus, UserRole, type User as AppUser } from "@prisma/client";
import { HttpError } from "@/lib/errors";
import { relistExpiredAcceptedListing } from "@/lib/pickup-window";
import { prisma } from "@/lib/prisma";

export async function getListingForAccess(listingId: string, me: AppUser) {
  await relistExpiredAcceptedListing(listingId);
  const row = await prisma.wasteListing.findUnique({
    where: { id: listingId },
    include: {
      seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      acceptor: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
    },
  });
  if (!row) return null;
  if (me.role === UserRole.admin) return row;
  if (me.role === UserRole.customer && row.userId === me.id) return row;
  if (me.role === UserRole.buyer) {
    if (row.status === ListingStatus.open || row.status === ListingStatus.reopened) return row;
    if (row.acceptedById === me.id) return row;
  }
  return null;
}

export async function requireListingRead(listingId: string, me: AppUser) {
  const row = await getListingForAccess(listingId, me);
  if (!row) throw new HttpError(404, "Not found");
  return row;
}

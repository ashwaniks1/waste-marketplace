import { ListingStatus } from "@prisma/client";

/** Listings where buyers can offer, sellers can edit/cancel, and drivers can see open delivery jobs. */
export function listingIsOpenForMarketplaceActions(status: ListingStatus): boolean {
  return status === ListingStatus.open || status === ListingStatus.reopened;
}

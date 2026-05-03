import { ListingStatus, PickupJobStatus, UserRole } from "@prisma/client";

export function canViewListing(
  me: { id: string; role: UserRole },
  row: {
    userId: string;
    status: ListingStatus;
    acceptedById: string | null;
    deliveryRequired: boolean;
    buyerDeliveryConfirmed: boolean;
    pickupJobStatus: PickupJobStatus;
    assignedDriverId: string | null;
  },
): boolean {
  if (me.role === UserRole.admin) return true;
  if (me.role === UserRole.customer && row.userId === me.id) return true;
  if (me.role === UserRole.buyer) {
    if (row.status === ListingStatus.open || row.status === ListingStatus.reopened) return true;
    if (row.acceptedById === me.id) return true;
  }
  if (me.role === UserRole.driver) {
    if (row.assignedDriverId === me.id) return true;
    if (
      row.deliveryRequired &&
      row.buyerDeliveryConfirmed &&
      row.pickupJobStatus === PickupJobStatus.available &&
      row.status === ListingStatus.accepted
    ) {
      return true;
    }
  }
  return false;
}

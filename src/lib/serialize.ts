import type { WasteListing } from "@prisma/client";
import { serializeGeoLocation, type SerializableGeoLocation } from "@/lib/locations";
import { moneyToNumber } from "@/lib/money";

/** Flatten Prisma Decimal for JSON responses. */
export function serializeListing<T extends WasteListing>(row: T) {
  const { offers, pickupLocation, ...rest } = row as T & {
    offers?: unknown;
    pickupLocation?: SerializableGeoLocation | null;
  };
  void offers;
  return {
    ...rest,
    pickupLocation: serializeGeoLocation(pickupLocation),
    askingPrice: moneyToNumber(row.askingPrice),
    deliveryFee: row.deliveryFee ? moneyToNumber(row.deliveryFee) : null,
    driverCommissionAmount:
      row.driverCommissionAmount != null ? moneyToNumber(row.driverCommissionAmount) : null,
    driverCommissionPercent:
      row.driverCommissionPercent != null ? moneyToNumber(row.driverCommissionPercent) : null,
  };
}

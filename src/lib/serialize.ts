import type { WasteListing } from "@prisma/client";
import { moneyToNumber } from "@/lib/money";

/** Flatten Prisma Decimal for JSON responses. */
export function serializeListing<T extends WasteListing>(row: T) {
  return {
    ...row,
    askingPrice: moneyToNumber(row.askingPrice),
  };
}

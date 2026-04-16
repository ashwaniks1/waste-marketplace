import type { Offer } from "@prisma/client";
import { moneyToNumber } from "@/lib/money";

export function serializeOffer<T extends Offer>(o: T) {
  return { ...o, amount: moneyToNumber(o.amount) };
}

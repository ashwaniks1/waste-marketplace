import { CommissionKind, type WasteListing } from "@prisma/client";
import { moneyToNumber } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export async function getDefaultDriverCommissionPercent(): Promise<number> {
  const s = await prisma.platformSettings.findUnique({ where: { id: 1 } }).catch(() => null);
  if (!s) return 10;
  return moneyToNumber(s.defaultDriverCommissionPercent);
}

/**
 * Compute driver payout for a listing at claim time.
 * Fixed: uses listing.driverCommissionAmount if already set at listing creation; otherwise amount.
 * Percent: baseAmount * (overrideOrDefault / 100).
 */
export function computeDriverPayout(params: {
  baseAmount: number;
  listing: Pick<WasteListing, "commissionKind" | "driverCommissionPercent" | "driverCommissionAmount">;
  defaultPercent: number;
}): { payout: number; percentSnapshot: number | null; kind: CommissionKind } {
  const { baseAmount, listing, defaultPercent } = params;
  const kind = listing.commissionKind ?? CommissionKind.percent;

  if (kind === CommissionKind.fixed) {
    const fixed = listing.driverCommissionAmount != null ? moneyToNumber(listing.driverCommissionAmount) : 0;
    return { payout: Math.max(0, fixed), percentSnapshot: null, kind: CommissionKind.fixed };
  }

  const pct =
    listing.driverCommissionPercent != null ? moneyToNumber(listing.driverCommissionPercent) : defaultPercent;
  const payout = Math.round(baseAmount * (pct / 100) * 100) / 100;
  return { payout: Math.max(0, payout), percentSnapshot: pct, kind: CommissionKind.percent };
}

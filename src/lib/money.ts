/** Serialize Prisma.Decimal / string / number for JSON APIs and UI. */
export function moneyToNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (v != null && typeof v === "object" && "toString" in v) return Number(String(v));
  return Number.NaN;
}

export function formatMoney(amount: unknown, currency = "USD"): string {
  const n = moneyToNumber(amount);
  if (Number.isNaN(n)) return `${currency} —`;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

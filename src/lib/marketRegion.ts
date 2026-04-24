export type MarketRegion = "IN" | "US";

export function detectMarketRegion(): MarketRegion {
  if (typeof window === "undefined") return "US";
  const locale = (navigator.language || "").toLowerCase();
  if (locale.endsWith("-in") || locale === "hi" || locale.startsWith("hi-")) return "IN";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IN";
  } catch {
    /* ignore */
  }
  return "US";
}

export function formatListingPrice(amount: number, region: MarketRegion): string {
  const currency = region === "IN" ? "INR" : "USD";
  try {
    return new Intl.NumberFormat(region === "IN" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return region === "IN" ? `₹${amount}` : `$${amount}`;
  }
}

export function weightUnitShort(region: MarketRegion): string {
  return region === "IN" ? "kg" : "lbs";
}

export function localityFilterLabel(region: MarketRegion): string {
  return region === "IN" ? "City" : "ZIP code";
}

export function optionalTaxIdLabel(region: MarketRegion): string {
  return region === "IN" ? "GST number (optional)" : "EIN (optional)";
}

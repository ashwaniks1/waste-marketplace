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

/** Statute miles from kilometers (for API params stored in miles). */
export function kmToMiles(km: number): number {
  return km / 1.609344;
}

export function milesToKm(miles: number): number {
  return miles * 1.609344;
}

/** Driver feed radius options: value is max distance in **miles** (for `miles` query param). */
export function driverDistanceFilterOptions(region: MarketRegion): { value: string; label: string }[] {
  const any: { value: string; label: string } = { value: "", label: "Any distance" };
  if (region === "IN") {
    const steps = [5, 10, 25, 50] as const;
    return [
      any,
      ...steps.map((km) => ({
        value: String(kmToMiles(km)),
        label: `Within ${km} km`,
      })),
    ];
  }
  const steps = [5, 10, 25, 50] as const;
  return [any, ...steps.map((mi) => ({ value: String(mi), label: `Within ${mi} mi` }))];
}

/** Display distance from an internal mile value (e.g. haversine miles). */
export function formatDistanceFromMiles(miles: number | null | undefined, region: MarketRegion): string {
  if (miles == null || !Number.isFinite(miles)) return "Distance unavailable";
  if (region === "IN") {
    const km = milesToKm(miles);
    return `${km < 10 ? km.toFixed(1) : km.toFixed(0)} km away`;
  }
  return `${miles.toFixed(1)} mi away`;
}

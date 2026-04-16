import Link from "next/link";
import type { WasteListing, WasteType } from "@prisma/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

function iconFor(type: WasteType) {
  return WASTE_TYPE_OPTIONS.find((o) => o.value === type)?.icon ?? "\u267B\uFE0F";
}

export function ListingCard({
  listing,
  href,
}: {
  listing: Pick<WasteListing, "id" | "wasteType" | "quantity" | "status" | "address"> & {
    askingPrice?: unknown;
    currency?: string;
  };
  href: string;
}) {
  const currency = listing.currency ?? "USD";
  const priceLabel =
    listing.askingPrice != null ? formatMoney(listing.askingPrice, currency) : null;
  const label = `${listing.wasteType.replaceAll("_", " ").toLowerCase()} listing at ${listing.address}`;

  return (
    <Link
      href={href}
      aria-label={label}
      className="block rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 transition hover:border-teal-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-2xl shrink-0" aria-hidden>
            {iconFor(listing.wasteType)}
          </span>
          <div className="min-w-0">
            <p className="font-semibold capitalize text-slate-900">
              {listing.wasteType.replaceAll("_", " ").toLowerCase()}
            </p>
            <p className="text-sm text-slate-600">{listing.quantity}</p>
            {priceLabel ? (
              <p className="mt-1 text-sm font-semibold text-teal-800">{priceLabel}</p>
            ) : null}
          </div>
        </div>
        <StatusBadge status={listing.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-500">{listing.address}</p>
    </Link>
  );
}

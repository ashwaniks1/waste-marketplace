import Link from "next/link";
import type { WasteListing, WasteType } from "@prisma/client";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

function iconFor(type: WasteType) {
  return WASTE_TYPE_OPTIONS.find((o) => o.value === type)?.icon ?? "\u267B\uFE0F";
}

export type ListingCardListing = Pick<WasteListing, "id" | "wasteType" | "quantity" | "status" | "address" | "images"> & {
  title?: string | null;
  askingPrice?: unknown;
  currency?: string;
  seller?: { name: string; avatarUrl?: string | null };
};

export function ListingCard({ listing, href }: { listing: ListingCardListing; href: string }) {
  const currency = listing.currency ?? "USD";
  const priceLabel =
    listing.askingPrice != null ? formatMoney(listing.askingPrice, currency) : null;
  const headline = listing.title?.trim()
    ? listing.title.trim()
    : listing.wasteType.replaceAll("_", " ").toLowerCase();
  const subline = listing.title?.trim()
    ? `${listing.wasteType.replaceAll("_", " ").toLowerCase()} · ${listing.quantity}`
    : listing.quantity;
  const label = `${headline} at ${listing.address}`;
  const cover = listing.images?.[0];
  const seller = listing.seller;

  return (
    <Link
      href={href}
      aria-label={label}
      className="group block overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-sm ring-1 ring-slate-100/80 backdrop-blur-sm transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 dark:border-slate-700 dark:bg-slate-900/70 dark:ring-slate-800"
    >
      <div className="relative flex h-28 w-full items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote listing URLs from storage
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-95 transition group-hover:opacity-100"
          />
        ) : (
          <span className="text-5xl opacity-90" aria-hidden>
            {iconFor(listing.wasteType)}
          </span>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 to-transparent" aria-hidden />
        <div className="absolute right-3 top-3">
          <StatusBadge status={listing.status} />
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {!cover ? (
            <span className="text-2xl shrink-0 lg:hidden" aria-hidden>
              {iconFor(listing.wasteType)}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="font-semibold capitalize text-slate-900 dark:text-slate-50">{headline}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{subline}</p>
            {priceLabel ? (
              <p className="mt-1 text-sm font-semibold text-teal-800 dark:text-teal-300">{priceLabel}</p>
            ) : null}
            <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{listing.address}</p>
          </div>
        </div>
        {seller ? (
          <div className="shrink-0 text-center">
            <UserAvatar name={seller.name} avatarUrl={seller.avatarUrl} size="sm" />
            <p className="mt-1 max-w-[4.5rem] truncate text-xs text-slate-500 dark:text-slate-400">{seller.name}</p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

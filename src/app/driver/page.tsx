"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LiveMap } from "@/components/LiveMap";
import { StatusBadge } from "@/components/StatusBadge";
import { useLiveLocation } from "@/components/LocationProvider";
import { detectMarketRegion, driverDistanceFilterOptions, formatDistanceFromMiles, type MarketRegion } from "@/lib/marketRegion";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type FeedRow = {
  id: string;
  wasteType: string;
  quantity: string;
  address: string;
  status: string;
  currency: string;
  askingPrice: number;
  deliveryRequired: boolean;
  pickupJobStatus: string;
  distanceMiles: number | null;
  estimatedDriverPayout: number;
  seller: { id: string; name: string; avatarUrl?: string | null };
  createdAt: string;
};

export default function DriverPage() {
  const location = useLiveLocation();
  const [region, setRegion] = useState<MarketRegion>("US");
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [miles, setMiles] = useState("");
  const [wasteType, setWasteType] = useState("");
  const [sort, setSort] = useState<"nearest" | "payout" | "newest">("newest");

  useEffect(() => {
    setRegion(detectMarketRegion());
  }, []);

  const distanceOptions = useMemo(() => driverDistanceFilterOptions(region), [region]);

  const loadFeed = useCallback(async () => {
    const params = new URLSearchParams();
    if (miles) params.set("miles", miles);
    if (wasteType) params.set("wasteType", wasteType);
    params.set("sort", sort);
    if (location.point) {
      params.set("lat", String(location.point.lat));
      params.set("lng", String(location.point.lng));
    }
    const res = await fetch(`/api/driver/feed?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Unable to load pickups");
    else setFeed(data);
  }, [miles, wasteType, sort, location.point]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      await loadFeed();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await loadFeed();
      } finally {
        setLoading(false);
      }
    })();
  }, [miles, wasteType, sort, loadFeed]);

  const wasteOptions = useMemo(
    () => [{ value: "", label: "All types" }, ...WASTE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))],
    [],
  );

  return (
    <>
      <AppHeader title="Pickup board" role="driver" />
      <div className="space-y-5 pt-1">
        <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-md sm:p-8">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Driver workspace
          </span>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Claim buyer-released pickups without losing your route context.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Accepted marketplace deliveries appear after the buyer requests driver pickup. Filter by material, distance,
                and payout, then open the job record to claim it.
              </p>
            </div>
            <Button type="button" onClick={refresh} disabled={loading} className="h-12 rounded-2xl px-6 shadow-cosmos-sm">
              Refresh board
            </Button>
          </div>
        </section>

      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <aside className="min-h-0 space-y-4 lg:col-span-4">
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-sm sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Filters</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Available jobs</p>
              <p className="mt-1 text-sm text-slate-600">
                Distance uses your live location when you allow it.
              </p>
            </div>
          </div>

          {location.permission === "denied" ? (
            <p className="rounded-3xl border border-amber-200/60 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-cosmos-sm">
              Location is off, so “nearest” sort and distance labels are limited. Turn on location in your browser
              settings to sort by distance and see how far each stop is.
            </p>
          ) : location.point ? (
            <div>
              <LiveMap center={location.point} heightClassName="h-64" />
            </div>
          ) : (
            <p className="text-sm text-slate-600">Requesting your location…</p>
          )}

          <div className="grid gap-3 rounded-3xl border border-slate-200/50 bg-white p-4 shadow-cosmos-sm">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {region === "IN" ? "Radius" : "Distance"}
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
              >
                {distanceOptions.map((o) => (
                  <option key={o.value || "any"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Waste type
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
              >
                {wasteOptions.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sort
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="newest">Newest</option>
                <option value="nearest">Nearest</option>
                <option value="payout">Highest payout</option>
              </select>
            </label>
          </div>
        </aside>

        <section className="min-h-0 space-y-3 lg:col-span-8">
          {error ? (
            <p className="rounded-3xl border border-rose-200/60 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-cosmos-sm">
              {error}
            </p>
          ) : null}

          {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}

          {!loading && feed.length === 0 ? (
            <EmptyState
              variant="pickups"
              title="No pickups in range"
              description="Try widening the distance filter, pick another material, or check back when sellers post delivery jobs."
            />
          ) : null}

          {!loading && feed.length > 0 ? (
            <div className="space-y-3">
            {feed.map((row) => {
              const label = WASTE_TYPE_OPTIONS.find((o) => o.value === row.wasteType)?.label ?? row.wasteType;
              return (
                <div
                  key={row.id}
                  className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-sm transition hover:border-teal-200/80 hover:shadow-cosmos-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{label}</p>
                      <p className="text-sm text-slate-600">{row.quantity}</p>
                    </div>
                    <StatusBadge status={row.status as never} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{row.address}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-900">
                      Earn {formatMoney(row.estimatedDriverPayout, row.currency)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      {formatDistanceFromMiles(row.distanceMiles, region)}
                    </span>
                    <span className="text-slate-500">Seller: {row.seller.name}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/driver/listings/${row.id}`}>
                      <Button type="button" variant="secondary">
                        View job
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        </section>
      </div>
      </div>
    </>
  );
}

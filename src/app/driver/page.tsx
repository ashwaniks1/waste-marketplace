"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useLiveLocation } from "@/components/LocationProvider";
import { detectMarketRegion, driverDistanceFilterOptions, formatDistanceFromMiles, type MarketRegion } from "@/lib/marketRegion";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

const LiveMap = dynamic(() => import("@/components/LiveMap").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="h-64 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-full items-center justify-center text-sm text-slate-600">Loading map…</div>
    </div>
  ),
});

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
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Open jobs</p>
            <p className="mt-1 text-sm text-slate-600">
              Claim delivery jobs with driver pickup. Distance uses your live location when you allow it.
            </p>
          </div>
          <Button type="button" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </div>

        {location.permission === "denied" ? (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Location is off, so “nearest” sort and distance labels are limited. Turn on location in your browser
            settings to sort by distance and see how far each stop is.
          </p>
        ) : location.point ? (
          <div className="mb-6">
            <LiveMap center={location.point} heightClassName="h-64" />
          </div>
        ) : (
          <p className="mb-4 text-sm text-slate-600">Requesting your location…</p>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {region === "IN" ? "Radius" : "Distance"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="newest">Newest</option>
              <option value="nearest">Nearest</option>
              <option value="payout">Highest payout</option>
            </select>
          </label>
        </div>

        {error ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

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
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
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
      </div>
    </>
  );
}

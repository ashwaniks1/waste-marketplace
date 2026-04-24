"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard, type ListingCardListing } from "@/components/ListingCard";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

export default function BuyerHomePage() {
  const [rows, setRows] = useState<ListingCardListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wasteType, setWasteType] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (wasteType) params.set("wasteType", wasteType);
    if (debouncedQ) params.set("q", debouncedQ);
    if (sort !== "newest") params.set("sort", sort);
    const res = await fetch(`/api/listings?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setRows(data);
      setError(null);
    } else {
      setError(typeof data?.error === "string" ? data.error : "Unable to load listings");
    }
  }, [wasteType, sort, debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const wasteOptions = [{ value: "", label: "All materials" }, ...WASTE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-emerald-50 via-white to-slate-50 pb-10 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950">
      <AppHeader title="Available near you" role="buyer" />
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 pt-4">
        <p className="rounded-2xl border border-emerald-200/60 bg-white/80 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900/50 dark:text-slate-200">
          Browse open listings from sellers. Filter by material, search title or address, or sort by price.
        </p>

        <div className="grid gap-2 rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm sm:grid-cols-2 sm:gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Material
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
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
            Search
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title or address"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              autoComplete="off"
            />
          </label>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading listings">
            <div className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
          </div>
        ) : null}
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
        {!loading && rows.length === 0 ? (
          <EmptyState
            variant="listings"
            title="No open listings"
            description="Try adjusting filters, or check back soon — sellers post new materials regularly."
          />
        ) : null}
        {!loading &&
          rows.map((l) => <ListingCard key={l.id} listing={l} href={`/listing/${l.id}`} />)}
      </div>
    </div>
  );
}

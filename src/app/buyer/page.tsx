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
    <div className="pb-8">
      <AppHeader title="Available near you" role="buyer" />

      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <aside className="min-h-0 space-y-4 lg:col-span-4">
          <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-md sm:p-8">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
              Buyer workspace
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Browse, compare, and reach sellers when you are ready.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              This view uses the{" "}
              <strong className="font-semibold text-slate-800">same neutral canvas and elevated panels</strong> as the
              seller experience: a calm background, clear cards, and straightforward actions. Use the filters below to
              narrow materials and price, then open any card for full detail, photos, and in-app chat with the lister.
              Your messages with sellers live under <span className="text-slate-800">Messages</span> in the header.
            </p>
          </section>

          <div className="space-y-3">
            <p className="rounded-3xl border border-slate-200/50 bg-white px-4 py-3 text-sm leading-relaxed text-slate-600 shadow-cosmos-sm">
              Filter by material, search title or address, or sort by price. Results update with your choices.
            </p>

            <div className="grid gap-2 rounded-3xl border border-slate-200/50 bg-white p-3 shadow-cosmos-sm sm:grid-cols-2 sm:gap-3 lg:grid-cols-1">
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
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2 lg:col-span-1">
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
          </div>
        </aside>

        <section className="min-h-0 space-y-3 lg:col-span-8">
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading listings">
              <div className="h-36 animate-pulse rounded-3xl bg-cosmos-page-alt" />
              <div className="h-36 animate-pulse rounded-3xl bg-cosmos-page-alt" />
            </div>
          ) : null}
          {error ? (
            <p className="rounded-3xl border border-rose-200/60 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-cosmos-sm">
              {error}
            </p>
          ) : null}
          {!loading && rows.length === 0 ? (
            <EmptyState
              variant="listings"
              title="No open listings"
              description="Try adjusting filters, or check back soon — sellers post new materials regularly."
            />
          ) : null}
          {!loading ? rows.map((l) => <ListingCard key={l.id} listing={l} href={`/listing/${l.id}`} />) : null}
        </section>
      </div>
    </div>
  );
}

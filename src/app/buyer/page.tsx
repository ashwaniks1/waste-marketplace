"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard, type ListingCardListing } from "@/components/ListingCard";

export default function BuyerHomePage() {
  const [rows, setRows] = useState<ListingCardListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/listings");
      const data = await res.json();
      if (res.ok) setRows(data);
      else setError(typeof data?.error === "string" ? data.error : "Unable to load listings");
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-emerald-50 via-white to-slate-50 pb-10 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950">
      <AppHeader title="Available near you" role="buyer" />
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 pt-4">
        <div className="rounded-2xl border border-emerald-200/60 bg-white/70 px-4 py-3 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-emerald-900/40 dark:bg-slate-900/50 dark:text-slate-200">
          Premium marketplace feed: open + reopened listings. Use filters on mobile for distance sorting; web keeps your
          existing listing detail flows unchanged.
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
            description="Check back soon — sellers publish new materials regularly."
          />
        ) : null}
        {rows.map((l) => (
          <ListingCard key={l.id} listing={l} href={`/listing/${l.id}`} />
        ))}
        <Link
          href="/buyer/pickups"
          className="mt-4 flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lift dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          My pickups
        </Link>
      </div>
    </div>
  );
}

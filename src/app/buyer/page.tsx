"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard, type ListingCardListing } from "@/components/ListingCard";

export default function BuyerHomePage() {
  const [rows, setRows] = useState<ListingCardListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/listings");
      const data = await res.json();
      if (res.ok) setRows(data);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <AppHeader title="Available near you" role="buyer" />
      <div className="space-y-3 px-4 pt-4">
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
          Map view & distance sort ship in Phase 2 — showing all open listings for now.
        </p>
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading listings">
            <div className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
          </div>
        ) : null}
        {!loading && rows.length === 0 ? (
          <EmptyState
            variant="listings"
            title="No open listings"
            description="Check back soon — sellers publish new materials regularly."
          />
        ) : null}
        {rows.map((l) => (
          <ListingCard key={l.id} listing={l} href={`/buyer/listings/${l.id}`} />
        ))}
        <Link
          href="/buyer/pickups"
          className="mt-4 flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm"
        >
          My pickups
        </Link>
      </div>
    </>
  );
}

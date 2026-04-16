"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WasteListing } from "@prisma/client";
import { AppHeader } from "@/components/AppHeader";
import { ListingCard } from "@/components/ListingCard";

export default function BuyerHomePage() {
  const [rows, setRows] = useState<WasteListing[]>([]);
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
        {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-slate-600">No open listings right now.</p>
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

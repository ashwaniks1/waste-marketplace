"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard, type ListingCardListing } from "@/components/ListingCard";

export default function BuyerPickupsPage() {
  const [rows, setRows] = useState<ListingCardListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/listings?scope=mine");
      const data = await res.json();
      if (res.ok) setRows(data);
      setLoading(false);
    })();
  }, []);

  const active = rows.filter((r) => r.status === "accepted");
  const done = rows.filter((r) => r.status === "completed");

  return (
    <>
      <AppHeader title="My pickups" backHref="/buyer" role="buyer" />
      <div className="space-y-6 px-4 pt-4">
        <section>
          <h2 className="text-sm font-semibold text-slate-800">In progress</h2>
          {loading ? (
            <div className="mt-2 space-y-3" aria-busy="true" aria-label="Loading pickups">
              <div className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
            </div>
          ) : null}
          {!loading && active.length === 0 ? (
            <EmptyState variant="pickups" title="No active pickups" description="Accept a listing from the marketplace to see it here." />
          ) : null}
          <div className="mt-2 space-y-3">
            {active.map((l) => (
              <ListingCard key={l.id} listing={l} href={`/listing/${l.id}`} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-slate-800">Completed (earnings placeholder)</h2>
          <p className="text-xs text-slate-500">Pricing & earnings in Phase 2.</p>
          {!loading && done.length === 0 ? (
            <EmptyState variant="generic" title="No completed pickups yet" description="Finished jobs will appear in this section." />
          ) : null}
          <div className="mt-2 space-y-3">
            {done.map((l) => (
              <ListingCard key={l.id} listing={l} href={`/listing/${l.id}`} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

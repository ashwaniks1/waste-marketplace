"use client";

import { useEffect, useState } from "react";
import type { WasteListing } from "@prisma/client";
import { AppHeader } from "@/components/AppHeader";
import { ListingCard } from "@/components/ListingCard";

export default function BuyerPickupsPage() {
  const [rows, setRows] = useState<WasteListing[]>([]);
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
          {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}
          {!loading && active.length === 0 ? (
            <p className="text-sm text-slate-600">No active pickups.</p>
          ) : null}
          <div className="mt-2 space-y-3">
            {active.map((l) => (
              <ListingCard key={l.id} listing={l} href={`/buyer/listings/${l.id}`} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-slate-800">Completed (earnings placeholder)</h2>
          <p className="text-xs text-slate-500">Pricing & earnings in Phase 2.</p>
          <div className="mt-2 space-y-3">
            {done.map((l) => (
              <ListingCard key={l.id} listing={l} href={`/buyer/listings/${l.id}`} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { WasteListing } from "@prisma/client";
import { AppHeader } from "@/components/AppHeader";
import { ListingCard } from "@/components/ListingCard";

export default function CustomerListingsPage() {
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
      <AppHeader title="My listings" backHref="/customer" role="customer" />
      <div className="space-y-3 px-4 pt-4">
        {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-slate-600">No listings yet — tap Sell waste on Home.</p>
        ) : null}
        {rows.map((l) => (
          <ListingCard key={l.id} listing={l} href={`/customer/listings/${l.id}`} />
        ))}
      </div>
    </>
  );
}

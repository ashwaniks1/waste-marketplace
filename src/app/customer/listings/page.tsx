"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard, type ListingCardListing } from "@/components/ListingCard";

export default function CustomerListingsPage() {
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
      <AppHeader title="My listings" backHref="/customer" role="customer" />
      <div className="space-y-3 px-4 pt-4">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading listings">
            <div className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
          </div>
        ) : null}
        {!loading && rows.length === 0 ? (
          <EmptyState
            variant="listings"
            title="No listings yet"
            description="Create your first listing from the home tab to start receiving buyer offers."
            actionLabel="Back to home"
            actionHref="/customer"
          />
        ) : null}
        {rows.map((l) => (
          <ListingCard key={l.id} listing={l} href={`/customer/listings/${l.id}`} />
        ))}
      </div>
    </>
  );
}

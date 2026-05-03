"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { customerListingDetailHref } from "@/lib/seller-workspace-url";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import type { ListingCardListing } from "@/components/ListingCard";

export default function CustomerListingsPage() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<ListingCardListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/listings");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRows(data);
        setError(null);
      } else {
        setError("We couldn’t load your listings right now. Try refreshing in a moment.");
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5 pt-1 lg:h-full lg:overflow-y-auto lg:pr-1">
      <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-md sm:p-8">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
          Listings board
        </span>
        <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Open any listing from the left rail to manage its full sale flow.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          The main workspace is for detail, offers, and pickup coordination; open the floating inbox when you are ready
          to message buyers.
        </p>

        {!loading && rows.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={customerListingDetailHref(rows[0].id, searchParams)} className="block sm:min-w-[220px]">
              <Button className="h-12 w-full rounded-2xl text-base shadow-cosmos-sm sm:h-14">
                Open latest listing
              </Button>
            </Link>
            <Link
              href="/customer/listings/new"
              className="flex h-12 items-center justify-center rounded-2xl border border-slate-200/60 bg-cosmos-page-alt/50 px-6 text-sm font-semibold text-slate-800 shadow-cosmos-sm transition hover:border-slate-300 hover:bg-white sm:h-14 sm:min-w-[220px]"
            >
              Create another listing
            </Link>
          </div>
        ) : null}
      </section>

      <div className="space-y-3">
        {error ? (
          <p className="rounded-3xl border border-rose-200/60 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-cosmos-sm">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading listings">
            <div className="h-36 animate-pulse rounded-3xl bg-cosmos-page-alt" />
            <div className="h-36 animate-pulse rounded-3xl bg-cosmos-page-alt" />
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
      </div>
      {!loading && rows.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Total listings</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{rows.length}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Every listing stays available in the rail for quick switching.</p>
          </div>
          <div className="rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Live listings</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-700">
              {rows.filter((row) => ["open", "accepted", "in_progress", "reopened"].includes(row.status)).length}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Keep pricing and pickup details current so buyers can move quickly.</p>
          </div>
          <div className="rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Completed</p>
            <p className="mt-3 text-3xl font-semibold text-slate-700">
              {rows.filter((row) => row.status === "completed").length}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Reviews and follow-up notes still live inside each finished listing.</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

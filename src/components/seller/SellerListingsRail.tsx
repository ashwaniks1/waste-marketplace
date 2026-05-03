"use client";

import type { ListingStatus, WasteType } from "@prisma/client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { customerListingDetailHref } from "@/lib/seller-workspace-url";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type SellerListingRow = {
  id: string;
  title?: string | null;
  wasteType: WasteType;
  quantity: string;
  status: ListingStatus;
  address: string;
  images: string[];
  askingPrice: number;
  currency: string;
  createdAt: string;
};

const liveStatuses = new Set<ListingStatus>(["open", "reopened", "accepted", "in_progress"]);
const statusPriority: Record<ListingStatus, number> = {
  accepted: 0,
  in_progress: 0,
  open: 1,
  reopened: 1,
  no_show: 2,
  completed: 3,
  cancelled: 4,
};

function typeMetaFor(type: WasteType) {
  return WASTE_TYPE_OPTIONS.find((option) => option.value === type);
}

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type ListFilter = "all" | "live" | "motion";

function rowMatchesFilter(row: SellerListingRow, f: ListFilter) {
  if (f === "all") return true;
  if (f === "live") return liveStatuses.has(row.status);
  return row.status === "accepted" || row.status === "in_progress";
}

export function SellerListingsRail() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<SellerListingRow[]>([]);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstPathEffect = useRef(true);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const response = await fetch("/api/listings", { cache: "no-store" });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setError("We couldn’t load your listings right now. Try refreshing in a moment.");
        return;
      }
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError("We couldn’t load your listings right now. Try refreshing in a moment.");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isFirstPathEffect.current) {
      isFirstPathEffect.current = false;
      return;
    }
    void load({ silent: true });
  }, [pathname, load]);

  const activeListingId = useMemo(() => {
    const match = pathname.match(/^\/customer\/listings\/([^/?]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const orderedRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        const priority = statusPriority[left.status] - statusPriority[right.status];
        if (priority !== 0) return priority;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [rows],
  );

  const liveCount = rows.filter((row) => liveStatuses.has(row.status)).length;
  const acceptedCount = rows.filter((row) => row.status === "accepted" || row.status === "in_progress").length;

  const displayRows = useMemo(
    () => orderedRows.filter((row) => rowMatchesFilter(row, listFilter)),
    [orderedRows, listFilter],
  );

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-cosmos-md">
      <div className="shrink-0 border-b border-slate-200/50 bg-cosmos-page-alt/80 px-4 py-4 sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Related</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold leading-snug text-slate-900">Your listings</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">Pick a record. Details open in the center.</p>
          </div>
          <Link
            href="/customer/listings/new"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-cosmos-sm transition hover:bg-slate-800"
          >
            New
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5" role="tablist" aria-label="Filter listings">
          <button
            type="button"
            role="tab"
            aria-selected={listFilter === "all"}
            onClick={() => setListFilter("all")}
            className={`rounded-2xl border px-2 py-2 text-left transition ${
              listFilter === "all"
                ? "border-slate-800 bg-slate-900 text-white shadow-cosmos-sm"
                : "border-slate-200/80 bg-white shadow-cosmos-sm hover:border-slate-300"
            }`}
          >
            <p
              className={`text-[9px] font-bold uppercase tracking-[0.16em] ${listFilter === "all" ? "text-white/75" : "text-slate-400"}`}
            >
              Total
            </p>
            <p className={`mt-0.5 text-sm font-bold ${listFilter === "all" ? "text-white" : "text-slate-900"}`}>
              {rows.length}
            </p>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listFilter === "live"}
            onClick={() => setListFilter("live")}
            className={`rounded-2xl border px-2 py-2 text-left transition ${
              listFilter === "live"
                ? "border-emerald-400/50 bg-emerald-50/90 shadow-cosmos-sm ring-1 ring-emerald-200/50"
                : "border-slate-200/80 bg-white shadow-cosmos-sm hover:border-emerald-200/80"
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Live</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-800">{liveCount}</p>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listFilter === "motion"}
            onClick={() => setListFilter("motion")}
            className={`rounded-2xl border px-2 py-2 text-left transition ${
              listFilter === "motion"
                ? "border-amber-300/60 bg-amber-50/90 shadow-cosmos-sm ring-1 ring-amber-200/50"
                : "border-slate-200/80 bg-white shadow-cosmos-sm hover:border-amber-200/50"
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Motion</p>
            <p className="mt-0.5 text-sm font-bold text-amber-950/90">{acceptedCount}</p>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-cosmos-page-alt/30 px-3 py-2.5 sm:px-4">
        {error ? (
          <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : null}

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading listings">
            <div className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100" />
            <div className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100" />
            <div className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100" />
          </div>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-900">No listings yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create your first listing to start receiving offers and buyer questions.
            </p>
            <Link
              href="/customer/listings/new"
              className="mt-5 inline-flex items-center justify-center rounded-2xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 transition hover:border-teal-300"
            >
              Create listing
            </Link>
          </div>
        ) : null}

        {!loading && rows.length > 0 && displayRows.length === 0 ? (
          <p className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-sm text-slate-600">
            No listings in this view. Try another filter.
          </p>
        ) : null}

        {!loading && displayRows.length > 0 ? (
          <div className="space-y-3">
            {displayRows.map((row) => {
              const active = row.id === activeListingId;
              const cover = row.images?.[0];
              const typeMeta = typeMetaFor(row.wasteType);
              const headline = row.title?.trim() ? row.title.trim() : typeMeta?.label ?? row.wasteType;
              const quantity = row.quantity.trim();

              return (
                <Link
                  key={row.id}
                  href={customerListingDetailHref(row.id, searchParams)}
                  aria-current={active ? "page" : undefined}
                  className={`group block rounded-2xl border px-3 py-3 transition ${
                    active
                      ? "border-teal-400/50 bg-white shadow-cosmos-md ring-1 ring-teal-200/60"
                      : "border-slate-200/50 bg-white shadow-cosmos-sm hover:border-slate-300/80 hover:shadow-cosmos-md"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-50/80 p-2">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote listing image URLs
                        <img src={cover} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-3xl" aria-hidden>
                          {typeMeta?.icon ?? "♻️"}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{headline}</p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {typeMeta?.label ?? row.wasteType} · {quantity}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-teal-800">
                        {formatMoney(row.askingPrice, row.currency ?? "USD")}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{row.address}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{liveStatuses.has(row.status) ? "Active workspace" : "Past listing"}</span>
                    <time>{formatCreatedAt(row.createdAt)}</time>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

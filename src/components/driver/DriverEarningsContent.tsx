"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type DriverJob = {
  id: string;
  status: string;
  scheduledAt: string;
  completedAt?: string | null;
  listing: {
    id: string;
    wasteType: string;
    quantity: string;
    address: string;
    currency: string;
    driverCommissionAmount: unknown;
    seller: { id: string; name: string };
  };
};

type StatementRow = {
  id: string;
  date: string;
  description: string;
  counterparty: string;
  status: "posted" | "pending" | "void";
  amount: number;
  currency: string;
};

function statusLabel(status: StatementRow["status"]) {
  if (status === "posted") return "Posted";
  if (status === "pending") return "Pending";
  return "Void";
}

export function DriverEarningsContent() {
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/driver/jobs", { cache: "no-store" });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          setError("We couldn’t load your earnings right now. Try refreshing in a moment.");
          return;
        }
        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError("We couldn’t load your earnings right now. Try refreshing in a moment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statement = useMemo<StatementRow[]>(
    () =>
      jobs
        .map((job) => {
          const label = WASTE_TYPE_OPTIONS.find((o) => o.value === job.listing.wasteType)?.label ?? job.listing.wasteType;
          const amount = Number(job.listing.driverCommissionAmount ?? 0);
          const status: StatementRow["status"] =
            job.status === "completed" ? "posted" : job.status === "cancelled" ? "void" : "pending";
          return {
            id: job.id,
            date: job.completedAt ?? job.scheduledAt,
            description: `${label} pickup · ${job.listing.quantity}`,
            counterparty: job.listing.seller.name,
            status,
            amount,
            currency: job.listing.currency,
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [jobs],
  );

  const currency = statement[0]?.currency ?? "USD";
  const posted = statement.filter((row) => row.status === "posted");
  const pending = statement.filter((row) => row.status === "pending");
  const postedTotal = posted.reduce((sum, row) => sum + row.amount, 0);
  const pendingTotal = pending.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-5 pt-1">
      <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-md sm:p-8">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
          Driver earnings
        </span>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Statement view for completed and pending pickups.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Review payouts like a bank account ledger, with posted earnings separated from route work still in progress.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-cosmos-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Available balance</p>
            <p className="mt-2 text-3xl font-bold">{formatMoney(postedTotal, currency)}</p>
            <p className="mt-1 text-sm text-white/70">{formatMoney(pendingTotal, currency)} pending</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-4 shadow-cosmos-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Posted credits</p>
          <p className="mt-2 text-2xl font-bold text-emerald-950">{formatMoney(postedTotal, currency)}</p>
          <p className="mt-1 text-xs text-emerald-800">{posted.length} completed pickup{posted.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-4 shadow-cosmos-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Pending credits</p>
          <p className="mt-2 text-2xl font-bold text-sky-950">{formatMoney(pendingTotal, currency)}</p>
          <p className="mt-1 text-xs text-sky-800">{pending.length} active pickup{pending.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-cosmos-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Statement items</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{statement.length}</p>
          <p className="mt-1 text-xs text-slate-600">Across claimed jobs</p>
        </div>
      </section>

      {error ? (
        <p className="rounded-3xl border border-rose-200/60 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-cosmos-sm">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-slate-600">Getting your earnings statement.</p> : null}

      {!loading && statement.length === 0 ? (
        <EmptyState
          variant="pickups"
          title="No earnings yet"
          description="Completed driver pickups will post here as statement credits."
          actionLabel="Open pickup board"
          actionHref="/driver"
        />
      ) : null}

      {!loading && statement.length > 0 ? (
        <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-cosmos-md">
          <div className="border-b border-slate-200/60 px-5 py-4">
            <p className="text-sm font-bold text-slate-950">Activity statement</p>
            <p className="mt-1 text-xs text-slate-500">Newest transactions first</p>
          </div>
          <div className="divide-y divide-slate-100">
            {statement.map((row) => (
              <div key={row.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(row.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{row.description}</p>
                  <p className="mt-1 text-xs text-slate-500">Seller: {row.counterparty}</p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      row.status === "posted"
                        ? "bg-emerald-50 text-emerald-700"
                        : row.status === "pending"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabel(row.status)}
                  </span>
                </div>
                <p className={`text-right text-base font-bold ${row.status === "void" ? "text-slate-400" : "text-slate-950"}`}>
                  {row.status === "void" ? "" : "+"}
                  {formatMoney(row.status === "void" ? 0 : row.amount, row.currency)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

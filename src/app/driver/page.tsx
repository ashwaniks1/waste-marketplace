"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type FeedRow = {
  id: string;
  wasteType: string;
  quantity: string;
  address: string;
  status: string;
  currency: string;
  askingPrice: number;
  deliveryRequired: boolean;
  pickupJobStatus: string;
  distanceMiles: number | null;
  estimatedDriverPayout: number;
  seller: { id: string; name: string; avatarUrl?: string | null };
  createdAt: string;
};

type DriverJob = {
  id: string;
  status: string;
  scheduledAt: string;
  notes: string | null;
  listing: {
    id: string;
    wasteType: string;
    quantity: string;
    address: string;
    askingPrice: string;
    currency: string;
    status: string;
    deliveryRequired: boolean;
    pickupJobStatus: string;
    driverCommissionAmount: unknown;
    seller: { id: string; name: string; phone: string | null; avatarUrl?: string | null };
    acceptor: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
  };
};

const MILE_FILTERS = [
  { value: "", label: "Any distance" },
  { value: "5", label: "Within 5 mi" },
  { value: "10", label: "Within 10 mi" },
  { value: "25", label: "Within 25 mi" },
  { value: "50", label: "Within 50 mi" },
];

export default function DriverPage() {
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [miles, setMiles] = useState("");
  const [wasteType, setWasteType] = useState("");
  const [sort, setSort] = useState<"nearest" | "payout" | "newest">("newest");

  const loadFeed = useCallback(async () => {
    const params = new URLSearchParams();
    if (miles) params.set("miles", miles);
    if (wasteType) params.set("wasteType", wasteType);
    params.set("sort", sort);
    const res = await fetch(`/api/driver/feed?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Unable to load pickups");
    else setFeed(data);
  }, [miles, wasteType, sort]);

  const loadJobs = useCallback(async () => {
    const res = await fetch("/api/driver/jobs", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Unable to load jobs");
    else setJobs(data);
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadFeed(), loadJobs()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  useEffect(() => {
    if (tab !== "available") return;
    void (async () => {
      setLoading(true);
      try {
        await loadFeed();
      } finally {
        setLoading(false);
      }
    })();
  }, [tab, miles, wasteType, sort, loadFeed]);

  async function updateJobStatus(jobId: string, status: "in_transit" | "completed" | "cancelled") {
    setBusyId(jobId);
    setError(null);
    try {
      const res = await fetch(`/api/driver/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Unable to update job");
      else {
        setJobs((current) => current.map((job) => (job.id === jobId ? data : job)));
        await loadFeed();
      }
    } catch {
      setError("Unable to update job");
    } finally {
      setBusyId(null);
    }
  }

  const wasteOptions = useMemo(() => [{ value: "", label: "All types" }, ...WASTE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))], []);

  return (
    <>
      <AppHeader title="Driver" role="driver" />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Pickup board</p>
            <p className="mt-1 text-sm text-slate-600">
              Claim delivery jobs sellers posted with driver pickup. Set your home base under Profile for distance filters.
            </p>
          </div>
          <Button type="button" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="mb-4 flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === "available" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
            onClick={() => setTab("available")}
          >
            Available
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
            onClick={() => setTab("mine")}
          >
            My jobs
          </button>
        </div>

        {tab === "available" ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Distance
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
              >
                {MILE_FILTERS.map((o) => (
                  <option key={o.value || "any"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Waste type
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
              >
                {wasteOptions.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sort
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="newest">Newest</option>
                <option value="nearest">Nearest</option>
                <option value="payout">Highest payout</option>
              </select>
            </label>
          </div>
        ) : null}

        {error ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

        {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}

        {!loading && tab === "available" && feed.length === 0 ? (
          <EmptyState
            variant="pickups"
            title="No pickups in range"
            description="Try widening the distance filter or check back when sellers post delivery jobs."
          />
        ) : null}

        {!loading && tab === "available" ? (
          <div className="space-y-3">
            {feed.map((row) => {
              const label = WASTE_TYPE_OPTIONS.find((o) => o.value === row.wasteType)?.label ?? row.wasteType;
              return (
                <div
                  key={row.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{label}</p>
                      <p className="text-sm text-slate-600">{row.quantity}</p>
                    </div>
                    <StatusBadge status={row.status as never} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{row.address}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-900">
                      Earn {formatMoney(row.estimatedDriverPayout, row.currency)}
                    </span>
                    {row.distanceMiles != null ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                        {row.distanceMiles.toFixed(1)} mi away
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">Distance n/a</span>
                    )}
                    <span className="text-slate-500">Seller: {row.seller.name}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/driver/listings/${row.id}`}>
                      <Button type="button" variant="secondary">
                        View job
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {!loading && tab === "mine" && jobs.length === 0 ? (
          <EmptyState variant="pickups" title="No assigned jobs" description="Claim a pickup from the Available tab." />
        ) : null}

        {!loading && tab === "mine" ? (
          <div className="space-y-4">
            {jobs.map((job) => {
              const payout =
                job.listing.driverCommissionAmount != null
                  ? formatMoney(Number(job.listing.driverCommissionAmount), job.listing.currency)
                  : "—";
              const label =
                WASTE_TYPE_OPTIONS.find((o) => o.value === job.listing.wasteType)?.label ?? job.listing.wasteType;
              return (
                <div key={job.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{label}</p>
                      <p className="mt-1 text-sm text-slate-600">{job.listing.quantity}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-700">
                      {job.status.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-emerald-50/80 p-3">
                      <p className="text-xs uppercase text-emerald-800">Your payout</p>
                      <p className="mt-1 text-lg font-bold text-emerald-900">{payout}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-500">Pickup</p>
                      <p className="mt-1 text-sm text-slate-700">{new Date(job.scheduledAt).toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-500">Seller</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{job.listing.seller.name}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{job.listing.address}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/driver/listings/${job.listing.id}`}>
                      <Button type="button" variant="secondary">
                        Open listing
                      </Button>
                    </Link>
                    {job.status === "scheduled" ? (
                      <Button type="button" onClick={() => updateJobStatus(job.id, "in_transit")} disabled={busyId === job.id}>
                        Start pickup
                      </Button>
                    ) : null}
                    {job.status === "in_transit" ? (
                      <Button type="button" onClick={() => updateJobStatus(job.id, "completed")} disabled={busyId === job.id}>
                        Mark complete
                      </Button>
                    ) : null}
                    {job.status !== "completed" ? (
                      <Button type="button" variant="ghost" onClick={() => updateJobStatus(job.id, "cancelled")} disabled={busyId === job.id}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}

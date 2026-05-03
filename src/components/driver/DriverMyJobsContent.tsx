"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useLiveLocation } from "@/components/LocationProvider";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

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

type AvailableJob = {
  id: string;
  wasteType: string;
  quantity: string;
  address: string;
  currency: string;
  estimatedDriverPayout: number | null;
  seller?: { name: string };
};

type JobFilter = "active" | "available" | "completed" | "all";

export function DriverMyJobsContent() {
  const location = useLiveLocation();
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [filter, setFilter] = useState<JobFilter>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pins, setPins] = useState<Record<string, string>>({});
  const lastShareRef = useRef<Record<string, number>>({});

  const loadJobs = useCallback(async () => {
    const [jobsResponse, feedResponse] = await Promise.all([
      fetch("/api/driver/jobs", { cache: "no-store" }),
      fetch("/api/driver/feed", { cache: "no-store" }),
    ]);
    const jobsData = await jobsResponse.json();
    const feedData = await feedResponse.json().catch(() => []);
    if (!jobsResponse.ok) {
      setError(jobsData.error ?? "Unable to load jobs");
      return;
    }
    setJobs(jobsData);
    if (feedResponse.ok && Array.isArray(feedData)) setAvailableJobs(feedData);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadJobs();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadJobs]);

  const locationShareListingIds = useMemo(
    () =>
      jobs
        .filter((job) => job.status === "scheduled" || job.status === "in_transit")
        .map((job) => job.listing.id),
    [jobs],
  );

  useEffect(() => {
    if (!location.point || locationShareListingIds.length === 0) return;
    const now = Date.now();
    for (const listingId of locationShareListingIds) {
      const lastSharedAt = lastShareRef.current[listingId] ?? 0;
      if (now - lastSharedAt < 12_000) continue;
      lastShareRef.current[listingId] = now;
      void fetch(`/api/driver/listings/${listingId}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.point.lat,
          longitude: location.point.lng,
        }),
      }).catch(() => {
        lastShareRef.current[listingId] = 0;
      });
    }
  }, [location.point, locationShareListingIds]);

  async function updateJobStatus(jobId: string, status: "in_transit" | "completed" | "cancelled") {
    setBusyId(jobId);
    setError(null);
    try {
      const pin = status === "completed" ? pins[jobId]?.trim() : undefined;
      const res = await fetch(`/api/driver/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(pin ? { pin } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to update job");
        return;
      }
      setJobs((current) => current.map((job) => (job.id === jobId ? data : job)));
    } catch {
      setError("Unable to update job");
    } finally {
      setBusyId(null);
    }
  }

  const activeJobs = useMemo(
    () => jobs.filter((job) => job.status === "scheduled" || job.status === "in_transit"),
    [jobs],
  );
  const completedJobs = useMemo(() => jobs.filter((job) => job.status === "completed"), [jobs]);
  const displayedJobs = useMemo(() => {
    if (filter === "active") return activeJobs;
    if (filter === "completed") return completedJobs;
    if (filter === "available") return [];
    return jobs;
  }, [activeJobs, completedJobs, filter, jobs]);
  const currency = jobs[0]?.listing.currency ?? availableJobs[0]?.currency ?? "USD";
  const completedEarnings = completedJobs.reduce((sum, job) => sum + Number(job.listing.driverCommissionAmount ?? 0), 0);
  const activeEarnings = activeJobs.reduce((sum, job) => sum + Number(job.listing.driverCommissionAmount ?? 0), 0);
  const availableEarnings = availableJobs.reduce((sum, job) => sum + Number(job.estimatedDriverPayout ?? 0), 0);
  const filterOptions: { id: JobFilter; label: string; count: number }[] = [
    { id: "active", label: "Active", count: activeJobs.length },
    { id: "available", label: "Available", count: availableJobs.length },
    { id: "completed", label: "Completed", count: completedJobs.length },
    { id: "all", label: "All", count: jobs.length },
  ];

  return (
    <div className="space-y-5 pt-1">
      <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-md sm:p-8">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
          Assigned work
        </span>
        <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Manage every claimed pickup from one route board.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Start the run, enter the buyer handoff PIN at completion, and keep cancelled or completed work visible for review.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-4 shadow-cosmos-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Earned</p>
          <p className="mt-2 text-2xl font-bold text-emerald-950">{formatMoney(completedEarnings, currency)}</p>
          <p className="mt-1 text-xs text-emerald-800">{completedJobs.length} completed pickup{completedJobs.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-4 shadow-cosmos-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Active route</p>
          <p className="mt-2 text-2xl font-bold text-sky-950">{formatMoney(activeEarnings, currency)}</p>
          <p className="mt-1 text-xs text-sky-800">{activeJobs.length} job{activeJobs.length === 1 ? "" : "s"} in motion</p>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-4 shadow-cosmos-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Open board</p>
          <p className="mt-2 text-2xl font-bold text-amber-950">{formatMoney(availableEarnings, currency)}</p>
          <p className="mt-1 text-xs text-amber-800">{availableJobs.length} available listing{availableJobs.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-cosmos-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Completion rate</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {jobs.length > 0 ? `${Math.round((completedJobs.length / jobs.length) * 100)}%` : "0%"}
          </p>
          <p className="mt-1 text-xs text-slate-600">Across claimed pickups</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/50 bg-white p-2 shadow-cosmos-sm">
        <div className="flex flex-wrap gap-1">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === option.id
                  ? "bg-slate-950 text-white shadow-cosmos-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {option.label}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${filter === option.id ? "bg-white/15" : "bg-slate-100"}`}>
                {option.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <p className="rounded-3xl border border-rose-200/60 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-cosmos-sm">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      {locationShareListingIds.length > 0 ? (
        <p className="rounded-3xl border border-slate-200/50 bg-white px-4 py-3 text-sm text-slate-600 shadow-cosmos-sm">
          {location.point
            ? "Live location is shared with buyers on your active jobs."
            : "Allow browser location so buyers can track assigned delivery jobs."}
        </p>
      ) : null}

      {!loading && filter !== "available" && displayedJobs.length === 0 ? (
        <EmptyState
          variant="pickups"
          title={filter === "completed" ? "No completed pickups yet" : "No assigned jobs"}
          description={filter === "completed" ? "Completed deliveries will show here with your final payout." : "Claim a delivery job from the pickup board when you are ready to run."}
          actionLabel="Open pickup board"
          actionHref="/driver"
        />
      ) : null}

      {!loading && filter === "available" ? (
        availableJobs.length === 0 ? (
          <EmptyState
            variant="pickups"
            title="No available listings"
            description="Released buyer deliveries appear here when they are ready for driver pickup."
            actionLabel="Refresh board"
            actionHref="/driver"
          />
        ) : (
          <div className="space-y-4">
            {availableJobs.map((job) => {
              const payout = job.estimatedDriverPayout != null ? formatMoney(Number(job.estimatedDriverPayout), job.currency) : "—";
              const label = WASTE_TYPE_OPTIONS.find((o) => o.value === job.wasteType)?.label ?? job.wasteType;
              return (
                <div key={job.id} className="rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-sm transition hover:border-teal-200/80 hover:shadow-cosmos-md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{label}</p>
                      <p className="mt-1 text-sm text-slate-600">{job.quantity}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">{payout}</div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{job.address}</p>
                  <div className="mt-4">
                    <Link href={`/driver/listings/${job.id}`}>
                      <Button type="button">Review and claim</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {!loading && filter !== "available" && displayedJobs.length > 0 ? (
        <div className="space-y-4">
          {displayedJobs.map((job) => {
            const payout =
              job.listing.driverCommissionAmount != null
                ? formatMoney(Number(job.listing.driverCommissionAmount), job.listing.currency)
                : "—";
            const label =
              WASTE_TYPE_OPTIONS.find((o) => o.value === job.listing.wasteType)?.label ?? job.listing.wasteType;
            return (
              <div
                key={job.id}
                className="rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-sm transition hover:border-teal-200/80 hover:shadow-cosmos-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{label}</p>
                    <p className="mt-1 text-sm text-slate-600">{job.listing.quantity}</p>
                  </div>
                  <div className="rounded-2xl bg-cosmos-page-alt px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {job.status.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-emerald-50/80 p-3">
                    <p className="text-xs uppercase text-emerald-800">Your payout</p>
                    <p className="mt-1 text-lg font-bold text-emerald-900">{payout}</p>
                  </div>
                  <div className="rounded-2xl bg-cosmos-page-alt/70 p-3">
                    <p className="text-xs uppercase text-slate-500">Pickup</p>
                    <p className="mt-1 text-sm text-slate-700">{new Date(job.scheduledAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-cosmos-page-alt/70 p-3">
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
                    <Button
                      type="button"
                      onClick={() => updateJobStatus(job.id, "in_transit")}
                      disabled={busyId === job.id}
                    >
                      Start pickup
                    </Button>
                  ) : null}
                  {job.status === "in_transit" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={pins[job.id] ?? ""}
                        onChange={(event) =>
                          setPins((current) => ({
                            ...current,
                            [job.id]: event.target.value.replace(/\D/g, "").slice(0, 6),
                          }))
                        }
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Buyer PIN"
                        className="h-10 w-32 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                      <Button
                        type="button"
                        onClick={() => updateJobStatus(job.id, "completed")}
                        disabled={busyId === job.id || (pins[job.id]?.trim().length ?? 0) < 6}
                      >
                        Mark complete
                      </Button>
                    </div>
                  ) : null}
                  {job.status !== "completed" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateJobStatus(job.id, "cancelled")}
                      disabled={busyId === job.id}
                    >
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
  );
}

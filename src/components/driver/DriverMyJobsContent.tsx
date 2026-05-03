"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
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

export function DriverMyJobsContent() {
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pins, setPins] = useState<Record<string, string>>({});

  const loadJobs = useCallback(async () => {
    const res = await fetch("/api/driver/jobs", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Unable to load jobs");
      return;
    }
    setJobs(data);
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

      {error ? (
        <p className="rounded-3xl border border-rose-200/60 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-cosmos-sm">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}

      {!loading && jobs.length === 0 ? (
        <EmptyState
          variant="pickups"
          title="No assigned jobs"
          description="Claim a delivery job from the pickup board when you are ready to run."
          actionLabel="Open pickup board"
          actionHref="/driver"
        />
      ) : null}

      {!loading && jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs.map((job) => {
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

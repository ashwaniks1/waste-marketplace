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
      const res = await fetch(`/api/driver/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {error ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
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
                    <Button
                      type="button"
                      onClick={() => updateJobStatus(job.id, "in_transit")}
                      disabled={busyId === job.id}
                    >
                      Start pickup
                    </Button>
                  ) : null}
                  {job.status === "in_transit" ? (
                    <Button
                      type="button"
                      onClick={() => updateJobStatus(job.id, "completed")}
                      disabled={busyId === job.id}
                    >
                      Mark complete
                    </Button>
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

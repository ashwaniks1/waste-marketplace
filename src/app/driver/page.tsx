"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";

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
    seller: { id: string; name: string; phone: string | null };
    acceptor: { id: string; name: string; email: string } | null;
  };
};

export default function DriverPage() {
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/driver/jobs", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to load jobs");
      } else {
        setJobs(data);
      }
    } catch (err) {
      setError("Unable to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

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
      } else {
        setJobs((current) => current.map((job) => (job.id === jobId ? data : job)));
      }
    } catch (err) {
      setError("Unable to update job");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AppHeader title="Driver" role="driver" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Pickup jobs</p>
            <p className="mt-1 text-sm text-slate-600">Review assigned jobs and update pickup status as you move through the route.</p>
          </div>
          <Button onClick={loadJobs} disabled={loading}>Refresh</Button>
        </div>

        {error ? <p className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-slate-600">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-600">No driver jobs assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">Listing {job.listing.id}</p>
                    <p className="mt-1 text-sm text-slate-600">{job.listing.wasteType.replace(/_/g, " ").toLowerCase()} · {job.listing.quantity}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-700">
                    {job.status.replace(/_/g, " ")}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Pickup location</p>
                    <p className="text-sm text-slate-700">{job.listing.address}</p>
                    <p className="text-sm text-slate-600">Scheduled: {new Date(job.scheduledAt).toLocaleString()}</p>
                  </div>
                  <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Seller</p>
                    <p className="text-sm text-slate-700">{job.listing.seller.name}</p>
                    <p className="text-sm text-slate-700">{job.listing.seller.phone ?? "No phone"}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Price</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{job.listing.currency} {job.listing.askingPrice}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Buyer</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{job.listing.acceptor?.name ?? "Unknown"}</p>
                    <p className="text-sm text-slate-600">{job.listing.acceptor?.email ?? "No buyer email"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Notes</p>
                    <p className="mt-1 min-h-[1.5rem] text-sm text-slate-700">{job.notes ?? "No notes"}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
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
                      Cancel job
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

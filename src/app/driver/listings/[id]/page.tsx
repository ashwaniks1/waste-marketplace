"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type ListingDetail = {
  id: string;
  wasteType: string;
  quantity: string;
  address: string;
  status: string;
  askingPrice: number;
  currency: string;
  deliveryRequired: boolean;
  pickupJobStatus: string;
  assignedDriverId: string | null;
  driverCommissionAmount: number | null;
  acceptedOfferAmount: number | null;
  seller: { id: string; name: string; phone: string | null; avatarUrl?: string | null };
  acceptor: { id: string; name: string; email: string } | null;
};

export default function DriverListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [row, setRow] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/listings/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      setRow(null);
      return;
    }
    setRow(data);
    setError(null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when listing id changes
  }, [id]);

  async function claim() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/driver/listings/${id}/claim`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not claim pickup");
      return;
    }
    router.push("/driver");
    router.refresh();
  }

  if (error && !row) {
    return (
      <>
        <AppHeader title="Pickup" backHref="/driver" role="driver" />
        <p className="px-4 py-6 text-sm text-rose-600">{error}</p>
      </>
    );
  }

  if (!row) {
    return (
      <>
        <AppHeader title="Pickup" backHref="/driver" role="driver" />
        <p className="px-4 py-6 text-sm text-slate-600">Loading…</p>
      </>
    );
  }

  const wasteLabel = WASTE_TYPE_OPTIONS.find((o) => o.value === row.wasteType)?.label ?? row.wasteType;
  const canClaim = row.deliveryRequired && row.pickupJobStatus === "available" && !row.assignedDriverId;
  const est = row.driverCommissionAmount ?? row.acceptedOfferAmount ?? row.askingPrice;

  return (
    <>
      <AppHeader title="Pickup details" backHref="/driver" role="driver" />
      <div className="space-y-5 pb-8 pt-1">
        <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-md sm:p-8">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Driver job record
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Review the accepted pickup before you claim the route.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            The buyer has released this marketplace delivery to drivers. Claiming locks the job to your account.
          </p>
        </section>

        {error ? (
          <p className="rounded-3xl border border-rose-200/60 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-cosmos-sm">
            {error}
          </p>
        ) : null}
        <div className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">{wasteLabel}</p>
              <p className="text-sm text-slate-600">{row.quantity}</p>
            </div>
            <StatusBadge status={row.status as never} />
          </div>
          <p className="mt-3 text-sm text-slate-700">{row.address}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-cosmos-page-alt/70 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Seller</p>
              <Link href={`/profile/${row.seller.id}`} className="mt-1 font-medium text-teal-700 underline">
                {row.seller.name}
              </Link>
            </div>
            {row.acceptor ? (
              <div className="rounded-2xl bg-cosmos-page-alt/70 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Buyer</p>
                <Link href={`/profile/${row.acceptor.id}`} className="mt-1 font-medium text-teal-700 underline">
                  {row.acceptor.name}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Estimated earn</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {row.driverCommissionAmount != null
                ? formatMoney(row.driverCommissionAmount, row.currency)
                : `~${formatMoney(est * 0.1, row.currency)} (preview)`}
            </p>
            <p className="mt-1 text-xs text-emerald-800">Final payout is set when you accept the job.</p>
          </div>
          {canClaim ? (
            <Button type="button" className="mt-6 w-full" disabled={busy} onClick={claim}>
              {busy ? "Claiming…" : "Accept pickup"}
            </Button>
          ) : row.assignedDriverId ? (
            <p className="mt-4 text-sm text-slate-600">This pickup is no longer available.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}

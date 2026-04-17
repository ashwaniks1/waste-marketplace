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
      <div className="space-y-4 px-4 pb-8 pt-4">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">{wasteLabel}</p>
              <p className="text-sm text-slate-600">{row.quantity}</p>
            </div>
            <StatusBadge status={row.status as never} />
          </div>
          <p className="mt-3 text-sm text-slate-700">{row.address}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Seller</p>
              <Link href={`/profile/${row.seller.id}`} className="mt-1 font-medium text-teal-700 underline">
                {row.seller.name}
              </Link>
            </div>
            {row.acceptor ? (
              <div className="rounded-2xl bg-slate-50 p-3">
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

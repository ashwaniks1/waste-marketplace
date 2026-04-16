import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

export default async function AdminListingsPage() {
  const rows = await prisma.wasteListing.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { name: true, email: true } },
      acceptor: { select: { name: true, email: true } },
    },
  });

  return (
    <>
      <AppHeader title="All listings" backHref="/admin" role="admin" />
      <div className="space-y-3 pt-4">
        {rows.map((l) => {
          const icon = WASTE_TYPE_OPTIONS.find((o) => o.value === l.wasteType)?.icon;
          return (
            <div
              key={l.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{l.wasteType.replace(/_/g, " ")}</p>
                    <p className="text-sm text-slate-600">{l.quantity}</p>
                    <p className="text-sm font-semibold text-teal-800">
                      {formatMoney(l.askingPrice, l.currency)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Seller: {l.seller.name}</p>
              {l.acceptor ? (
                <p className="text-xs text-slate-500">Buyer: {l.acceptor.name}</p>
              ) : null}
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{l.address}</p>
              <Link href={`/admin/listings/${l.id}`} className="mt-2 inline-block text-sm text-teal-700">
                Open (read-only)
              </Link>
            </div>
          );
        })}
        {rows.length === 0 ? <p className="text-sm text-slate-600">No listings.</p> : null}
      </div>
    </>
  );
}

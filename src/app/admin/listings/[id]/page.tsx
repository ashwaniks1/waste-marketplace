import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ImageGallery } from "@/components/ImageGallery";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

export default async function AdminListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.wasteListing.findUnique({
    where: { id },
    include: {
      seller: true,
      acceptor: true,
    },
  });
  if (!row) notFound();

  const icon = WASTE_TYPE_OPTIONS.find((o) => o.value === row.wasteType)?.icon;

  return (
    <>
      <AppHeader title="Listing (admin)" backHref="/admin/listings" role="admin" />
      <div className="space-y-4 pb-8 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="text-lg font-semibold text-slate-900">{row.wasteType.replace(/_/g, " ")}</p>
              <p className="text-slate-600">{row.quantity}</p>
              <p className="text-lg font-semibold text-teal-800">{formatMoney(row.askingPrice, row.currency)}</p>
            </div>
          </div>
          <StatusBadge status={row.status} />
        </div>
        <p className="text-sm text-slate-700">{row.address}</p>
        {row.description ? <p className="text-sm text-slate-600">{row.description}</p> : null}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p>
            <span className="font-medium">Seller:</span> {row.seller.name} ({row.seller.email})
          </p>
          {row.acceptor ? (
            <p className="mt-1">
              <span className="font-medium">Buyer:</span> {row.acceptor.name} ({row.acceptor.email})
            </p>
          ) : null}
        </div>
        {row.images.length ? <ImageGallery images={row.images} /> : null}
      </div>
    </>
  );
}

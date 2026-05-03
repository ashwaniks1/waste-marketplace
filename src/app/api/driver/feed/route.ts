import { ListingStatus, OfferStatus, PickupJobStatus, UserRole, WasteType } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { computeDriverPayout, getDefaultDriverCommissionPercent } from "@/lib/commission";
import { milesBetween } from "@/lib/geo";
import { moneyToNumber } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

const querySchema = z.object({
  miles: z.coerce.number().min(1).max(200).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  wasteType: z.nativeEnum(WasteType).optional(),
  sort: z.enum(["nearest", "payout", "newest"]).optional().default("newest"),
});

const listingSelect = {
  seller: { select: { id: true, name: true, avatarUrl: true } },
  acceptor: { select: { id: true, name: true, avatarUrl: true } },
  offers: {
    where: { status: OfferStatus.accepted },
    select: { amount: true, currency: true },
    take: 1,
  },
} as const;

function basePayoutAmount(listing: {
  askingPrice: unknown;
  offers?: { amount: unknown }[];
}): number {
  const accepted = listing.offers?.[0];
  if (accepted) return moneyToNumber(accepted.amount);
  return moneyToNumber(listing.askingPrice);
}

export async function GET(request: Request) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.driver) throw new HttpError(403, "Only drivers can view pickup feed");

    const { searchParams } = new URL(request.url);
    const q = querySchema.parse({
      miles: searchParams.get("miles") ?? undefined,
      lat: searchParams.get("lat") ?? undefined,
      lng: searchParams.get("lng") ?? undefined,
      wasteType: searchParams.get("wasteType") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
    });

    const driverPoint =
      q.lat != null && q.lng != null && Number.isFinite(q.lat) && Number.isFinite(q.lng)
        ? { lat: q.lat, lng: q.lng }
        : null;

    const listings = await prisma.wasteListing.findMany({
      where: {
        deliveryRequired: true,
        buyerDeliveryConfirmed: true,
        pickupJobStatus: PickupJobStatus.available,
        assignedDriverId: null,
        status: ListingStatus.accepted,
        ...(q.wasteType ? { wasteType: q.wasteType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: listingSelect,
    });

    const defaultPct = await getDefaultDriverCommissionPercent();

    let rows = listings.map((listing) => {
      const base = basePayoutAmount(listing);
      const { payout, percentSnapshot, kind } = computeDriverPayout({
        baseAmount: base,
        listing,
        defaultPercent: defaultPct,
      });
      const lat = listing.latitude;
      const lng = listing.longitude;
      const listingPoint =
        lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
          ? { lat, lng }
          : null;
      const distanceMiles = milesBetween(driverPoint, listingPoint);
      const serialized = serializeListing(listing);
      const accepted = listing.offers?.[0];
      return {
        ...serialized,
        acceptedOfferAmount: accepted ? moneyToNumber(accepted.amount) : null,
        acceptedOfferCurrency: accepted ? accepted.currency : null,
        distanceMiles,
        estimatedDriverPayout: payout,
        commissionPercentUsed: percentSnapshot,
        commissionKind: kind,
      };
    });

    if (q.miles != null && driverPoint) {
      rows = rows.filter((r) => r.distanceMiles != null && r.distanceMiles <= q.miles!);
    }

    if (q.sort === "nearest" && driverPoint) {
      rows.sort((a, b) => (a.distanceMiles ?? 1e9) - (b.distanceMiles ?? 1e9));
    } else if (q.sort === "payout") {
      rows.sort((a, b) => (b.estimatedDriverPayout ?? 0) - (a.estimatedDriverPayout ?? 0));
    } else {
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return jsonOk(rows);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid query", 400);
    return handleRouteError(e);
  }
}

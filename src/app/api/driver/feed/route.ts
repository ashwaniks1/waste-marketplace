import { DriverOperatingScope, ListingStatus, OfferStatus, PickupJobStatus, Prisma, UserRole, VisibilityScope, WasteType } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { computeDriverPayout, getDefaultDriverCommissionPercent } from "@/lib/commission";
import { milesBetween } from "@/lib/geo";
import { geoLocationSelect } from "@/lib/locations";
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
  pickupLocation: { select: geoLocationSelect },
  offers: {
    where: { status: OfferStatus.accepted },
    select: { amount: true, currency: true },
    take: 1,
  },
} as const;

function joinSql(parts: Prisma.Sql[], separator: Prisma.Sql) {
  return parts.reduce((acc, part, index) => (index === 0 ? part : Prisma.sql`${acc}${separator}${part}`), Prisma.empty);
}

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

    const serviceProfile = await prisma.driverServiceProfile.findUnique({ where: { userId: me.id } });
    const operatingScope = serviceProfile?.operatingScope ?? DriverOperatingScope.local;
    const countryCode = serviceProfile?.countryCode?.toUpperCase() || me.countryCode?.toUpperCase() || null;

    const filters: Prisma.Sql[] = [
      Prisma.sql`l.delivery_required = true`,
      Prisma.sql`l.buyer_delivery_confirmed = true`,
      Prisma.sql`l.pickup_job_status = ${PickupJobStatus.available}::"PickupJobStatus"`,
      Prisma.sql`l.assigned_driver_id is null`,
      Prisma.sql`l.status = ${ListingStatus.accepted}::"ListingStatus"`,
      Prisma.sql`l.pickup_point is not null`,
      Prisma.sql`l.visibility_scope <> ${VisibilityScope.international}::"VisibilityScope"`,
    ];
    if (q.wasteType) filters.push(Prisma.sql`l.waste_type = ${q.wasteType}::"WasteType"`);
    if (countryCode) {
      filters.push(Prisma.sql`l.origin_country_code = ${countryCode}`);
    }
    if (operatingScope === DriverOperatingScope.local) {
      filters.push(Prisma.sql`l.visibility_scope = ${VisibilityScope.local}::"VisibilityScope"`);
    } else {
      filters.push(Prisma.sql`l.visibility_scope in (${VisibilityScope.local}::"VisibilityScope", ${VisibilityScope.national}::"VisibilityScope")`);
    }
    if (q.miles != null && driverPoint) {
      filters.push(Prisma.sql`
        ST_DWithin(
          l.pickup_point,
          ST_SetSRID(ST_MakePoint(${driverPoint.lng}, ${driverPoint.lat}), 4326)::geography,
          ${q.miles * 1609.344}
        )
      `);
    }

    const whereSql = joinSql(filters, Prisma.sql` and `);
    const ids = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      select l.id
      from public.waste_listings l
      where ${whereSql}
      order by l.created_at desc
      limit 200
    `);

    const listings = ids.length
      ? await prisma.wasteListing.findMany({
          where: { id: { in: ids.map((row) => row.id) } },
          include: listingSelect,
        })
      : [];
    const idOrder = new Map(ids.map((row, index) => [row.id, index]));
    listings.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

    const defaultPct = await getDefaultDriverCommissionPercent();

    const rows = listings.map((listing) => {
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

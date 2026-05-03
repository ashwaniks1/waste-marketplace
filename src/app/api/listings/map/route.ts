import { ListingStatus, Prisma, UserRole, VisibilityScope, WasteType } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { geoLocationSelect, visibilityScopeSchema } from "@/lib/locations";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

const bboxSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const parts = value.split(",").map((part) => Number(part.trim()));
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bbox must be minLng,minLat,maxLng,maxLat" });
      return z.NEVER;
    }
    const [minLng, minLat, maxLng, maxLat] = parts;
    if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180 || minLat > maxLat || minLng > maxLng) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bbox coordinates are out of range" });
      return z.NEVER;
    }
    return { minLng, minLat, maxLng, maxLat };
  });

const querySchema = z.object({
  bbox: bboxSchema,
  centerLat: z.coerce.number().min(-90).max(90).optional(),
  centerLng: z.coerce.number().min(-180).max(180).optional(),
  radiusMeters: z.coerce.number().min(100).max(500_000).optional(),
  zoom: z.coerce.number().min(0).max(22).optional().default(10),
  scope: visibilityScopeSchema.optional().default(VisibilityScope.local),
  wasteType: z.nativeEnum(WasteType).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(250),
});

const listingInclude = {
  seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
  acceptor: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
  assignedDriver: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
  pickupLocation: { select: geoLocationSelect },
} as const;

function joinSql(parts: Prisma.Sql[], separator: Prisma.Sql) {
  return parts.reduce((acc, part, index) => (index === 0 ? part : Prisma.sql`${acc}${separator}${part}`), Prisma.empty);
}

function geohashPrefixLength(zoom: number) {
  if (zoom <= 3) return 2;
  if (zoom <= 5) return 3;
  if (zoom <= 7) return 4;
  return 5;
}

function buildVisibilityFilter(scope: VisibilityScope, countryCode: string | null) {
  if (scope === VisibilityScope.international) {
    return Prisma.sql`l.visibility_scope in ('local'::"VisibilityScope", 'national'::"VisibilityScope", 'international'::"VisibilityScope")`;
  }
  if (!countryCode) return Prisma.sql`l.visibility_scope = ${scope}::"VisibilityScope"`;
  if (scope === VisibilityScope.national) {
    return Prisma.sql`l.visibility_scope in ('local'::"VisibilityScope", 'national'::"VisibilityScope") and l.origin_country_code = ${countryCode}`;
  }
  return Prisma.sql`l.visibility_scope = 'local'::"VisibilityScope" and l.origin_country_code = ${countryCode}`;
}

export async function GET(request: Request) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.buyer && me.role !== UserRole.admin) {
      throw new HttpError(403, "Only buyers can search the marketplace map");
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      bbox: searchParams.get("bbox") || undefined,
      centerLat: searchParams.get("centerLat") || undefined,
      centerLng: searchParams.get("centerLng") || undefined,
      radiusMeters: searchParams.get("radiusMeters") || undefined,
      zoom: searchParams.get("zoom") || undefined,
      scope: searchParams.get("scope") || undefined,
      wasteType: searchParams.get("wasteType") || undefined,
      limit: searchParams.get("limit") || undefined,
    });
    if (!parsed.success) return jsonError("Invalid map filters", 400);

    const q = parsed.data;
    const hasRadius = q.centerLat != null && q.centerLng != null && q.radiusMeters != null;
    if (!q.bbox && !hasRadius) {
      return jsonError("Provide a viewport bbox or radius search", 400);
    }

    const filters: Prisma.Sql[] = [
      Prisma.sql`l.status in (${ListingStatus.open}::"ListingStatus", ${ListingStatus.reopened}::"ListingStatus")`,
      Prisma.sql`l.pickup_point is not null`,
      buildVisibilityFilter(q.scope, me.countryCode?.toUpperCase() || null),
    ];
    if (q.wasteType) filters.push(Prisma.sql`l.waste_type = ${q.wasteType}::"WasteType"`);
    if (q.bbox) {
      filters.push(Prisma.sql`
        l.pickup_point::geometry && ST_MakeEnvelope(${q.bbox.minLng}, ${q.bbox.minLat}, ${q.bbox.maxLng}, ${q.bbox.maxLat}, 4326)
      `);
    }
    if (hasRadius) {
      filters.push(Prisma.sql`
        ST_DWithin(
          l.pickup_point,
          ST_SetSRID(ST_MakePoint(${q.centerLng}, ${q.centerLat}), 4326)::geography,
          ${q.radiusMeters}
        )
      `);
    }

    const whereSql = joinSql(filters, Prisma.sql` and `);

    if (q.zoom <= 7) {
      const prefixLength = geohashPrefixLength(q.zoom);
      const clusters = await prisma.$queryRaw<
        {
          geohash_prefix: string;
          count: bigint;
          latitude: number;
          longitude: number;
        }[]
      >(Prisma.sql`
        select
          substring(l.pickup_geohash from 1 for ${prefixLength}) as geohash_prefix,
          count(*) as count,
          avg(l.latitude) as latitude,
          avg(l.longitude) as longitude
        from public.waste_listings l
        where ${whereSql}
        group by geohash_prefix
        order by count(*) desc
        limit ${q.limit}
      `);

      return jsonOk({
        mode: "clusters",
        items: clusters.map((cluster) => ({
          geohashPrefix: cluster.geohash_prefix,
          count: Number(cluster.count),
          latitude: cluster.latitude,
          longitude: cluster.longitude,
        })),
      });
    }

    const ids = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      select l.id
      from public.waste_listings l
      where ${whereSql}
      order by l.created_at desc
      limit ${q.limit}
    `);

    const idOrder = new Map(ids.map((row, index) => [row.id, index]));
    const rows = ids.length
      ? await prisma.wasteListing.findMany({
          where: { id: { in: ids.map((row) => row.id) } },
          include: listingInclude,
        })
      : [];

    rows.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

    return jsonOk({ mode: "listings", items: rows.map(serializeListing) });
  } catch (e) {
    return handleRouteError(e, { route: "GET /api/listings/map" });
  }
}

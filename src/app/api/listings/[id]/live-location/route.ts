import { UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

type LiveLocationRow = {
  listing_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  recorded_at: Date;
  updated_at: Date;
};

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;
    const listing = await prisma.wasteListing.findUnique({
      where: { id },
      select: { id: true, userId: true, acceptedById: true, assignedDriverId: true },
    });
    if (!listing) return jsonError("Not found", 404);

    const canView =
      me.role === UserRole.admin ||
      listing.userId === me.id ||
      listing.acceptedById === me.id ||
      listing.assignedDriverId === me.id;
    if (!canView || !listing.assignedDriverId) return jsonError("Not found", 404);

    const rows = await prisma.$queryRaw<LiveLocationRow[]>`
      select listing_id, driver_id, lat, lng, heading, speed, recorded_at, updated_at
      from public.listing_live_locations
      where listing_id = ${id}::uuid
      limit 1
    `;
    const row = rows[0];
    if (!row) return jsonOk({ location: null });

    return jsonOk({
      location: {
        listingId: row.listing_id,
        driverId: row.driver_id,
        lat: row.lat,
        lng: row.lng,
        heading: row.heading,
        speed: row.speed,
        recordedAt: row.recorded_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

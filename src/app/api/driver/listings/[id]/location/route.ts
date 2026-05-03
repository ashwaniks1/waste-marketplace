import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).nullable().optional(),
  accuracyM: z.number().min(0).nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.driver) throw new HttpError(403, "Only drivers can update live location");

    const { id } = await ctx.params;
    const body = locationSchema.parse(await request.json());
    const listing = await prisma.wasteListing.findUnique({
      where: { id },
      select: { assignedDriverId: true },
    });
    if (!listing || listing.assignedDriverId !== me.id) return jsonError("Not found", 404);

    await prisma.$executeRaw(
      Prisma.sql`
        insert into public.listing_live_locations (listing_id, driver_id, lat, lng, heading, speed, accuracy_m, recorded_at, updated_at, expires_at)
        values (${id}::uuid, ${me.id}::uuid, ${body.latitude}, ${body.longitude}, ${body.heading ?? null}, ${body.speed ?? null}, ${body.accuracyM ?? null}, now(), now(), now() + interval '15 minutes')
        on conflict (listing_id)
        do update set
          driver_id = excluded.driver_id,
          lat = excluded.lat,
          lng = excluded.lng,
          heading = excluded.heading,
          speed = excluded.speed,
          accuracy_m = excluded.accuracy_m,
          recorded_at = now(),
          updated_at = now(),
          expires_at = now() + interval '15 minutes'
      `,
    );

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid location", 400);
    return handleRouteError(e);
  }
}

import { ListingStatus, UserRole, WasteType } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

const listingInclude = {
  seller: { select: { id: true, name: true, email: true, phone: true } },
  acceptor: { select: { id: true, name: true, email: true, phone: true } },
} as const;

const patchSchema = z.object({
  wasteType: z.nativeEnum(WasteType).optional(),
  quantity: z.string().min(1).optional(),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  address: z.string().min(1).optional(),
  askingPrice: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function canReadListing(
  me: { id: string; role: UserRole },
  row: { userId: string; status: ListingStatus; acceptedById: string | null },
) {
  if (me.role === UserRole.admin) return true;
  if (me.role === UserRole.customer && row.userId === me.id) return true;
  if (me.role === UserRole.buyer) {
    if (row.status === ListingStatus.open) return true;
    if (row.acceptedById === me.id) return true;
  }
  return false;
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;
    const row = await prisma.wasteListing.findUnique({
      where: { id },
      include: listingInclude,
    });
    if (!row) return jsonError("Not found", 404);
    if (!(await canReadListing(me, row))) return jsonError("Forbidden", 403);
    return jsonOk(serializeListing(row));
  } catch (e) {
    return handleRouteError(e);
  }
}

/** Edit listing — owner only, open status only. */
export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await request.json());

    const existing = await prisma.wasteListing.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);
    if (existing.userId !== me.id) throw new HttpError(403, "Forbidden");
    if (existing.status !== ListingStatus.open) {
      throw new HttpError(409, "Only open listings can be edited");
    }

    const row = await prisma.wasteListing.update({
      where: { id },
      data: {
        ...(body.wasteType !== undefined ? { wasteType: body.wasteType } : {}),
        ...(body.quantity !== undefined ? { quantity: body.quantity.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.images !== undefined ? { images: body.images } : {}),
        ...(body.address !== undefined ? { address: body.address.trim() } : {}),
        ...(body.askingPrice !== undefined ? { askingPrice: body.askingPrice } : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
      },
      include: listingInclude,
    });
    return jsonOk(serializeListing(row));
  } catch (e) {
    return handleRouteError(e);
  }
}

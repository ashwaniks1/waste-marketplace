import { ListingStatus, UserRole, WasteType } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

const listingInclude = {
  seller: { select: { id: true, name: true, email: true, phone: true } },
  acceptor: { select: { id: true, name: true, email: true, phone: true } },
} as const;

const createSchema = z.object({
  wasteType: z.nativeEnum(WasteType),
  quantity: z.string().min(1),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional().default([]),
  address: z.string().min(1),
  askingPrice: z.coerce.number().positive(),
  currency: z.string().length(3).optional().default("USD"),
});

/** Listings list — scope depends on role (buyer: open feed + optional mine; customer: own; admin: all). */
export async function GET(request: Request) {
  try {
    const me = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    if (me.role === UserRole.admin) {
      const rows = await prisma.wasteListing.findMany({
        orderBy: { createdAt: "desc" },
        include: listingInclude,
      });
      return jsonOk(rows.map(serializeListing));
    }

    if (me.role === UserRole.buyer) {
      if (scope === "mine") {
        const rows = await prisma.wasteListing.findMany({
          where: { acceptedById: me.id },
          orderBy: { createdAt: "desc" },
          include: listingInclude,
        });
        return jsonOk(rows.map(serializeListing));
      }
      const rows = await prisma.wasteListing.findMany({
        where: { status: ListingStatus.open },
        orderBy: { createdAt: "desc" },
        include: listingInclude,
      });
      return jsonOk(rows.map(serializeListing));
    }

    // customer
    const rows = await prisma.wasteListing.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      include: listingInclude,
    });
    return jsonOk(rows.map(serializeListing));
  } catch (e) {
    return handleRouteError(e);
  }
}

/** Create listing — customers only. */
export async function POST(request: Request) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.customer) throw new HttpError(403, "Only customers can create listings");
    const body = createSchema.parse(await request.json());

    const row = await prisma.wasteListing.create({
      data: {
        userId: me.id,
        wasteType: body.wasteType,
        quantity: body.quantity.trim(),
        description: body.description?.trim() || null,
        images: body.images,
        address: body.address.trim(),
        status: ListingStatus.open,
        askingPrice: body.askingPrice,
        currency: body.currency ?? "USD",
      },
      include: listingInclude,
    });
    return jsonOk(serializeListing(row));
  } catch (e) {
    return handleRouteError(e);
  }
}

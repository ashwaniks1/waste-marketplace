import {
  CommissionKind,
  ListingStatus,
  OfferStatus,
  PickupJobStatus,
  UserRole,
  WasteType,
} from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { listingIsOpenForMarketplaceActions } from "@/lib/listing-marketplace";
import { canViewListing } from "@/lib/listing-visibility";
import { relistExpiredAcceptedListing } from "@/lib/pickup-window";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

const listingInclude = {
  seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
  acceptor: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
  assignedDriver: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
  offers: {
    where: { status: OfferStatus.accepted },
    select: { amount: true, currency: true },
    take: 1,
  },
} as const;

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  wasteType: z.nativeEnum(WasteType).optional(),
  quantity: z.string().min(1).optional(),
  description: z.string().optional(),
  images: z.array(z.string().url()).min(1).optional(),
  address: z.string().min(1).optional(),
  askingPrice: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
  deliveryAvailable: z.boolean().optional(),
  deliveryFee: z.preprocess((value) => {
    if (typeof value === "string") {
      const normalized = value.replace(/,/g, "").trim();
      return normalized === "" ? undefined : Number(normalized);
    }
    return value;
  }, z.number().positive()).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  deliveryRequired: z.boolean().optional(),
  pickupZip: z.string().trim().max(20).optional().nullable(),
  commissionKind: z.nativeEnum(CommissionKind).optional(),
  driverCommissionPercent: z.number().min(0).max(100).optional().nullable(),
  driverPayoutFixed: z.number().min(0).optional().nullable(),
})
  .superRefine((data, ctx) => {
    if (data.latitude !== undefined && data.longitude === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["longitude"],
        message: "Include longitude when updating coordinates",
      });
    }
    if (data.longitude !== undefined && data.latitude === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Include latitude when updating coordinates",
      });
    }
    if (data.latitude !== undefined && data.longitude !== undefined) {
      const a = data.latitude;
      const b = data.longitude;
      if ((a == null) !== (b == null)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["latitude"],
          message: "Set both latitude and longitude, or set both to null",
        });
      }
    }
  });

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;
    await relistExpiredAcceptedListing(id);
    const row = await prisma.wasteListing.findUnique({
      where: { id },
      include: listingInclude,
    });
    if (!row) return jsonError("Not found", 404);
    if (!canViewListing(me, row)) return jsonError("Forbidden", 403);
    const serialized = serializeListing(row);
    const acceptedOffer = row.offers?.[0];
    let handoffPin: string | null = null;
    if (
      me.role !== UserRole.driver &&
      (row.acceptedById === me.id || row.userId === me.id)
    ) {
      const sec = await prisma.deliveryHandoffSecret.findUnique({ where: { listingId: id } });
      if (sec?.consumedAt == null) handoffPin = sec?.pin ?? null;
    }
    return jsonOk({
      ...serialized,
      acceptedOfferAmount: acceptedOffer ? Number(acceptedOffer.amount) : null,
      acceptedOfferCurrency: acceptedOffer ? acceptedOffer.currency : null,
      handoffPin,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

/** Edit listing — owner only; not when completed or cancelled. */
export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await request.json());

    const existing = await prisma.wasteListing.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);
    if (existing.userId !== me.id) throw new HttpError(403, "Forbidden");
    if (existing.status === ListingStatus.completed || existing.status === ListingStatus.cancelled) {
      throw new HttpError(409, "Completed or cancelled listings cannot be edited");
    }

    const mergedDeliveryRequired =
      body.deliveryRequired !== undefined
        ? body.deliveryRequired
        : body.deliveryAvailable !== undefined
          ? body.deliveryAvailable
          : existing.deliveryRequired;

    let pickupJobStatus = existing.pickupJobStatus;
    if (
      listingIsOpenForMarketplaceActions(existing.status) &&
      (pickupJobStatus === PickupJobStatus.none || pickupJobStatus === PickupJobStatus.available)
    ) {
      pickupJobStatus = PickupJobStatus.none;
    }

    const nextKind =
      body.commissionKind ??
      (body.driverPayoutFixed != null ? CommissionKind.fixed : undefined);

    const row = await prisma.wasteListing.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.wasteType !== undefined ? { wasteType: body.wasteType } : {}),
        ...(body.quantity !== undefined ? { quantity: body.quantity.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.images !== undefined ? { images: body.images } : {}),
        ...(body.address !== undefined ? { address: body.address.trim() } : {}),
        ...(body.askingPrice !== undefined ? { askingPrice: body.askingPrice } : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
        ...(body.deliveryAvailable !== undefined ? { deliveryAvailable: body.deliveryAvailable } : {}),
        ...(body.deliveryFee !== undefined ? { deliveryFee: body.deliveryFee } : {}),
        ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
        ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
        ...(body.deliveryRequired !== undefined || body.deliveryAvailable !== undefined
          ? { deliveryRequired: mergedDeliveryRequired }
          : {}),
        ...(body.pickupZip !== undefined ? { pickupZip: body.pickupZip?.trim() || null } : {}),
        ...(nextKind !== undefined ? { commissionKind: nextKind } : {}),
        ...(body.driverCommissionPercent !== undefined
          ? { driverCommissionPercent: body.driverCommissionPercent }
          : {}),
        ...(body.driverPayoutFixed !== undefined
          ? { driverCommissionAmount: body.driverPayoutFixed, commissionKind: CommissionKind.fixed }
          : {}),
        pickupJobStatus,
      },
      include: listingInclude,
    });
    return jsonOk(serializeListing(row));
  } catch (e) {
    return handleRouteError(e);
  }
}

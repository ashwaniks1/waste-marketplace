import { ListingStatus, PickupJobStatus, TransportStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { notifyUsers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.nativeEnum(TransportStatus).optional(),
  notes: z.string().optional(),
  pin: z.string().trim().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function requireDriverJob(id: string, me: { id: string; role: UserRole }) {
  const job = await prisma.transportJob.findUnique({
    where: { id },
    include: {
      listing: {
        select: {
          id: true,
          status: true,
          userId: true,
          acceptedById: true,
          deliveryRequired: true,
        },
      },
    },
  });
  if (!job || job.driverId !== me.id) return null;
  return job;
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.driver) throw new HttpError(403, "Only drivers can access this route");

    const { id } = await ctx.params;
    const job = await prisma.transportJob.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            wasteType: true,
            quantity: true,
            address: true,
            askingPrice: true,
            currency: true,
            status: true,
            seller: { select: { id: true, name: true, phone: true } },
            acceptor: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!job || job.driverId !== me.id) return jsonError("Not found", 404);

    return jsonOk({
      ...job,
      listing: {
        ...job.listing,
        askingPrice: job.listing.askingPrice.toString(),
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.driver) throw new HttpError(403, "Only drivers can update jobs");

    const { id } = await ctx.params;
    const parsed = patchSchema.parse(await request.json());
    const job = await requireDriverJob(id, me);
    if (!job) return jsonError("Not found", 404);

    if (parsed.status === TransportStatus.completed) {
      if (job.status !== TransportStatus.in_transit) {
        return jsonError("Job must be in transit before completion", 409);
      }
      const pin = parsed.pin?.trim();
      if (job.listing.deliveryRequired && !pin) {
        return jsonError("Buyer handoff PIN is required to complete this delivery", 400);
      }

      const result = await prisma.$transaction(async (tx) => {
        const secret = await tx.deliveryHandoffSecret.findUnique({
          where: { listingId: job.listing.id },
        });
        if (job.listing.deliveryRequired && (!secret || secret.consumedAt != null || secret.pin !== pin)) {
          return { error: "bad_pin" as const };
        }

        const updatedJob = await tx.transportJob.update({
          where: { id },
          data: {
            status: TransportStatus.completed,
            completedAt: new Date(),
            ...(parsed.notes !== undefined ? { notes: parsed.notes.trim() || null } : {}),
          },
          include: {
            listing: {
              select: {
                id: true,
                wasteType: true,
                quantity: true,
                address: true,
                askingPrice: true,
                currency: true,
                status: true,
                seller: { select: { id: true, name: true, phone: true } },
                acceptor: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });

        await tx.deliveryHandoffSecret.updateMany({
          where: { listingId: job.listing.id, consumedAt: null },
          data: { consumedAt: new Date() },
        });

        const listingRow = await tx.wasteListing.update({
          where: { id: job.listing.id },
          data: {
            status: ListingStatus.completed,
            pickupJobStatus: PickupJobStatus.completed,
            deliveryPrivacyLocked: true,
          },
          select: { id: true, userId: true, acceptedById: true },
        });

        return { updatedJob, listingRow };
      });

      if ("error" in result) {
        return jsonError("Invalid or expired buyer handoff PIN", 403);
      }

      const notifs: { userId: string; type: string; title: string; body?: string; listingId?: string }[] = [
        {
          userId: result.listingRow.userId,
          type: "pickup_completed",
          title: "Pickup completed",
          body: "The driver completed delivery with the buyer handoff PIN.",
          listingId: result.listingRow.id,
        },
      ];
      if (result.listingRow.acceptedById) {
        notifs.push({
          userId: result.listingRow.acceptedById,
          type: "pickup_completed",
          title: "Pickup completed",
          body: "Your order pickup was completed by the driver.",
          listingId: result.listingRow.id,
        });
      }
      await notifyUsers(notifs);

      return jsonOk({
        ...result.updatedJob,
        listing: {
          ...result.updatedJob.listing,
          askingPrice: result.updatedJob.listing.askingPrice?.toString(),
        },
      });
    }

    const updateData: { status?: TransportStatus; notes?: string | null } = {};
    if (parsed.status !== undefined) updateData.status = parsed.status;
    if (parsed.notes !== undefined) updateData.notes = parsed.notes.trim() || null;

    const updatedJob = await prisma.transportJob.update({
      where: { id },
      data: updateData,
      include: {
        listing: {
          select: {
            id: true,
            wasteType: true,
            quantity: true,
            address: true,
            askingPrice: true,
            currency: true,
            status: true,
            seller: { select: { id: true, name: true, phone: true } },
            acceptor: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return jsonOk({
      ...updatedJob,
      listing: {
        ...updatedJob.listing,
        askingPrice: updatedJob.listing.askingPrice?.toString(),
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

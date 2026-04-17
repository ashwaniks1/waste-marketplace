import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const me = await requireAppUser();
    if (me.role !== "driver") {
      return jsonError("Forbidden", 403);
    }

    const jobs = await prisma.transportJob.findMany({
      where: { driverId: me.id },
      orderBy: { scheduledAt: "asc" },
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
            deliveryRequired: true,
            pickupJobStatus: true,
            driverCommissionAmount: true,
            latitude: true,
            longitude: true,
            seller: { select: { id: true, name: true, phone: true, avatarUrl: true } },
            acceptor: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    const normalized = jobs.map((job) => ({
      ...job,
      listing: {
        ...job.listing,
        askingPrice: job.listing.askingPrice.toString(),
      },
    }));

    return jsonOk(normalized);
  } catch (e) {
    return handleRouteError(e);
  }
}

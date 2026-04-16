import { ListingStatus } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

const requestSchema = {
  parse: async (body: any) => ({
    reason: typeof body.reason === "string" ? body.reason.trim() : undefined,
  }),
};

export async function POST(request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;
    const body = await request.json();
    const parsed = await requestSchema.parse(body);

    const existing = await prisma.wasteListing.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);
    if (existing.userId !== me.id) throw new HttpError(403, "Forbidden");
    if (existing.status !== ListingStatus.accepted) {
      throw new HttpError(409, "Only accepted listings can be marked no show");
    }

    const row = await prisma.wasteListing.update({
      where: { id },
      data: {
        status: ListingStatus.no_show,
        noShowReason: parsed.reason || null,
      },
      include: {
        seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        acceptor: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      },
    });
    return jsonOk(serializeListing(row));
  } catch (e) {
    return handleRouteError(e);
  }
}

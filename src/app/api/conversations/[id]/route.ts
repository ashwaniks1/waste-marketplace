import { UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: {
        listing: {
          select: { id: true, wasteType: true, status: true, userId: true },
        },
        buyer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!conv) return jsonError("Not found", 404);
    const ok =
      me.role === UserRole.admin ||
      conv.buyerId === me.id ||
      conv.listing.userId === me.id;
    if (!ok) return jsonError("Forbidden", 403);
    return jsonOk(conv);
  } catch (e) {
    return handleRouteError(e);
  }
}

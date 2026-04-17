import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;

    const row = await prisma.notification.updateMany({
      where: { id, userId: me.id },
      data: { readAt: new Date() },
    });
    if (row.count === 0) return jsonError("Not found", 404);
    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;

    const deleted = await prisma.notification.deleteMany({ where: { id, userId: me.id } });
    if (deleted.count === 0) return jsonError("Not found", 404);
    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}

import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const me = await requireAppUser();
    await prisma.notification.updateMany({
      where: { userId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}

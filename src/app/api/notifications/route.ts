import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/** Recent notifications for the signed-in user (newest first). */
export async function GET(request: Request) {
  try {
    const me = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "25") || 25));

    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: me.id, readAt: null },
      }),
    ]);

    return jsonOk({
      items: items.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt?.toISOString() ?? null,
      })),
      unreadCount: unread,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

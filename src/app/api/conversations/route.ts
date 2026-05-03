import { UserRole } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";
import { decryptMessageBody } from "@/lib/messageCrypto";
import { prisma } from "@/lib/prisma";

/** List conversations the current user participates in (buyer, or listing seller). */
export async function GET() {
  try {
    const me = await requireAppUser();
    if (me.role !== UserRole.buyer && me.role !== UserRole.customer) {
      return jsonOk([]);
    }

    const rows = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: me.id }, { listing: { userId: me.id } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            wasteType: true,
            status: true,
            userId: true,
            images: true,
            seller: { select: { id: true, name: true } },
          },
        },
        buyer: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { id: true, body: true, createdAt: true },
        },
      },
    });

    return jsonOk(
      rows.map((row) => ({
        ...row,
        messages: row.messages.map((message) => ({
          ...message,
          body: decryptMessageBody(message.body),
        })),
      })),
    );
  } catch (e) {
    return handleRouteError(e);
  }
}

import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { decryptMessageBody, encryptMessageBody } from "@/lib/messageCrypto";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  body: z.string().min(1).max(4000),
});

type Ctx = { params: Promise<{ id: string }> };

async function requireConversationAccess(conversationId: string, me: { id: string; role: UserRole }) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { listing: true },
  });
  if (!conv) return null;
  const isSeller = conv.listing.userId === me.id;
  const isBuyer = conv.buyerId === me.id;
  if (!isSeller && !isBuyer) return null;
  return conv;
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id: conversationId } = await ctx.params;
    const conv = await requireConversationAccess(conversationId, me);
    if (!conv) return jsonError("Not found", 404);

    const rows = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true } } },
    });
    return jsonOk(rows.map((row) => ({ ...row, body: decryptMessageBody(row.body) })));
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id: conversationId } = await ctx.params;
    const conv = await requireConversationAccess(conversationId, me);
    if (!conv) return jsonError("Not found", 404);

    const parsed = postSchema.parse(await request.json());
    const plainBody = parsed.body.trim();
    const row = await prisma.message.create({
      data: {
        conversationId,
        senderId: me.id,
        body: encryptMessageBody(plainBody),
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    // Peer notification + conversation.updated_at handled by DB trigger `trg_messages_notify_peer`.

    return jsonOk({ ...row, body: plainBody });
  } catch (e) {
    return handleRouteError(e);
  }
}

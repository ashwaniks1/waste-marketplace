import { prisma } from "@/lib/prisma";

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  listingId?: string | null;
  conversationId?: string | null;
};

export async function notifyUsers(entries: NotifyInput[]) {
  if (entries.length === 0) return;
  await prisma.notification.createMany({
    data: entries.map((e) => ({
      userId: e.userId,
      type: e.type,
      title: e.title,
      body: e.body ?? null,
      listingId: e.listingId ?? null,
      conversationId: e.conversationId ?? null,
    })),
  });
}

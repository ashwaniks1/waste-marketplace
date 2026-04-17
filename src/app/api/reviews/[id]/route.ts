import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  score: z.number().min(1).max(5).optional(),
  body: z.string().max(500).optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await request.json());

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return jsonError("Not found", 404);
    if (review.fromUserId !== me.id) throw new HttpError(403, "You can only edit your own reviews");

    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(body.score !== undefined ? { score: body.score } : {}),
        ...(body.body !== undefined ? { body: body.body } : {}),
      },
    });
    return jsonOk(updated);
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const me = await requireAppUser();
    const { id } = await ctx.params;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return jsonError("Not found", 404);
    if (review.fromUserId !== me.id) throw new HttpError(403, "You can only delete your own reviews");

    await prisma.review.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}

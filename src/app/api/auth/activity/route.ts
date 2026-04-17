import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

export async function POST() {
  try {
    const me = await requireAppUser();
    return jsonOk({
      ok: true,
      lastActivityAt: me.lastActivityAt,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}


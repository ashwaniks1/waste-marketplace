import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

export async function POST() {
  try {
    await requireAppUser();
    return jsonOk({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}


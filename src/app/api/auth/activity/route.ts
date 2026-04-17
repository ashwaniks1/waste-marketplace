import { getIdleTimeoutMinutes, getSessionWarningSeconds, requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const requestMode = request.headers.get("x-session-mode");
    const touchActivity = requestMode !== "peek";

    const me = await requireAppUser({ touchActivity });
    const timeoutMinutes = await getIdleTimeoutMinutes();
    const warningSeconds = getSessionWarningSeconds({
      now: new Date(),
      lastActivityAt: me.lastActivityAt ?? null,
      timeoutMinutes,
      warningWindowSeconds: 5 * 60,
    });
    return jsonOk({
      ok: true,
      lastActivityAt: me.lastActivityAt,
      timeoutMinutes,
      warningSeconds,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}


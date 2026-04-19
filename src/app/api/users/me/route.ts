import { type AppRole, getAppUserForAuthUser, getRoleFromSupabaseUser, getSupabaseUserFromRoute } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

/** Current user: Supabase session + Prisma profile (for business fields). */
export async function GET(request: Request) {
  try {
    const authUser = await getSupabaseUserFromRoute(request);
    if (!authUser) return jsonError("Unauthorized", 401);
    const profile = await getAppUserForAuthUser(authUser);
    let role = getRoleFromSupabaseUser(authUser);
    if (!role && profile) role = profile.role as AppRole;
    return jsonOk({
      role,
      auth: {
        id: authUser.id,
        email: authUser.email,
      },
      profile,
    });
  } catch (e) {
    return handleRouteError(e, { route: "GET /api/users/me" });
  }
}

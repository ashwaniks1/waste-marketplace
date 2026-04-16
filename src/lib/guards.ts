import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAppUser, getSupabaseUser } from "@/lib/auth";

/** Server-only guard for layouts/pages — complements route middleware. */
export async function requireRole(allowed: UserRole[]) {
  const auth = await getSupabaseUser();
  if (!auth) redirect("/login");
  const user = await getAppUser();
  if (!user) redirect("/login");
  if (!allowed.includes(user.role)) {
    if (user.role === UserRole.admin) redirect("/admin");
    if (user.role === UserRole.buyer) redirect("/buyer");
    if (user.role === UserRole.driver) redirect("/driver");
    redirect("/customer");
  }
  return user;
}

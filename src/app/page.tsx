import { redirect } from "next/navigation";
import { getAppUser, getRoleFromSupabaseUser, getSupabaseUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export default async function HomePage() {
  const user = await getSupabaseUser();
  if (!user) redirect("/login");

  const metaRole = getRoleFromSupabaseUser(user);
  if (metaRole) {
    if (metaRole === "buyer") redirect("/buyer");
    if (metaRole === "admin") redirect("/admin");
    if (metaRole === "driver") redirect("/driver");
    redirect("/customer");
  }

  // Fallback if app_metadata.role is missing (legacy users): use Prisma profile.
  const profile = await getAppUser();
  if (!profile) redirect("/login");
  if (profile.role === UserRole.buyer) redirect("/buyer");
  if (profile.role === UserRole.admin) redirect("/admin");
  if (profile.role === UserRole.driver) redirect("/driver");
  redirect("/customer");
}

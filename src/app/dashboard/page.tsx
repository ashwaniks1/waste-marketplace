import { redirect } from "next/navigation";
import { getAppUser, getRoleFromSupabaseUser, getSupabaseUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getSupabaseUser();
  if (!user) redirect("/login");

  const role = getRoleFromSupabaseUser(user);
  if (role) {
    if (role === "buyer") redirect("/buyer");
    if (role === "driver") redirect("/driver");
    if (role === "admin") redirect("/admin");
    redirect("/customer");
  }

  const profile = await getAppUser();
  if (!profile) redirect("/login");
  if (profile.role === "buyer") redirect("/buyer");
  if (profile.role === "driver") redirect("/driver");
  if (profile.role === "admin") redirect("/admin");
  redirect("/customer");
}

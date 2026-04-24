import { redirect } from "next/navigation";
import { LandingFooter } from "@/components/LandingFooter";
import { LandingExperience } from "@/components/marketing/LandingExperience";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { getAppUser, getRoleFromSupabaseUser, getSupabaseUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export default async function HomePage() {
  const user = await getSupabaseUser();
  if (user) {
    const metaRole = getRoleFromSupabaseUser(user);
    if (metaRole) {
      if (metaRole === "buyer") redirect("/buyer");
      if (metaRole === "admin") redirect("/admin");
      if (metaRole === "driver") redirect("/driver");
      redirect("/customer");
    }

    const profile = await getAppUser();
    if (profile) {
      if (profile.role === UserRole.buyer) redirect("/buyer");
      if (profile.role === UserRole.admin) redirect("/admin");
      if (profile.role === UserRole.driver) redirect("/driver");
      redirect("/customer");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24 text-slate-100 md:pb-0">
      <MarketingNavbar />
      <main className="relative overflow-hidden">
        <LandingExperience />
      </main>
      <LandingFooter />
    </div>
  );
}

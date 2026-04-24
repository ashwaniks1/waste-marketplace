import { redirect } from "next/navigation";
import { getSupabaseUser } from "@/lib/auth";
import { ensureAppUserProfile } from "@/lib/ensureAppUserProfile";

/** After Google (or other OAuth), provision Prisma profile then send users to role routing. */
export default async function AuthCompletePage() {
  const authUser = await getSupabaseUser();
  if (!authUser) redirect("/login?error=session");

  await ensureAppUserProfile(authUser);

  redirect("/dashboard");
}

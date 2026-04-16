import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User as AppUser } from "@prisma/client";
import { HttpError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase/server";

export type AppRole = "customer" | "buyer" | "admin" | "driver";

/** Safe role for routing — comes from Supabase app_metadata (not user-editable). */
export function getRoleFromSupabaseUser(user: SupabaseUser | null): AppRole | null {
  const r = user?.app_metadata?.role;
  if (r === "customer" || r === "buyer" || r === "admin" || r === "driver") return r;
  return null;
}

export async function getSupabaseUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** Full app profile from Prisma (source of truth for listings joins). */
export async function getAppUser(): Promise<AppUser | null> {
  const authUser = await getSupabaseUser();
  if (!authUser) return null;
  return prisma.user.findUnique({ where: { id: authUser.id } });
}

export async function requireAppUser(): Promise<AppUser> {
  const u = await getAppUser();
  if (!u) throw new HttpError(401, "Unauthorized");
  return u;
}

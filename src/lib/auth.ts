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

async function getIdleTimeoutMinutes() {
  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 }, select: { sessionIdleMinutes: true } });
  const value = settings?.sessionIdleMinutes;
  if (typeof value === "number" && Number.isFinite(value) && value >= 5) return value;
  return 60;
}

function minutesBetween(now: Date, then: Date) {
  return (now.getTime() - then.getTime()) / (1000 * 60);
}

export async function requireAppUser(): Promise<AppUser> {
  const supabase = await createServerSupabase();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) throw new HttpError(401, "Unauthorized");

  const u = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!u) throw new HttpError(401, "Unauthorized");

  const timeoutMinutes = await getIdleTimeoutMinutes();
  const now = new Date();
  const last = u.lastActivityAt ?? u.updatedAt ?? u.createdAt;
  if (last && minutesBetween(now, last) > timeoutMinutes) {
    // Clear cookies/session on the server side too (SSR + route handlers).
    await supabase.auth.signOut();
    throw new HttpError(401, "Session expired");
  }

  // Throttle DB writes: update at most once per minute.
  if (!last || minutesBetween(now, last) >= 1) {
    await prisma.user.update({
      where: { id: u.id },
      data: { lastActivityAt: now },
      select: { id: true },
    });
  }

  return u;
}

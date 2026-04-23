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

export async function getIdleTimeoutMinutes() {
  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 }, select: { sessionIdleMinutes: true } });
  const value = settings?.sessionIdleMinutes;
  if (typeof value === "number" && Number.isFinite(value) && value >= 5) return value;
  return 60;
}

function minutesBetween(now: Date, then: Date) {
  return (now.getTime() - then.getTime()) / (1000 * 60);
}

export function getSessionWarningSeconds({
  now,
  lastActivityAt,
  timeoutMinutes,
  warningWindowSeconds = 120,
}: {
  now: Date;
  lastActivityAt: Date | null;
  timeoutMinutes: number;
  warningWindowSeconds?: number;
}): number | null {
  if (!lastActivityAt) return null;
  const timeoutSeconds = timeoutMinutes * 60;
  const elapsedSeconds = Math.floor((now.getTime() - lastActivityAt.getTime()) / 1000);
  const remainingSeconds = timeoutSeconds - elapsedSeconds;
  if (remainingSeconds <= 0) return 0;
  if (remainingSeconds <= warningWindowSeconds) return remainingSeconds;
  return null;
}

type RequireAppUserOptions = {
  /**
   * When false, validates the session + idle timeout but does not bump `lastActivityAt`.
   * Used by `/api/auth/activity?mode=peek` so passive checks can warn without extending the session.
   */
  touchActivity?: boolean;
};

export async function requireAppUser(options: RequireAppUserOptions = {}): Promise<AppUser> {
  const touchActivity = options.touchActivity !== false;

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

  // Throttle DB writes: update at most once per minute (only when explicitly touching activity).
  if (
    touchActivity &&
    (!last || minutesBetween(now, last) >= 1)
  ) {
    await prisma.user.update({
      where: { id: u.id },
      data: { lastActivityAt: now },
      select: { id: true },
    });
  }

  return prisma.user.findUniqueOrThrow({ where: { id: u.id } });
}

export async function getSessionStateForUser(user: { lastActivityAt: Date | null }) {
  const timeoutMinutes = await getIdleTimeoutMinutes();
  const warningSeconds = getSessionWarningSeconds({
    now: new Date(),
    lastActivityAt: user.lastActivityAt,
    timeoutMinutes,
    warningWindowSeconds: 5 * 60,
  });
  return { timeoutMinutes, warningSeconds };
}

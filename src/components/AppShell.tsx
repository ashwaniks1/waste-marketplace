"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { LocationProvider } from "@/components/LocationProvider";
import { NotificationBell } from "@/components/NotificationBell";
import { SessionActivity } from "@/components/SessionActivity";

type Role = "customer" | "buyer" | "admin" | "driver";

type ProfileData = {
  name: string;
  avatarUrl?: string | null;
};

const customerNav = [
  { href: "/customer", label: "Home" },
  { href: "/customer/listings", label: "Listings" },
  { href: "/conversations", label: "Messages" },
  { href: "/profile", label: "Profile" },
];

const buyerNav = [
  { href: "/buyer", label: "Browse" },
  { href: "/buyer/pickups", label: "Pickups" },
  { href: "/conversations", label: "Messages" },
  { href: "/profile", label: "Profile" },
];

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/users", label: "Users" },
  { href: "/profile", label: "Profile" },
];

const driverNav = [
  { href: "/driver", label: "Board" },
  { href: "/driver/jobs", label: "Jobs" },
  { href: "/profile", label: "Profile" },
];

const roleHomeHrefs = ["/buyer", "/driver", "/customer", "/admin"] as const;

function navItemIsActive(pathname: string, href: string) {
  if (href === "/conversations") {
    return pathname === "/conversations" || pathname.startsWith("/conversations/");
  }
  if ((roleHomeHrefs as readonly string[]).includes(href)) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  role,
  title,
  backHref,
  showHeader = true,
}: {
  children: React.ReactNode;
  role: Role;
  title: string;
  backHref?: string;
  showHeader?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [driverActiveJobCount, setDriverActiveJobCount] = useState(0);
  const nav =
    role === "buyer"
      ? buyerNav
      : role === "customer"
      ? customerNav
      : role === "admin"
      ? adminNav
      : role === "driver"
      ? driverNav
      : [];
  const desktopNav = nav.filter((item) => item.href !== "/profile");
  const profileLink = nav.find((item) => item.href === "/profile");
  const homeHref =
    role === "buyer"
      ? "/buyer"
      : role === "admin"
      ? "/admin"
      : role === "driver"
      ? "/driver"
      : "/customer";

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || cancelled) return;
        setProfile({
          name: data.profile?.name ?? "Account",
          avatarUrl: data.profile?.avatarUrl ?? null,
        });
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (role !== "driver") {
      setDriverActiveJobCount(0);
      return;
    }
    let cancelled = false;
    async function loadJobs() {
      try {
        const res = await fetch("/api/driver/jobs", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || cancelled || !Array.isArray(data)) return;
        const n = data.filter(
          (j: { status: string }) => j.status === "scheduled" || j.status === "in_transit",
        ).length;
        setDriverActiveJobCount(n);
      } catch {
        if (!cancelled) setDriverActiveJobCount(0);
      }
    }
    void loadJobs();
    const t = window.setInterval(() => void loadJobs(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [role]);

  const initials = useMemo(() => {
    const source = profile?.name?.trim();
    if (!source) return role.slice(0, 1).toUpperCase();
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [profile?.name, role]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <LocationProvider>
      <SessionActivity />
      <div className="flex min-h-dvh flex-col border-t-2 border-emerald-500/25 bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100">
      <header className="sticky top-0 z-30 border-b border-emerald-100/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 md:px-8">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/95 text-sm font-bold text-white shadow-sm shadow-emerald-500/25">
              W
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                Waste Marketplace
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">
                {role === "admin" ? "Admin" : role === "buyer" ? "Buyer" : role === "driver" ? "Driver" : "Seller"}
              </p>
            </div>
          </Link>

          {desktopNav.length > 0 ? (
            <nav className="ml-2 hidden min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full border border-slate-200 bg-slate-50/90 p-1 sm:flex md:justify-start">
              {desktopNav.map((item) => {
                const active = navItemIsActive(pathname, item.href);
                const showJobsBadge = item.href === "/driver/jobs" && driverActiveJobCount > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative rounded-full px-3 py-2 text-sm font-medium transition md:px-4 ${
                      active
                        ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                    {showJobsBadge ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                        {driverActiveJobCount > 9 ? "9+" : driverActiveJobCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell role={role} />
            {profileLink ? (
              <Link
                href={profileLink.href}
                aria-current={pathname === profileLink.href ? "page" : undefined}
                className={`hidden items-center gap-3 rounded-full border px-2.5 py-2 transition sm:flex ${
                  pathname === profileLink.href
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/60"
                }`}
              >
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`${profile.name} avatar`}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white shadow-sm">
                    {initials}
                  </span>
                )}
                <span className="hidden min-w-0 text-left lg:block">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Profile
                  </span>
                  <span className="block max-w-[10rem] truncate text-sm font-semibold">
                    {profile?.name ?? "My account"}
                  </span>
                </span>
              </Link>
            ) : null}

            <Button
              variant="ghost"
              className="!min-h-10 rounded-full px-3 text-sm"
              onClick={logout}
              aria-label="Log out"
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      {showHeader ? <AppHeader title={title} backHref={backHref} role={role} /> : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 md:px-8 md:py-6">{children}</main>

      {/* Mobile bottom nav */}
      {nav.length > 0 ? (
        <nav className="sticky bottom-0 z-20 border-t border-slate-200/90 bg-white/95 px-2 py-2 backdrop-blur sm:hidden">
          <div className="mx-auto flex w-full max-w-md items-center gap-1 rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm">
          {nav.map((item) => {
            const active = navItemIsActive(pathname, item.href);
            const showJobsBadge = item.href === "/driver/jobs" && driverActiveJobCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center rounded-full py-2 text-xs font-medium transition ${
                  active ? "bg-emerald-50 text-teal-700" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {item.label}
                {showJobsBadge ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                    {driverActiveJobCount > 9 ? "9+" : driverActiveJobCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
          </div>
        </nav>
      ) : null}
      </div>
    </LocationProvider>
  );
}

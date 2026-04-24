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
  { href: "/profile", label: "Profile" },
];

const buyerNav = [
  { href: "/buyer", label: "Browse" },
  { href: "/buyer/pickups", label: "Pickups" },
  { href: "/profile", label: "Profile" },
];

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/users", label: "Users" },
  { href: "/profile", label: "Profile" },
];

const driverNav = [
  { href: "/driver", label: "Home" },
  { href: "/profile", label: "Profile" },
];

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
      <div className="flex min-h-dvh flex-col bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100">
      <header className="sticky top-0 z-30 border-b border-emerald-100/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 md:px-8">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-200">
              ♻️
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.34em] text-teal-700">
                WasteMarket
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">
                {role === "admin" ? "Admin" : role === "buyer" ? "Buyer" : role === "driver" ? "Driver" : "Seller"}
              </p>
            </div>
          </Link>

          {desktopNav.length > 0 ? (
            <nav className="ml-2 hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50/90 p-1 sm:flex">
              {desktopNav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {item.label}
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
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href || pathname.startsWith(item.href + "/") ? "page" : undefined}
              className={`flex flex-1 flex-col items-center rounded-full py-2 text-xs font-medium transition ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-emerald-50 text-teal-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
          </div>
        </nav>
      ) : null}
      </div>
    </LocationProvider>
  );
}

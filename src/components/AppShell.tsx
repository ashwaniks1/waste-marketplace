"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BrandMark } from "@/components/brand/BrandMark";
import { UserMenu } from "@/components/UserMenu";
import { LocationProvider } from "@/components/LocationProvider";
import { NotificationBell } from "@/components/NotificationBell";
import { SessionActivity } from "@/components/SessionActivity";
import { BuyerDriverInboxFloat } from "@/components/BuyerDriverInboxFloat";

type Role = "customer" | "buyer" | "admin" | "driver";

type ProfileData = {
  name: string;
  avatarUrl?: string | null;
};

const customerNav = [
  { href: "/customer", label: "Home" },
  { href: "/customer/listings", label: "Listings" },
  { href: "/customer/messages", label: "Messages" },
];

const buyerNav = [
  { href: "/buyer", label: "Browse" },
  { href: "/buyer/pickups", label: "Pickups" },
  { href: "/conversations", label: "Messages" },
];

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/users", label: "Users" },
];

const driverNav = [
  { href: "/driver", label: "Board" },
  { href: "/driver/jobs", label: "Jobs" },
];

const roleHomeHrefs = ["/buyer", "/driver", "/customer", "/admin"] as const;

function navItemIsActive(pathname: string, href: string) {
  if (href === "/customer/messages") {
    return pathname === "/customer/messages" || pathname.startsWith("/conversations");
  }
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
  const [inboxOpen, setInboxOpen] = useState(false);
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
  const desktopNav = nav;
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
    function onProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<ProfileData>).detail;
      if (detail?.name) {
        setProfile({
          name: detail.name,
          avatarUrl: detail.avatarUrl ?? null,
        });
      }
    }
    window.addEventListener("wm:profile-updated", onProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("wm:profile-updated", onProfileUpdated);
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <LocationProvider>
      <SessionActivity />
      <div className="flex min-h-dvh flex-col border-t border-slate-200/50 bg-cosmos-page">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white shadow-cosmos-nav backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[min(100rem,100%)] items-center gap-3 px-4 py-2.5 sm:px-6 md:px-8">
          <Link
            href={homeHref}
            className="group flex min-w-0 items-center gap-3 rounded-full py-1 pl-0.5 pr-2 transition hover:bg-slate-50"
          >
            <BrandMark />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Waste Marketplace
              </p>
              <p className="truncate text-sm font-bold leading-tight text-slate-900">
                {role === "admin" ? "Admin" : role === "buyer" ? "Buyer" : role === "driver" ? "Driver" : "Seller"}
              </p>
            </div>
          </Link>

          {desktopNav.length > 0 ? (
            <nav className="ml-1 hidden min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full bg-slate-100/80 p-1 sm:flex md:ml-2 md:justify-start">
              {desktopNav.map((item) => {
                const active = navItemIsActive(pathname, item.href);
                const showJobsBadge = item.href === "/driver/jobs" && driverActiveJobCount > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative rounded-full px-3 py-2 text-sm font-semibold transition md:px-4 ${
                      active
                        ? "bg-white text-slate-950 shadow-cosmos-sm ring-1 ring-slate-200/80"
                        : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
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
            <UserMenu profile={profile} onLogout={logout} />
          </div>
        </div>
      </header>

      {showHeader ? <AppHeader title={title} backHref={backHref} role={role} /> : null}

      <main
        className={`mx-auto w-full min-h-0 max-w-[min(100rem,100%)] flex-1 px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-4 lg:px-8 ${
          role === "customer"
            ? "flex flex-col lg:h-[calc(100dvh-5.5rem)] lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-hidden lg:py-2"
            : "lg:py-2"
        }`}
      >
        {role === "customer" ? <div className="flex min-h-0 flex-1 flex-col lg:h-full">{children}</div> : children}
      </main>

      {role === "buyer" || role === "driver" ? (
        <>
          <button
            type="button"
            onClick={() => setInboxOpen(true)}
            className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/25 transition hover:scale-105 hover:bg-slate-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            aria-label="Open messages"
          >
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <BuyerDriverInboxFloat open={inboxOpen} onClose={() => setInboxOpen(false)} />
        </>
      ) : null}

      {/* Mobile bottom nav */}
      {nav.length > 0 ? (
        <nav className="sticky bottom-0 z-20 border-t border-slate-200/60 bg-white/95 px-2 py-2 shadow-cosmos-nav backdrop-blur sm:hidden">
          <div className="mx-auto flex w-full max-w-md items-center gap-0.5 rounded-full border border-slate-200/80 bg-slate-100/80 p-1 shadow-cosmos-sm">
          {nav.map((item) => {
            const active = navItemIsActive(pathname, item.href);
            const showJobsBadge = item.href === "/driver/jobs" && driverActiveJobCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center rounded-full py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-white text-slate-950 shadow-cosmos-sm ring-1 ring-slate-200/80"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
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

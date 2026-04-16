"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

type Role = "customer" | "buyer" | "admin";

const customerNav = [
  { href: "/customer", label: "Home" },
  { href: "/customer/listings", label: "Listings" },
  { href: "/customer/profile", label: "Profile" },
];

const buyerNav = [
  { href: "/buyer", label: "Browse" },
  { href: "/buyer/pickups", label: "Pickups" },
];

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/users", label: "Users" },
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
  const nav =
    role === "buyer" ? buyerNav : role === "customer" ? customerNav : role === "admin" ? adminNav : [];

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100">
      {showHeader ? <AppHeader title={title} backHref={backHref} role={role} /> : null}

      {/* Tablet / desktop: top secondary nav */}
      {nav.length > 0 ? (
        <nav className="hidden border-b border-slate-200/80 bg-white/70 px-4 py-2 sm:block md:px-8 lg:py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-2 md:gap-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-teal-100 text-teal-900"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 md:px-8 md:py-6">{children}</main>

      {/* Mobile bottom nav */}
      {nav.length > 0 ? (
        <nav className="sticky bottom-0 z-20 flex border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur sm:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center rounded-lg py-2 text-xs font-medium ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "text-teal-700"
                  : "text-slate-500"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

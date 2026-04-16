"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export function AppHeader({
  title,
  backHref,
  role,
}: {
  title: string;
  backHref?: string;
  role: "customer" | "buyer" | "admin";
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const home =
    role === "buyer" ? "/buyer" : role === "admin" ? "/admin" : "/customer";

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6 md:px-8">
        {backHref ? (
          <Link href={backHref} className="text-sm font-medium text-teal-700">
            Back
          </Link>
        ) : (
          <Link href={home} className="text-sm font-medium text-teal-700">
            Home
          </Link>
        )}
        <h1 className="flex-1 truncate text-center text-base font-semibold text-slate-900">{title}</h1>
        <Button variant="ghost" className="!min-h-9 px-2 text-xs" onClick={logout}>
          Log out
        </Button>
      </div>
    </header>
  );
}

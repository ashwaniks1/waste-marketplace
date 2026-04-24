"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

const tabs = [
  { id: "profile" as const, label: "Profile" },
  { id: "notifications" as const, label: "Notifications" },
];

function SettingsNavInner({
  profilePanel,
  notificationsPanel,
}: {
  profilePanel: React.ReactNode;
  notificationsPanel: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as "profile" | "notifications" | null) || "profile";

  const setTab = useCallback(
    (id: (typeof tabs)[number]["id"]) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", id);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-col gap-1 border-b border-slate-200/80 pb-4 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Settings</h1>
        <p className="text-sm text-slate-600">Manage your profile, preferences, and how we reach you.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {tab === "profile" ? profilePanel : notificationsPanel}
    </div>
  );
}

export function SettingsShell({
  profilePanel,
  notificationsPanel,
}: {
  profilePanel: React.ReactNode;
  notificationsPanel: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl animate-pulse space-y-4 rounded-3xl bg-slate-100/80 p-8">
          <div className="h-8 w-48 rounded-lg bg-slate-200" />
          <div className="h-32 rounded-2xl bg-slate-200/80" />
        </div>
      }
    >
      <SettingsNavInner profilePanel={profilePanel} notificationsPanel={notificationsPanel} />
    </Suspense>
  );
}

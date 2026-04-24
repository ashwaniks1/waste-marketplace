"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type AppRole = "customer" | "buyer" | "driver" | "admin";

export function ConversationsLayoutClient({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AppRole>("buyer");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/profile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || cancelled) return;
      const r = data.profile?.role;
      if (r === "admin" || r === "driver" || r === "customer" || r === "buyer") {
        setRole(r);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell role={role} title="" showHeader={false}>
      {children}
    </AppShell>
  );
}

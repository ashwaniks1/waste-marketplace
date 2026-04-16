"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";

const defaultRole: "customer" | "buyer" | "driver" | "admin" = "customer";

export default function ProfilePage() {
  const [role, setRole] = useState(defaultRole);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok && data.profile?.role) {
        setRole(data.profile.role);
      }
    })();
  }, []);

  return (
    <AppShell role={role} title="" showHeader={false}>
      <div className="py-2">
        <ProfileForm />
      </div>
    </AppShell>
  );
}

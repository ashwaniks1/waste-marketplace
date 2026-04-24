"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";
import { NotificationSettingsPanel } from "@/components/settings/NotificationSettingsPanel";
import { SettingsShell } from "@/components/settings/SettingsShell";

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
      <div className="py-1 sm:py-2">
        <SettingsShell
          profilePanel={<ProfileForm />}
          notificationsPanel={<NotificationSettingsPanel />}
        />
      </div>
    </AppShell>
  );
}

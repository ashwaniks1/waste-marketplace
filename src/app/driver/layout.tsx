import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/guards";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  await requireRole([UserRole.driver]);
  return (
    <AppShell role="driver" title="" showHeader={false}>
      {children}
    </AppShell>
  );
}

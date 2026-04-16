import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole([UserRole.admin]);
  return (
    <AppShell role="admin" title="" showHeader={false}>
      {children}
    </AppShell>
  );
}

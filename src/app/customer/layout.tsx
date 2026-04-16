import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/guards";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requireRole([UserRole.customer]);
  return (
    <AppShell role="customer" title="" showHeader={false}>
      {children}
    </AppShell>
  );
}

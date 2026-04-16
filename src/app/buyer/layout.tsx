import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/guards";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  await requireRole([UserRole.buyer]);
  return (
    <AppShell role="buyer" title="" showHeader={false}>
      {children}
    </AppShell>
  );
}

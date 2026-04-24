import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { SellerProfileWorkspace } from "@/components/seller/SellerProfileWorkspace";
import { requireRole } from "@/lib/guards";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requireRole([UserRole.customer]);
  return (
    <AppShell role="customer" title="" showHeader={false}>
      <SellerProfileWorkspace>{children}</SellerProfileWorkspace>
    </AppShell>
  );
}

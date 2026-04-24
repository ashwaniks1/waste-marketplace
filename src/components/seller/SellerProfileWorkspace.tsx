"use client";

import { SellerChatFloat } from "@/components/seller/SellerChatFloat";
import { SellerInboxPanel } from "@/components/seller/SellerInboxPanel";
import { SellerRelatedPanel } from "@/components/seller/SellerRelatedPanel";
import { SellerWorkspaceProvider } from "@/components/seller/SellerWorkspaceContext";

function SellerThreeColumnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-0 w-full max-w-[100rem] flex-1 grid-cols-1 gap-4 pt-1 lg:grid-cols-12 lg:gap-5 xl:gap-6">
      <div className="min-w-0 space-y-4 lg:col-span-5">{children}</div>
      <div className="min-w-0 lg:col-span-3">
        <div className="lg:sticky lg:top-24">
          <SellerRelatedPanel />
        </div>
      </div>
      <div className="min-w-0 lg:col-span-4">
        <div className="lg:sticky lg:top-24">
          <SellerInboxPanel />
        </div>
      </div>
    </div>
  );
}

export function SellerProfileWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <SellerWorkspaceProvider>
      <SellerThreeColumnLayout>{children}</SellerThreeColumnLayout>
      <SellerChatFloat />
    </SellerWorkspaceProvider>
  );
}

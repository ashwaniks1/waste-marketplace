"use client";

import { SellerInboxShell } from "@/components/seller/SellerInboxShell";
import { SellerListingsRail } from "@/components/seller/SellerListingsRail";
import { SellerWorkspaceProvider } from "@/components/seller/SellerWorkspaceContext";

/**
 * Seller console: Cosmos 12-col — related list (3) | record (6) | open margin (3) for the floating inbox.
 * Inbox is not in the grid; use `SellerInboxShell` (FAB + panel).
 */
function SellerConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 content-start gap-4 lg:h-full lg:min-h-0 lg:grid-cols-12 lg:content-stretch"
      data-seller-workspace
    >
      <section
        className="order-2 flex min-h-0 w-full min-w-0 flex-col sm:min-h-0 lg:order-1 lg:col-span-3"
        aria-label="Related listings"
      >
        <SellerListingsRail />
      </section>

      <section
        className="order-1 min-h-0 w-full min-w-0 space-y-4 overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable] lg:order-2 lg:col-span-6 lg:min-h-0"
        aria-label="Listing detail"
      >
        {children}
      </section>

      <div className="order-3 hidden min-h-0 lg:col-span-3 lg:block" aria-hidden="true" />
    </div>
  );
}

export function SellerProfileWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <SellerWorkspaceProvider>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <SellerConsoleLayout>{children}</SellerConsoleLayout>
        <SellerInboxShell />
      </div>
    </SellerWorkspaceProvider>
  );
}

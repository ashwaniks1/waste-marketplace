"use client";

import { usePathname } from "next/navigation";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspaceContext";
import { SellerChatPanel } from "@/components/seller/SellerChatPanel";

/**
 * Floating inbox (Omnichannel-style): FAB + expand/minimize, not a third column.
 * Hidden on the new-listing flow so the form is distraction-free.
 */
export function SellerInboxShell() {
  const pathname = usePathname();
  const { inboxSurface, openInbox, minimizeInbox, expandInbox, closeChat, activeThreadId, chatOpen } = useSellerWorkspace();

  if (pathname.startsWith("/customer/listings/new")) {
    return null;
  }

  const isHidden = inboxSurface === "hidden";
  const isMin = inboxSurface === "minimized";
  const isOpen = inboxSurface === "open";

  return (
    <>
      {isHidden ? (
        <button
          type="button"
          onClick={openInbox}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/25 transition hover:scale-105 hover:bg-slate-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          aria-label="Open inbox"
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {chatOpen ? (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-teal-400 ring-2 ring-slate-900" />
          ) : null}
        </button>
      ) : null}

      {isMin ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-4px_24px_rgba(15,23,42,0.12)] backdrop-blur sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-md sm:rounded-2xl sm:border"
          role="region"
          aria-label="Inbox minimized"
        >
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
            Inbox{activeThreadId ? " · active thread" : ""}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={expandInbox}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50"
              title="Expand"
              aria-label="Expand inbox"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3m0-18H5a2 2 0 0 0-2 2v3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={closeChat}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              title="Close"
              aria-label="Close inbox"
            >
              <span className="text-lg leading-none" aria-hidden>
                ×
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(100vw-2.5rem,26rem)]"
          style={{ maxHeight: "min(100dvh - 1.25rem, 42rem)" }}
        >
          <div className="flex h-[min(100dvh-1.25rem,42rem)] max-h-[100dvh] flex-col overflow-hidden rounded-t-3xl border border-slate-200/60 bg-white shadow-cosmos-md sm:rounded-3xl">
            <SellerChatPanel onMinimize={minimizeInbox} onClose={closeChat} />
          </div>
        </div>
      ) : null}
    </>
  );
}

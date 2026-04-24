"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SellerWorkspaceContextValue = {
  activeThreadId: string | null;
  chatOpen: boolean;
  openChat: (conversationId: string) => void;
  closeChat: () => void;
  /** Clear selected thread (removes ?c=) but keep the inbox window open. */
  leaveThread: () => void;
  /** Inbox surface: hidden = FAB only; open = full panel; minimized = slim bar. */
  inboxSurface: "hidden" | "open" | "minimized";
  openInbox: () => void;
  minimizeInbox: () => void;
  expandInbox: () => void;
};

const Ctx = createContext<SellerWorkspaceContextValue | null>(null);

const fallbackValue: SellerWorkspaceContextValue = {
  activeThreadId: null,
  chatOpen: false,
  openChat: () => {},
  closeChat: () => {},
  leaveThread: () => {},
  inboxSurface: "hidden",
  openInbox: () => {},
  minimizeInbox: () => {},
  expandInbox: () => {},
};

function InnerFromUrl({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeThreadId = searchParams.get("c");
  const chatOpen = Boolean(activeThreadId);

  const [inboxSurface, setInboxSurface] = useState<"hidden" | "open" | "minimized">("hidden");

  // Deep link with ?c= should show the window (keeps "minimized" if user had minimized with a thread open).
  useEffect(() => {
    if (searchParams.get("c")) {
      setInboxSurface((prev) => (prev === "minimized" ? "minimized" : "open"));
    }
  }, [searchParams]);

  const leaveThread = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("c");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const closeChat = useCallback(() => {
    setInboxSurface("hidden");
    const next = new URLSearchParams(searchParams.toString());
    next.delete("c");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openChat = useCallback(
    (conversationId: string) => {
      setInboxSurface("open");
      const next = new URLSearchParams(searchParams.toString());
      next.set("c", conversationId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openInbox = useCallback(() => {
    setInboxSurface("open");
  }, []);

  const minimizeInbox = useCallback(() => {
    setInboxSurface("minimized");
  }, []);

  const expandInbox = useCallback(() => {
    setInboxSurface("open");
  }, []);

  const value = useMemo(
    () => ({
      activeThreadId,
      chatOpen,
      openChat,
      closeChat,
      leaveThread,
      inboxSurface,
      openInbox,
      minimizeInbox,
      expandInbox,
    }),
    [activeThreadId, chatOpen, closeChat, leaveThread, openChat, inboxSurface, openInbox, minimizeInbox, expandInbox],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function SellerWorkspaceProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Ctx.Provider value={fallbackValue}>{children}</Ctx.Provider>}>
      <InnerFromUrl>{children}</InnerFromUrl>
    </Suspense>
  );
}

export function useSellerWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSellerWorkspace must be used under SellerWorkspaceProvider");
  return v;
}

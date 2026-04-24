"use client";

import { Suspense, createContext, useCallback, useContext, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SellerWorkspaceContextValue = {
  activeThreadId: string | null;
  chatOpen: boolean;
  openChat: (conversationId: string) => void;
  closeChat: () => void;
};

const Ctx = createContext<SellerWorkspaceContextValue | null>(null);

const fallbackValue: SellerWorkspaceContextValue = {
  activeThreadId: null,
  chatOpen: false,
  openChat: () => {},
  closeChat: () => {},
};

function InnerFromUrl({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeThreadId = searchParams.get("c");
  const chatOpen = Boolean(activeThreadId);

  const closeChat = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("c");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openChat = useCallback(
    (conversationId: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("c", conversationId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const value = useMemo(
    () => ({
      activeThreadId,
      chatOpen,
      openChat,
      closeChat,
    }),
    [activeThreadId, chatOpen, closeChat, openChat],
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

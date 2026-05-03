"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/Button";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspaceContext";
import { useSupabaseRealtimeRefresh } from "@/hooks/useSupabaseRealtimeRefresh";

type ConvMeta = {
  id: string;
  listingId: string;
  buyerId: string;
  listing: { id: string; wasteType: string; status: string; userId: string };
  buyer: { id: string; name: string; email: string };
};

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
};

export function SellerChatFloat() {
  const { activeThreadId, chatOpen, closeChat } = useSellerWorkspace();
  const [meta, setMeta] = useState<ConvMeta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/users/me");
      const m = await me.json();
      if (me.ok && m.profile) setMeId(m.profile.id);
    })();
  }, []);

  useEffect(() => {
    if (!activeThreadId) {
      setMeta(null);
      setMessages([]);
      return;
    }
    (async () => {
      const r = await fetch(`/api/conversations/${activeThreadId}`);
      const d = await r.json();
      if (r.ok) setMeta(d);
    })();
  }, [activeThreadId]);

  const loadMessages = useCallback(async () => {
    if (!activeThreadId) return;
    const r = await fetch(`/api/conversations/${activeThreadId}/messages`, { cache: "no-store" });
    if (r.ok) setMessages(await r.json());
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    void loadMessages();
  }, [activeThreadId, loadMessages]);

  useSupabaseRealtimeRefresh({
    channelName: activeThreadId ? `seller-float-messages:${activeThreadId}` : "seller-float-messages:pending-thread",
    enabled: Boolean(activeThreadId),
    changes: [
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeThreadId}` },
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeThreadId}` },
    ],
    onChange: () => void loadMessages(),
    onSubscribed: () => void loadMessages(),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && chatOpen) closeChat();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen, closeChat]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !activeThreadId) return;
    const r = await fetch(`/api/conversations/${activeThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (r.ok) {
      setBody("");
      const load = await fetch(`/api/conversations/${activeThreadId}/messages`);
      if (load.ok) setMessages(await load.json());
    }
  }

  if (!mounted || !chatOpen || !activeThreadId) return null;

  const listingHref = meta
    ? meId && meta.listing.userId === meId
      ? `/customer/listings/${meta.listing.id}`
      : `/customer/listings/${meta.listing.id}`
    : "/customer/listings";
  const title = meta ? `Chat · ${meta.buyer.name}` : "Chat";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-end sm:items-end sm:justify-end sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Conversation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition"
        onClick={closeChat}
        aria-label="Close chat"
      />
      <div
        className="relative z-10 flex max-h-[min(100dvh,640px)] w-full max-w-md flex-1 flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/20 sm:max-h-[min(80dvh,580px)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Messages</p>
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            {meta?.listing ? (
              <Link href={listingHref} className="text-xs font-medium text-teal-700 hover:underline" onClick={closeChat}>
                View listing
              </Link>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={closeChat}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-600 transition hover:bg-slate-50"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {!meta ? (
            <p className="text-sm text-slate-500">Getting the conversation ready.</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                  m.sender.id === meId ? "ml-auto bg-teal-600 text-white" : "bg-slate-100 text-slate-900"
                }`}
              >
                <p className="text-xs opacity-80">{m.sender.name}</p>
                <p>{m.body}</p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="shrink-0 border-t border-slate-100 bg-white p-3">
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 !text-slate-900 placeholder:text-slate-400 outline-none ring-teal-500/0 transition focus:ring-2 focus:ring-teal-200"
              style={{ color: "#0f172a" }}
              placeholder="Type a message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button type="submit" className="shrink-0" disabled={!body.trim()}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

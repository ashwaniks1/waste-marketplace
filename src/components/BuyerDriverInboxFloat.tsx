"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";
import { usePollWhileVisible } from "@/hooks/usePollWhileVisible";

type ConversationRow = {
  id: string;
  updatedAt: string;
  listing: {
    id: string;
    title: string;
    wasteType: string;
    status: string;
    userId: string;
    seller: { id: string; name: string };
  };
  buyer: { id: string; name: string; avatarUrl?: string | null };
  messages: { id: string; body: string; createdAt: string }[];
};

type MessageRow = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
};

const LIST_POLL_MS = 25_000;
const MSG_POLL_MS = 16_000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BuyerDriverInboxFloat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeRow = useMemo(
    () => rows.find((row) => row.id === activeThreadId) ?? null,
    [activeThreadId, rows],
  );

  const loadRows = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingRows(true);
    try {
      const [meResponse, conversationsResponse] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/conversations", { cache: "no-store" }),
      ]);
      const meData = await meResponse.json().catch(() => ({}));
      const conversationsData = await conversationsResponse.json().catch(() => []);
      if (meResponse.ok && meData.profile?.id) setMeId(meData.profile.id);
      if (!conversationsResponse.ok) {
        setError(typeof conversationsData?.error === "string" ? conversationsData.error : "Unable to load messages");
        return;
      }
      setRows(Array.isArray(conversationsData) ? conversationsData : []);
      setError(null);
    } catch {
      setError("Unable to load messages");
    } finally {
      setLoadingRows(false);
    }
  }, []);

  const loadMessages = useCallback(async (threadId: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingMessages(true);
    try {
      const response = await fetch(`/api/conversations/${threadId}/messages`, { cache: "no-store" });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : "Unable to load messages");
        return;
      }
      setMessages(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError("Unable to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadRows();
  }, [loadRows, open]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      setBody("");
      return;
    }
    void loadMessages(activeThreadId);
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  usePollWhileVisible(() => {
    if (open) void loadRows({ silent: true });
  }, LIST_POLL_MS, open);

  usePollWhileVisible(() => {
    if (open && activeThreadId) void loadMessages(activeThreadId, { silent: true });
  }, MSG_POLL_MS, Boolean(open && activeThreadId));

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!activeThreadId || !body.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${activeThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : "Unable to send message");
        return;
      }
      setMessages((current) => [...current, data as MessageRow]);
      setBody("");
      setError(null);
      void loadRows({ silent: true });
    } catch {
      setError("Unable to send message");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/20 p-0 backdrop-blur-[1px] sm:p-5">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close inbox" onClick={onClose} />
      <section className="relative z-10 flex h-[min(84dvh,620px)] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 sm:max-w-md sm:rounded-3xl">
        <header className="shrink-0 border-b border-slate-200/50 bg-cosmos-page-alt/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Inbox</p>
              <h2 className="mt-0.5 text-base font-bold text-slate-900">Messages</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/conversations" onClick={onClose} className="text-xs font-semibold text-teal-700 hover:text-teal-900">
                Full inbox
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-800"
                aria-label="Close messages"
              >
                ×
              </button>
            </div>
          </div>
        </header>
        {error ? <p className="shrink-0 border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-800">{error}</p> : null}

        {!activeThreadId ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-cosmos-page-alt/30 px-3 py-3">
            {loadingRows ? <p className="text-sm text-slate-500">Loading…</p> : null}
            {!loadingRows && rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-900">No conversations yet</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Buyer and seller conversations appear here.</p>
              </div>
            ) : null}
            <div className="space-y-2">
              {rows.map((row) => {
                const imSeller = row.listing.userId === meId;
                const otherName = imSeller ? row.buyer.name : row.listing.seller.name;
                const preview = row.messages[0]?.body ?? "No messages yet";
                const typeLabel = WASTE_TYPE_OPTIONS.find((o) => o.value === row.listing.wasteType)?.label ?? row.listing.wasteType;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setActiveThreadId(row.id)}
                    className="flex w-full gap-3 rounded-2xl border border-slate-200/50 bg-white p-3 text-left shadow-cosmos-sm transition hover:border-teal-200 hover:shadow-cosmos-md"
                  >
                    <UserAvatar name={otherName} avatarUrl={imSeller ? row.buyer.avatarUrl : null} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-950">{otherName}</span>
                        <time className="shrink-0 text-[10px] text-slate-500">{formatTime(row.updatedAt)}</time>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{row.listing.title || typeLabel}</span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">{preview}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-slate-200/50 bg-cosmos-page-alt/60 px-3 py-2">
              <button
                type="button"
                onClick={() => setActiveThreadId(null)}
                className="inline-flex h-9 items-center rounded-full px-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/70"
              >
                Back
              </button>
              {activeRow ? (
                <p className="truncate px-2 pb-1 text-xs text-slate-500">
                  {activeRow.listing.title || activeRow.listing.wasteType}
                </p>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-cosmos-page-alt/30 px-3 py-3">
              {loadingMessages && messages.length === 0 ? <p className="text-sm text-slate-500">Loading…</p> : null}
              <div className="space-y-2.5">
                {messages.map((message) => {
                  const mine = message.sender.id === meId;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 shadow-sm ${mine ? "bg-gradient-to-br from-teal-600 to-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-900"}`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${mine ? "text-white/80" : "text-slate-400"}`}>{message.sender.name}</p>
                        <p className="mt-0.5 text-sm leading-6 text-inherit">{message.body}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>
            <form onSubmit={sendMessage} className="shrink-0 border-t border-slate-200/50 bg-white px-3 py-3">
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200/60 bg-cosmos-page-alt/25 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-cosmos-sm outline-none transition focus:border-teal-500/80 focus:ring-2 focus:ring-teal-100"
                  placeholder="Type a message…"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
                <Button type="submit" className="h-fit self-end rounded-2xl px-4 py-2.5" disabled={sending || !body.trim()}>
                  {sending ? "…" : "Send"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

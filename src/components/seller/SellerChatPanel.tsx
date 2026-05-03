"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { customerListingDetailHref } from "@/lib/seller-workspace-url";
import { Button } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspaceContext";
import type { SellerConversationRow } from "@/components/seller/seller-inbox-types";
import { useSupabaseRealtimeRefresh } from "@/hooks/useSupabaseRealtimeRefresh";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type MessageRow = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
};

function formatConversationTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export type SellerChatPanelProps = {
  /** Floating inbox: window chrome (minimize + close). */
  onMinimize?: () => void;
  onClose?: () => void;
};

function ChromeButtons({
  onMinimize,
  onClose,
}: {
  onMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onMinimize}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-800"
        title="Minimize"
        aria-label="Minimize inbox"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="4" y="11" width="16" height="2" rx="0.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-800"
        title="Close"
        aria-label="Close inbox"
      >
        <span className="text-lg leading-none" aria-hidden>
          ×
        </span>
      </button>
    </div>
  );
}

export function SellerChatPanel({ onMinimize, onClose }: SellerChatPanelProps = {}) {
  const searchParams = useSearchParams();
  const { activeThreadId, openChat, leaveThread } = useSellerWorkspace();
  const isFloating = Boolean(onMinimize && onClose);
  const [rows, setRows] = useState<SellerConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [loadingRows, setLoadingRows] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadIdForPoll = useRef<string | null>(null);
  threadIdForPoll.current = activeThreadId;

  const loadRows = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingRows(true);
    try {
      const [meResponse, conversationsResponse] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/conversations", { cache: "no-store" }),
      ]);
      const meData = await meResponse.json().catch(() => ({}));
      const conversationsData = await conversationsResponse.json().catch(() => []);

      if (meResponse.ok && meData.profile?.id) {
        setMeId(meData.profile.id);
      }

      if (!conversationsResponse.ok) {
        setError("We couldn’t load your conversations right now. Try again in a moment.");
        return;
      }

      setRows(Array.isArray(conversationsData) ? conversationsData : []);
      setError(null);
    } catch {
      setError("We couldn’t load your conversations right now. Try again in a moment.");
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useSupabaseRealtimeRefresh({
    channelName: "seller-conversations",
    changes: [{ event: "*", schema: "public", table: "conversations" }],
    onChange: () => void loadRows({ silent: true }),
    onSubscribed: () => void loadRows({ silent: true }),
  });

  const loadMessages = useCallback(async (threadId: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingMessages(true);
    try {
      const response = await fetch(`/api/conversations/${threadId}/messages`, { cache: "no-store" });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setError("We couldn’t load this conversation right now. Try again in a moment.");
        return;
      }
      if (threadIdForPoll.current === threadId) {
        setMessages(Array.isArray(data) ? data : []);
        setError(null);
      }
    } catch {
      if (threadIdForPoll.current === threadId) setError("We couldn’t load this conversation right now. Try again in a moment.");
    } finally {
      if (threadIdForPoll.current === threadId) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      setBody("");
      return;
    }
    void loadMessages(activeThreadId);
  }, [activeThreadId, loadMessages]);

  useSupabaseRealtimeRefresh({
    channelName: activeThreadId ? `seller-messages:${activeThreadId}` : "seller-messages:pending-thread",
    enabled: Boolean(activeThreadId),
    changes: [
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeThreadId}` },
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeThreadId}` },
    ],
    onChange: () => {
      const id = activeThreadId;
      if (id) void loadMessages(id, { silent: true });
    },
    onSubscribed: () => {
      const id = activeThreadId;
      if (id) void loadMessages(id, { silent: true });
    },
  });

  const orderedConversationRows = useMemo(() => {
    const statusOrder: Record<string, number> = {
      accepted: 0,
      in_progress: 0,
      open: 1,
      reopened: 1,
      no_show: 2,
      completed: 3,
      cancelled: 4,
    };
    return [...rows].sort((a, b) => {
      const pa = statusOrder[a.listing.status] ?? 5;
      const pb = statusOrder[b.listing.status] ?? 5;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [rows]);

  const activeRow = useMemo(() => {
    if (!activeThreadId) return null;
    return rows.find((row) => row.id === activeThreadId) ?? null;
  }, [activeThreadId, rows]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        setError("We couldn’t send your message right now. Try again in a moment.");
        return;
      }

      setMessages((current) => [...current, data as MessageRow]);
      setRows((current) =>
        current.map((row) =>
          row.id === activeThreadId
            ? {
                ...row,
                updatedAt: new Date().toISOString(),
                messages: [
                  {
                    id: (data as MessageRow).id,
                    body: (data as MessageRow).body,
                    createdAt: (data as MessageRow).createdAt,
                  },
                ],
              }
            : row,
        ),
      );
      setBody("");
      setError(null);
    } catch {
      setError("We couldn’t send your message right now. Try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  const threadList = (
    <>
      {loadingRows ? (
        <div className="space-y-2 px-0 py-0" aria-busy="true" aria-label="Loading threads">
          <div className="h-14 animate-pulse rounded-2xl bg-cosmos-page-alt" />
          <div className="h-14 animate-pulse rounded-2xl bg-cosmos-page-alt" />
        </div>
      ) : null}

        {!loadingRows && orderedConversationRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200/80 bg-cosmos-page-alt/50 px-3 py-6 text-center">
          <p className="text-sm font-bold text-slate-900">No threads yet</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Buyer conversations appear when someone messages a listing.</p>
        </div>
      ) : null}

      {!loadingRows && orderedConversationRows.length > 0 ? (
        <div className="space-y-1.5 pr-0.5 [scrollbar-gutter:stable]">
          {orderedConversationRows.map((row) => {
            const active = row.id === activeThreadId;
            const preview = row.messages[0]?.body ?? "No messages yet";
            const typeMeta =
              WASTE_TYPE_OPTIONS.find((option) => option.value === row.listing.wasteType)?.label ?? row.listing.wasteType;
            const headline = row.listing.title?.trim() ? row.listing.title.trim() : typeMeta;

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => openChat(row.id)}
                className={`flex w-full items-start gap-2.5 rounded-2xl border px-2.5 py-2.5 text-left transition ${
                  active
                    ? "border-teal-400/50 bg-white shadow-cosmos-md ring-1 ring-teal-200/50"
                    : "border-slate-200/50 bg-white shadow-cosmos-sm hover:border-slate-300/80 hover:shadow-cosmos-md"
                }`}
              >
                <UserAvatar name={row.buyer.name} avatarUrl={row.buyer.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-950">{row.buyer.name}</p>
                    <time className="shrink-0 text-[10px] text-slate-500">{formatConversationTime(row.updatedAt)}</time>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{headline}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">{preview}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );

  const threadDetail =
    activeThreadId && !activeRow && loadingRows ? (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
        <p className="text-sm text-slate-500">Getting the conversation ready.</p>
      </div>
    ) : activeThreadId && !activeRow && !loadingRows ? (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center">
        <p className="text-sm text-slate-600">This conversation is no longer available.</p>
        <button
          type="button"
          onClick={leaveThread}
          className="text-sm font-semibold text-teal-800 underline"
        >
          Back to list
        </button>
      </div>
    ) : activeRow ? (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-slate-200/50 bg-cosmos-page-alt/60 px-3 py-2.5 sm:px-4">
          <div className="flex items-start gap-2.5">
            <UserAvatar name={activeRow.buyer.name} avatarUrl={activeRow.buyer.avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-teal-700/90">Private chat</p>
              <p className="truncate text-sm font-bold text-slate-900 sm:text-base">{activeRow.buyer.name}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">
                {activeRow.listing.title?.trim()
                  ? activeRow.listing.title.trim()
                  : WASTE_TYPE_OPTIONS.find((option) => option.value === activeRow.listing.wasteType)?.label ??
                    activeRow.listing.wasteType}
              </p>
            </div>
          </div>
          <div className="mt-2.5">
            <Link
              href={customerListingDetailHref(activeRow.listing.id, searchParams)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-800"
            >
              View listing
            </Link>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-cosmos-page-alt/30 px-3 py-3 sm:px-4">
          {loadingMessages && messages.length === 0 ? <p className="text-sm text-slate-500">Getting the conversation ready.</p> : null}

          {!loadingMessages && messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200/80 bg-white/90 px-4 py-6 text-center shadow-cosmos-sm">
              <p className="text-sm font-bold text-slate-900">Start the thread</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Share timing, quantity, or pickup details here.</p>
            </div>
          ) : null}

          <div className="space-y-2.5 pb-1">
            {messages.map((message) => {
              const mine = message.sender.id === meId;
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      mine
                        ? "bg-gradient-to-br from-teal-600 to-emerald-600 text-white"
                        : "border border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${mine ? "text-white/80" : "text-slate-400"}`}>
                      {message.sender.name}
                    </p>
                    <p className="mt-0.5 text-sm leading-6 text-inherit">{message.body}</p>
                    <p className={`mt-1.5 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <form onSubmit={sendMessage} className="shrink-0 border-t border-slate-200/50 bg-white px-3 py-3 sm:px-4">
          <div className="flex gap-2">
            <textarea
              rows={2}
              className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200/60 bg-cosmos-page-alt/25 px-3.5 py-2.5 text-sm text-slate-900 !text-slate-900 placeholder:text-slate-400 shadow-cosmos-sm outline-none ring-0 transition focus:border-teal-500/80 focus:ring-2 focus:ring-teal-100"
              style={{ color: "#0f172a" }}
              placeholder="Message the buyer…"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              name="inboxMessage"
            />
            <Button type="submit" className="h-fit self-end rounded-2xl px-4 py-2.5 shadow-cosmos-sm" disabled={sending || !body.trim()}>
              {sending ? "…" : "Send"}
            </Button>
          </div>
        </form>
      </div>
    ) : null;

  if (isFloating) {
    if (!activeThreadId) {
      return (
        <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden bg-white">
          <div className="shrink-0 border-b border-slate-200/50 bg-cosmos-page-alt/80 px-3 py-2.5 sm:px-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Inbox</p>
                <h2 className="mt-0.5 text-base font-bold text-slate-900">Messages</h2>
                <p className="mt-0.5 text-xs text-slate-500">All conversations</p>
              </div>
              <ChromeButtons onMinimize={onMinimize!} onClose={onClose!} />
            </div>
          </div>
          {error ? <p className="shrink-0 border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p> : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-cosmos-page-alt/30 px-3 py-2.5 sm:px-4">
            {threadList}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden bg-white">
        <div className="shrink-0 border-b border-slate-200/50 bg-cosmos-page-alt/80 px-2 py-2 sm:px-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={leaveThread}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/70"
              aria-label="Back to conversation list"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Back</span>
            </button>
            <div className="min-w-0 flex-1" />
            <ChromeButtons onMinimize={onMinimize!} onClose={onClose!} />
          </div>
        </div>
        {error ? <p className="shrink-0 border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p> : null}
        {threadDetail}
      </div>
    );
  }

  /* Embedded (non-floating) — same drill-down: list OR thread */
  if (!activeThreadId) {
    return (
      <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-cosmos-md sm:rounded-3xl">
        <div className="shrink-0 border-b border-slate-200/50 bg-cosmos-page-alt/80 px-3 py-2.5 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Inbox</p>
              <h2 className="mt-0.5 text-base font-bold text-slate-900">Messages</h2>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 sm:text-sm">
                Every buyer thread across your listings. Open one to reply.
              </p>
            </div>
          </div>
        </div>
        {error ? <p className="shrink-0 border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p> : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-cosmos-page-alt/30 px-3 py-2.5 sm:px-4">
          {threadList}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-cosmos-md sm:rounded-3xl">
      <div className="shrink-0 border-b border-slate-200/50 bg-cosmos-page-alt/80 px-2 py-2 sm:px-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={leaveThread}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/70"
            aria-label="Back to conversation list"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back</span>
          </button>
        </div>
      </div>
      {error ? <p className="shrink-0 border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p> : null}
      {threadDetail}
    </div>
  );
}

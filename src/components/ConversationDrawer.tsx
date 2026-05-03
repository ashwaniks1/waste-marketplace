"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { useSupabaseRealtimeRefresh } from "@/hooks/useSupabaseRealtimeRefresh";

type MessageRow = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
};

export function ConversationDrawer({
  open,
  conversationId,
  title,
  subtitle,
  avatarUrl,
  onClose,
}: {
  open: boolean;
  conversationId: string | null;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const response = await fetch("/api/users/me");
        const data = await response.json();
        if (response.ok && data.profile?.id) {
          setMeId(data.profile.id);
        }
      } catch {
        setMeId(null);
      }
    })();
  }, [open]);

  const loadMessages = useCallback(async (opts?: { silent?: boolean }) => {
    if (!conversationId) return;
    if (!opts?.silent) setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setError("We couldn’t load this conversation right now. Try again in a moment.");
        return;
      }
      setMessages(data);
      setError(null);
    } catch {
      setError("We couldn’t load this conversation right now. Try again in a moment.");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!open || !conversationId) return;
    void loadMessages();
  }, [conversationId, loadMessages, open]);

  useSupabaseRealtimeRefresh({
    channelName: conversationId ? `conversation-drawer:${conversationId}` : "conversation-drawer:pending-thread",
    enabled: Boolean(open && conversationId),
    changes: [
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
    ],
    onChange: () => void loadMessages({ silent: true }),
    onSubscribed: () => void loadMessages({ silent: true }),
  });

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const disabled = useMemo(() => !conversationId || sending, [conversationId, sending]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!conversationId || !body.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError("We couldn’t send your message right now. Try again in a moment.");
        return;
      }
      setMessages((current) => [...current, data]);
      setBody("");
      setError(null);
    } catch {
      setError("We couldn’t send your message right now. Try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-cosmos-md ring-1 ring-slate-200/50 sm:w-[28rem] sm:rounded-l-3xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Conversation with ${title}`}
      >
        <div className="border-b border-slate-200/50 bg-cosmos-page-alt/90 px-5 py-4 sm:rounded-tl-3xl">
          <div className="flex items-start gap-3">
            <UserAvatar name={title} avatarUrl={avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Private chat</p>
              <p className="truncate text-lg font-semibold text-slate-950">{title}</p>
              {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-4 py-4">
          {loading && messages.length === 0 ? <p className="text-sm text-slate-500">Getting the conversation ready.</p> : null}
          {!loading && messages.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200/80 bg-white px-5 py-8 text-center shadow-cosmos-sm">
              <p className="text-sm font-medium text-slate-900">Start the pickup conversation</p>
              <p className="mt-2 text-sm text-slate-600">
                Share timing, entry instructions, or quick updates here without leaving the listing.
              </p>
            </div>
          ) : null}

          {messages.map((message) => {
            const mine = message.sender.id === meId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-cosmos-sm ${
                    mine
                      ? "bg-gradient-to-br from-teal-600 to-emerald-600 text-white"
                      : "border border-slate-200/60 bg-white text-slate-900"
                  }`}
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${mine ? "text-white/70" : "text-slate-400"}`}>
                    {message.sender.name}
                  </p>
                  <p className="mt-1 text-sm leading-6">{message.body}</p>
                  <p className={`mt-2 text-[11px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-slate-200/50 bg-white px-4 py-4 sm:rounded-bl-3xl">
          {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
          <div className="flex gap-2">
            <textarea
              rows={2}
              className="min-h-[56px] flex-1 resize-none rounded-2xl border border-slate-200/60 bg-cosmos-page-alt/30 px-4 py-3 text-sm text-slate-900 shadow-cosmos-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="Type a message…"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <Button type="submit" disabled={disabled} className="self-end rounded-2xl px-5">
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

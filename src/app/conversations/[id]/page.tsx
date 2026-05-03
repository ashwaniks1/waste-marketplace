"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { useSupabaseRealtimeRefresh } from "@/hooks/useSupabaseRealtimeRefresh";

type ConvMeta = {
  id: string;
  listingId: string;
  buyerId: string;
  listing: { id: string; wasteType: string; status: string; userId: string; seller: { id: string; name: string } };
  buyer: { id: string; name: string; email: string };
};

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
};

export default function ConversationPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<ConvMeta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [role, setRole] = useState<"customer" | "buyer" | "admin" | "driver">("buyer");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMeta = useCallback(async () => {
    const r = await fetch(`/api/conversations/${id}`);
    const d = await r.json();
    if (r.ok) setMeta(d);
  }, [id]);

  const loadMessages = useCallback(async () => {
    const r = await fetch(`/api/conversations/${id}/messages`);
    if (r.ok) setMessages(await r.json());
  }, [id]);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/users/me");
      const m = await me.json();
      if (me.ok && m.profile) {
        setMeId(m.profile.id);
        const r = m.profile.role;
        if (r === "admin" || r === "buyer" || r === "customer" || r === "driver") setRole(r);
        else setRole("customer");
      }
    })();
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!meta || meId == null) return;
    if (role === "customer" && meta.listing.userId === meId) {
      router.replace(
        `/customer/listings/${meta.listing.id}?c=${encodeURIComponent(String(id))}`,
        { scroll: false },
      );
    }
  }, [id, meId, meta, role, router]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useSupabaseRealtimeRefresh({
    channelName: `conversation-page:${id}`,
    changes: [
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
      { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${id}` },
    ],
    onChange: () => {
      void loadMeta();
      void loadMessages();
    },
    onSubscribed: () => {
      void loadMessages();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const r = await fetch(`/api/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (r.ok) {
      setBody("");
      await loadMessages();
    }
  }

  if (!meta) {
    return (
      <>
        <AppHeader title="Chat" backHref="/conversations" role={role} />
        <p className="p-4 text-slate-600">Getting the conversation ready.</p>
      </>
    );
  }

  const backHref =
    role === "admin"
      ? `/admin/listings/${meta.listing.id}`
      : meta.listing.userId === meId
        ? `/customer/listings/${meta.listing.id}?c=${encodeURIComponent(String(id))}`
        : `/listing/${meta.listing.id}`;
  const imSeller = meta.listing.userId === meId;
  const otherName = imSeller ? meta.buyer.name : meta.listing.seller.name;
  const title = `Chat · ${otherName}`;

  return (
    <>
      <AppHeader title={title} backHref={backHref} role={role} />
      <div className="mx-auto flex max-w-4xl flex-col pb-28 pt-1 sm:pb-6">
        <div className="flex min-h-[58vh] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-cosmos-md">
          <div className="shrink-0 border-b border-slate-200/50 bg-cosmos-page-alt/80 px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-teal-700/90">Private chat</p>
            <p className="mt-0.5 truncate text-base font-bold text-slate-900">{otherName}</p>
            <Link href={backHref} className="mt-1 inline-flex text-xs font-semibold text-teal-700 hover:text-teal-900">
              View listing
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-cosmos-page-alt/30 px-3 py-3 sm:px-4">
            <div className="space-y-2.5 pb-1">
              {messages.map((m) => {
                const mine = m.sender.id === meId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                        mine
                          ? "bg-gradient-to-br from-teal-600 to-emerald-600 text-white"
                          : "border border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${mine ? "text-white/80" : "text-slate-400"}`}>
                        {m.sender.name}
                      </p>
                      <p className="mt-0.5 leading-6 text-inherit">{m.body}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
        <form
          onSubmit={send}
          className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:relative sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0"
        >
          <div className="mx-auto flex max-w-3xl gap-2">
            <textarea
              rows={2}
              className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200/60 bg-cosmos-page-alt/25 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-cosmos-sm outline-none transition focus:border-teal-500/80 focus:ring-2 focus:ring-teal-100"
              placeholder="Type a message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button type="submit" className="h-fit shrink-0 self-end rounded-2xl px-4 py-2.5 shadow-cosmos-sm" disabled={!body.trim()}>
              Send
            </Button>
          </div>
          <Link href={backHref} className="mt-2 hidden text-center text-xs text-teal-700 sm:block">
            Back to listing
          </Link>
        </form>
      </div>
    </>
  );
}

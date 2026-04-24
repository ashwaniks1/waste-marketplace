"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";

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

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<ConvMeta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [role, setRole] = useState<"customer" | "buyer" | "admin" | "driver">("buyer");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMeta() {
    const r = await fetch(`/api/conversations/${id}`);
    const d = await r.json();
    if (r.ok) setMeta(d);
  }

  async function loadMessages() {
    const r = await fetch(`/api/conversations/${id}/messages`);
    if (r.ok) setMessages(await r.json());
  }

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
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on id only
  }, [id]);

  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll per conversation id
  }, [id]);

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
        <p className="p-4 text-slate-600">Loading…</p>
      </>
    );
  }

  const backHref =
    role === "admin"
      ? `/admin/listings/${meta.listing.id}`
      : meta.listing.userId === meId
        ? `/customer/listings/${meta.listing.id}`
        : `/listing/${meta.listing.id}`;
  const title = `Chat · ${meta.buyer.name}`;

  return (
    <>
      <AppHeader title={title} backHref={backHref} role={role} />
      <div className="mx-auto flex max-w-3xl flex-col px-4 pb-28 pt-4 sm:px-6">
        <div className="min-h-[50vh] flex-1 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.sender.id === meId ? "ml-auto bg-teal-600 text-white" : "bg-slate-100 text-slate-900"
              }`}
            >
              <p className="text-xs opacity-80">{m.sender.name}</p>
              <p>{m.body}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={send}
          className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:relative sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0"
        >
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm"
              placeholder="Type a message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button type="submit" className="shrink-0">
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

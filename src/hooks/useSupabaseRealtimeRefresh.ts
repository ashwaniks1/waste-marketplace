"use client";

import { useEffect, useRef } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

type RealtimeChange = {
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema: "public";
  table: string;
  filter?: string;
};

type UseSupabaseRealtimeRefreshOptions = {
  channelName: string;
  changes: RealtimeChange[];
  enabled?: boolean;
  debounceMs?: number;
  onChange: () => void;
  onSubscribed?: () => void;
};

/**
 * Subscribes to Postgres changes and asks the existing secure loaders to refresh.
 * This keeps encrypted/private response shaping in API routes instead of trusting raw realtime payloads.
 */
export function useSupabaseRealtimeRefresh({
  channelName,
  changes,
  enabled = true,
  debounceMs = 250,
  onChange,
  onSubscribed,
}: UseSupabaseRealtimeRefreshOptions) {
  const onChangeRef = useRef(onChange);
  const onSubscribedRef = useRef(onSubscribed);
  const changesRef = useRef(changes);
  const changesKey = JSON.stringify(changes);

  onChangeRef.current = onChange;
  onSubscribedRef.current = onSubscribed;
  changesRef.current = changes;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserSupabase();
    const channel = supabase.channel(channelName);
    let timer: number | undefined;

    function refreshSoon() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        onChangeRef.current();
      }, debounceMs);
    }

    for (const change of changesRef.current) {
      channel.on("postgres_changes", change, refreshSoon);
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onSubscribedRef.current?.();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        refreshSoon();
      }
    });

    return () => {
      if (timer) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [channelName, changesKey, debounceMs, enabled]);
}

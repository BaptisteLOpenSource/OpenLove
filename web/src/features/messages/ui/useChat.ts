"use client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";

import type { messagesResponse } from "@/shared/contracts/messages";
import { browserClient } from "@/shared/supabase/browser";

import { type Message, mergeMessages } from "./merge";

type Page = z.input<typeof messagesResponse>;

const TYPING_SHOWN_MS = 5_000;
const TYPING_THROTTLE_MS = 2_000;

// Only place that calls /api/messages from the browser.
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.code ?? "internal");
  return body.data as T;
}

export function useChat(initial: Page, coupleId: string) {
  const [items, setItems] = useState<Message[]>(() => mergeMessages(initial.items, []));
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [partnerReadId, setPartnerReadId] = useState(initial.partnerReadId);
  const [failed, setFailed] = useState(false);

  const loadOlder = async () => {
    if (!nextCursor) return;
    const page = await api<Page>(`/api/messages?cursor=${nextCursor}`);
    setItems((prev) => mergeMessages(page.items, prev));
    setNextCursor(page.nextCursor);
  };

  // Realtime signal (T3) will call this too; it only ever merges newest page
  const refresh = async () => {
    const page = await api<Page>("/api/messages");
    setItems((prev) => mergeMessages(prev, page.items));
    setPartnerReadId(page.partnerReadId);
  };

  const markRead = () => api("/api/messages/read", { method: "POST" });

  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTypingSent = useRef(0);
  const channelRef = useRef<RealtimeChannel | undefined>(undefined);

  useEffect(() => {
    // Signals hold ids only, so every event refetches. A read event must not mark read
    // again (the upsert emits a read event): loop.
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      markRead()
        .then(refresh)
        .catch(() => setFailed(true));
    };
    const pull = () => refresh().catch(() => setFailed(true));
    const sb = browserClient();
    const channel = sb
      .channel(`couple:${coupleId}`, { config: { private: true } })
      .on("broadcast", { event: "message" }, sync)
      .on("broadcast", { event: "read" }, pull)
      .on("broadcast", { event: "typing" }, () => {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), TYPING_SHOWN_MS);
      })
      // re-SUBSCRIBED after a drop: signals were missed, catch up
      .subscribe((status) => {
        if (status === "SUBSCRIBED") sync();
      });
    channelRef.current = channel;
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      clearTimeout(typingTimer.current);
      void sb.removeChannel(channel);
    };
  }, [coupleId]);

  const onTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
    lastTypingSent.current = now;
    void channelRef.current?.send({ type: "broadcast", event: "typing", payload: {} });
  };

  const send = async (text: string): Promise<boolean> => {
    try {
      const msg = await api<Message>("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setItems((prev) => mergeMessages(prev, [msg]));
      setFailed(false);
      return true;
    } catch {
      setFailed(true);
      return false;
    }
  };

  return {
    items,
    hasOlder: nextCursor !== null,
    partnerReadId,
    loadOlder,
    send,
    failed,
    typing,
    onTyping,
  };
}

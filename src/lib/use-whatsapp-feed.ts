"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type BridgeStatus,
  type WhatsAppFeed,
  type WhatsAppMessage,
  WHATSAPP_COLS,
  whatsappError,
} from "../../shared/whatsapp";
import { createClient } from "./supabase/client";

export function useWhatsAppFeed(messId: string) {
  const [feed, setFeed] = useState<WhatsAppFeed | null>(null);
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [error, setError] = useState<string | null>(() =>
    createClient() ? null : "সুপাবেস সংযোগ চালু নেই।",
  );
  const [loading, setLoading] = useState(() => Boolean(createClient()));
  const [hasMore, setHasMore] = useState(false);
  const [connected, setConnected] = useState(false);
  const shown = useRef(50);
  const request = useRef(0);
  const active = useRef(true);

  const reload = useCallback(async () => {
    const id = ++request.current;
    const db = createClient();
    if (!db) return;
    try {
      const results = await Promise.all([
        db.from("whatsapp_feeds").select("*").eq("mess_id", messId).maybeSingle(),
        db
          .from("whatsapp_messages")
          .select(WHATSAPP_COLS)
          .eq("mess_id", messId)
          .order("sent_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(shown.current + 1),
        db.rpc("whatsapp_bridge_status", { p_mess: messId }),
      ]);
      if (!active.current || id !== request.current) return;
      const failure = results.find((result) => result.error)?.error;
      if (failure) {
        setError(whatsappError(failure));
        return;
      }
      setFeed(results[0].data as WhatsAppFeed | null);
      const rows = (results[1].data ?? []) as WhatsAppMessage[];
      setMessages(rows.slice(0, shown.current));
      setHasMore(rows.length > shown.current);
      setBridge(results[2].data as BridgeStatus | null);
      setError(null);
    } catch {
      if (active.current && id === request.current) setError("বার্তা আনা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      if (active.current && id === request.current) setLoading(false);
    }
  }, [messId]);

  useEffect(() => {
    active.current = true;
    const db = createClient();
    const channel = db
      ?.channel(`whatsapp:${messId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_feeds", filter: `mess_id=eq.${messId}` },
        () => {
          void reload();
        },
      )
      .subscribe((status: string) => {
        if (!active.current) return;
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") void reload();
      });
    void reload();
    function refresh() {
      if (document.visibilityState === "visible") void reload();
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active.current = false;
      request.current += 1;
      if (db && channel) void db.removeChannel(channel);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [messId, reload]);

  async function manage(action: "pause" | "resume" | "clear" | "disconnect") {
    const db = createClient();
    if (!db) return false;
    const { error: failure } = await db.rpc("manage_whatsapp_feed", {
      p_mess: messId,
      p_action: action,
    });
    if (failure) {
      setError(whatsappError(failure));
      return false;
    }
    await reload();
    return true;
  }

  async function loadMore() {
    shown.current = Math.min(500, shown.current + 50);
    await reload();
  }

  return { feed, bridge, messages, error, loading, hasMore, connected, reload, manage, loadMore };
}

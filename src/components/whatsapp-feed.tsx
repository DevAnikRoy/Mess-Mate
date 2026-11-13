"use client";

import { useEffect, useRef, useState } from "react";
import {
  messageDay,
  messageTime,
  parseWhatsAppExport,
  publishWhatsAppImport,
  whatsappError,
  type ImportMessage,
} from "../../shared/whatsapp";
import { useMess } from "@/lib/store";
import { useWhatsAppFeed } from "@/lib/use-whatsapp-feed";
import { createClient } from "@/lib/supabase/client";

const button =
  "min-h-11 rounded-2xl bg-[#6C4DFF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C4DFF]";
const secondary =
  "min-h-11 rounded-2xl bg-[#F1EAFF] px-4 py-2 text-sm font-semibold text-[#6C4DFF] disabled:opacity-40";

export function WhatsAppFeed() {
  const { mess, isManager } = useMess();
  const { feed, bridge, messages, error, loading, hasMore, connected, reload, manage, loadMore } =
    useWhatsAppFeed(mess.id);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const [seen, setSeen] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const latest = messages[0]?.id;
  const unread = seen
    ? Math.max(
        0,
        messages.findIndex((message) => message.id === seen),
      )
    : 0;
  const ordered = [...messages].reverse();

  useEffect(() => {
    if (atBottom && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [atBottom, latest]);

  async function act(action: "pause" | "resume" | "clear" | "disconnect") {
    if (
      (action === "clear" || action === "disconnect") &&
      !window.confirm(
        action === "clear" ? "মেসমেটের এই বার্তাগুলো মুছবেন?" : "এই মেসের ফোনের সংযোগ শেষ করবেন?",
      )
    )
      return;
    setBusy(true);
    try {
      await manage(action);
    } catch {
      setNotice("কাজটি হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function older() {
    const element = scroller.current;
    const before = element?.scrollHeight ?? 0;
    setAtBottom(false);
    await loadMore();
    requestAnimationFrame(() => {
      if (element) element.scrollTop += element.scrollHeight - before;
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[#5C5872]">{mess.name}</p>
          <h1 className="text-2xl font-bold">হোয়াটসঅ্যাপ বার্তা</h1>
          <p className="mt-1 text-sm text-[#5C5872]">
            {feed?.group_name ?? "মেসের গ্রুপের বার্তা এক জায়গায়"}
          </p>
        </div>
        <button className={secondary} onClick={() => void reload()} disabled={loading}>
          আবার দেখুন
        </button>
      </header>

      <div className="rounded-2xl bg-[#F7F4FF] px-4 py-3 text-sm leading-6">
        <p>
          {feed?.last_received_at
            ? `শেষ বার্তা এসেছে ${messageDay(feed.last_received_at)}, ${messageTime(feed.last_received_at)}`
            : "প্রথম বার্তার অপেক্ষায়"}
        </p>
        {feed && !feed.enabled && <p className="text-[#A16207]">নতুন বার্তা আসা বন্ধ আছে।</p>}
        {bridge && !bridge.manager_valid && (
          <p className="text-[#A16207]">
            ম্যানেজার বদলেছে। নতুন ম্যানেজারকে Android ফোনে আবার গ্রুপ যুক্ত করতে হবে।
          </p>
        )}
        {bridge?.last_seen_at && (
          <p className="text-xs text-[#5C5872]">
            ফোনের শেষ সংযোগ {messageDay(bridge.last_seen_at)}, {messageTime(bridge.last_seen_at)}
          </p>
        )}
        {!connected && (
          <p className="text-xs text-[#5C5872]">
            সরাসরি আপডেটের সংযোগ অপেক্ষায়। আবার দেখুন চাপলে সাম্প্রতিক বার্তা আসবে।
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-2xl bg-[#FFE4EA] p-4 text-sm text-[#9F1239]">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-[#5C5872]">
          {notice}
        </p>
      )}

      <section
        aria-label="গ্রুপের বার্তা"
        className="relative overflow-hidden rounded-3xl border border-[#E7E0F4]"
      >
        <div
          ref={scroller}
          tabIndex={0}
          className="h-[min(60dvh,640px)] min-h-72 overflow-y-auto bg-[#FAF8FF] px-4 py-5 focus-visible:outline-2 focus-visible:outline-[#6C4DFF]"
          onScroll={(event) => {
            const element = event.currentTarget;
            const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
            setAtBottom(bottom);
            if (bottom || atBottom) setSeen(latest ?? null);
          }}
        >
          {hasMore && (
            <button
              className={`${secondary} mb-4 w-full`}
              disabled={busy}
              onClick={() => void older()}
            >
              আগের বার্তা দেখুন
            </button>
          )}
          {loading ? (
            <p role="status" className="py-16 text-center text-sm text-[#5C5872]">
              বার্তা আনা হচ্ছে…
            </p>
          ) : (
            !messages.length && (
              <div className="mx-auto max-w-sm py-16 text-center">
                <p className="font-semibold">এখনো কোনো বার্তা আসেনি</p>
                <p className="mt-2 text-sm leading-6 text-[#5C5872]">
                  {isManager
                    ? "Android অ্যাপে এই মেসের গ্রুপ যুক্ত করুন, অথবা নিচে পুরনো বার্তা যোগ করুন।"
                    : "ম্যানেজার গ্রুপ যুক্ত করলে নতুন বার্তা এখানে দেখা যাবে।"}
                </p>
              </div>
            )
          )}
          {ordered.map((message, index) => (
            <div key={message.id}>
              {(index === 0 ||
                messageDay(ordered[index - 1].sent_at) !== messageDay(message.sent_at)) && (
                <p className="my-4 text-center text-xs font-medium text-[#5C5872]">
                  {messageDay(message.sent_at)}
                </p>
              )}
              <article className="mb-3 w-fit min-w-40 max-w-[94%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-[0_1px_3px_rgba(27,23,48,0.06)]">
                <p className="text-sm font-semibold text-[#5738C9]">{message.sender}</p>
                <p
                  dir="auto"
                  className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-7"
                >
                  {message.body}
                </p>
                <p className="mt-1 text-right text-[11px] text-[#5C5872]">
                  {message.source === "import" && "যোগ করা বার্তা · "}
                  {messageTime(message.sent_at)}
                </p>
              </article>
            </div>
          ))}
        </div>
        {!atBottom && unread > 0 && (
          <button
            className={`${button} absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-md`}
            onClick={() => {
              setAtBottom(true);
              setSeen(latest ?? null);
            }}
          >
            {unread}টি নতুন বার্তা দেখুন
          </button>
        )}
      </section>

      {isManager && (
        <section className="space-y-3 rounded-3xl border border-[#E7E0F4] p-4">
          <h2 className="font-semibold">গ্রুপের সংযোগ</h2>
          <p className="text-sm leading-6 text-[#5C5872]">
            লাইভ বার্তা চালু করতে মেসমেটের নতুন Android অ্যাপে এই পেজটি খুলুন। নির্বাচিত গ্রুপের নোটিফিকেশনের
            লেখা ফোনে পৌঁছালে এখানে আসবে।
          </p>
          <div className="flex flex-wrap gap-2">
            {feed && bridge && (
              <button
                className={secondary}
                disabled={busy}
                onClick={() => void act(feed.enabled ? "pause" : "resume")}
              >
                {feed.enabled ? "আসা বন্ধ রাখুন" : "আবার চালু করুন"}
              </button>
            )}
            {bridge && (
              <button className={secondary} disabled={busy} onClick={() => void act("disconnect")}>
                ফোনের সংযোগ শেষ করুন
              </button>
            )}
            {messages.length > 0 && (
              <button
                className="min-h-11 rounded-2xl px-4 text-sm text-[#BE123C] disabled:opacity-40"
                disabled={busy}
                onClick={() => void act("clear")}
              >
                বার্তা মুছুন
              </button>
            )}
            <button className={secondary} onClick={() => setImporting((value) => !value)}>
              {importing ? "ইমপোর্ট বন্ধ করুন" : "পুরনো বার্তা যোগ করুন"}
            </button>
          </div>
          {importing && (
            <WhatsAppImport
              messId={mess.id}
              groupName={feed?.group_name ?? ""}
              onSaved={async () => {
                await reload();
                setNotice("নির্বাচিত বার্তাগুলো যোগ হয়েছে।");
              }}
            />
          )}
        </section>
      )}
      <p className="text-xs leading-5 text-[#5C5872]">
        শুধু পড়ার জন্য। সর্বশেষ ৫০০টি বার্তা রাখা হয়। ফোন অফলাইন থাকলে বা WhatsApp পড়ার মতো নোটিফিকেশন না
        দিলে কিছু বার্তা দেরিতে আসতে পারে বা বাদ পড়তে পারে।
      </p>
    </div>
  );
}

function WhatsAppImport({
  messId,
  groupName,
  onSaved,
}: {
  messId: string;
  groupName: string;
  onSaved: () => Promise<void>;
}) {
  const [raw, setRaw] = useState("");
  const [name, setName] = useState(groupName);
  const [order, setOrder] = useState<"dmy" | "mdy">("dmy");
  const [preview, setPreview] = useState<ImportMessage[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);

  function parse() {
    try {
      const result = parseWhatsAppExport(raw, order);
      setPreview(result.messages);
      setExcluded(new Set());
      setError(
        result.skipped
          ? `${result.skipped}টি সিস্টেম, মিডিয়া বা অসমর্থিত বার্তা বাদ গেছে।`
          : result.messages.length
            ? ""
            : "কোনো বার্তা পাওয়া যায়নি। তারিখের ধরন ও লেখা দেখুন।",
      );
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function save() {
    const db = createClient();
    if (!db || !consent || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await publishWhatsAppImport(
        preview.filter((_, index) => !excluded.has(index)),
        async (text) => {
          const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
          return Array.from(new Uint8Array(hash), (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join("");
        },
        async (events) => {
          const { data, error: failure } = await db.rpc("import_whatsapp_messages", {
            p_mess: messId,
            p_group_name: name.trim(),
            p_events: events,
          });
          if (failure) throw failure;
          return Number(data);
        },
      );
      setRaw("");
      setPreview([]);
      setConsent(false);
      await onSaved();
    } catch (caught) {
      setError(
        `${whatsappError(caught as { message?: string })} কিছু বার্তা সেভ হয়ে থাকলে আবার চেষ্টা করলে একই বার্তা দ্বিতীয়বার যোগ হবে না।`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-[#E7E0F4] pt-4">
      <p className="text-sm leading-6 text-[#5C5872]">
        WhatsApp থেকে Export chat → Without media বেছে নিন। .txt ফাইল বা তার লেখা দিন। প্রিভিউয়ের সময়
        ঢাকা ধরে দেখানো হবে।
      </p>
      <label className="block text-sm">
        গ্রুপের নাম
        <input
          className="mt-1 block min-h-11 w-full rounded-xl bg-[#F6F4FB] px-3"
          maxLength={120}
          value={groupName || name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy || Boolean(groupName)}
        />
      </label>
      <label className="block text-sm">
        চ্যাটের .txt ফাইল
        <input
          type="file"
          accept=".txt,text/plain"
          disabled={busy}
          className="mt-2 block w-full text-sm"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 1_000_000) return setError("সর্বোচ্চ ১ MB ফাইল দিন।");
            try {
              setRaw(await file.text());
              setPreview([]);
            } catch {
              setError("ফাইলটি পড়া যায়নি।");
            }
          }}
        />
      </label>
      <textarea
        aria-label="চ্যাটের লেখা"
        className="min-h-32 w-full rounded-xl bg-[#F6F4FB] p-3 text-sm"
        placeholder="এখানে চ্যাটের লেখা পেস্ট করুন"
        value={raw}
        maxLength={1_000_000}
        disabled={busy}
        onChange={(event) => {
          setRaw(event.target.value);
          setPreview([]);
        }}
      />
      <label className="block text-sm">
        রপ্তানির তারিখের ধরন
        <select
          className="ml-2 min-h-11 rounded-xl bg-[#F6F4FB] px-2"
          value={order}
          disabled={busy}
          onChange={(event) => {
            setOrder(event.target.value as "dmy" | "mdy");
            setPreview([]);
          }}
        >
          <option value="dmy">দিন/মাস/বছর</option>
          <option value="mdy">মাস/দিন/বছর</option>
        </select>
      </label>
      <button className={secondary} onClick={parse} disabled={busy || !raw.trim()}>
        প্রিভিউ দেখুন
      </button>
      {error && (
        <p role="alert" className="text-sm text-[#9F1239]">
          {error}
        </p>
      )}
      {preview.length > 0 && (
        <>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-[#E7E0F4] p-3">
            {preview.map((message, index) => (
              <label
                className="flex items-start gap-3 border-b border-[#E7E0F4] py-2 text-sm last:border-0"
                key={index}
              >
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={!excluded.has(index)}
                  onChange={() =>
                    setExcluded((before) => {
                      const next = new Set(before);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      return next;
                    })
                  }
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="font-semibold">{message.sender}</span>
                  <span className="block text-xs text-[#5C5872]">
                    {messageDay(message.sent_at)} {messageTime(message.sent_at)}
                  </span>
                  <span className="mt-1 block whitespace-pre-wrap break-words">{message.body}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              className="mt-1 h-5 w-5 shrink-0"
              type="checkbox"
              disabled={busy}
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            গ্রুপের সম্মতি আছে। নির্বাচিত বার্তাগুলো মেসের বর্তমান ও ভবিষ্যৎ সদস্যদের দেখানো যাবে।
          </label>
          <button
            className={button}
            disabled={busy || !consent || !name.trim() || excluded.size === preview.length}
            onClick={() => void save()}
          >
            {busy ? "যোগ হচ্ছে…" : `${preview.length - excluded.size}টি বার্তা যোগ করুন`}
          </button>
        </>
      )}
    </div>
  );
}

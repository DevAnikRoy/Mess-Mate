"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Avatar } from "./avatar";
import { explain } from "@/lib/errors";
import { type MealMark, SLOTS } from "@/lib/model";
import { greetingName } from "@/lib/profile";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

export function SlotPicker({ value, onChange }: { value: MealMark; onChange: (next: MealMark) => void }) {
  const on = SLOTS.filter((slot) => value[slot.key]).length;
  return (
    <div className="grid grid-cols-3 gap-2">
      {SLOTS.map((slot) => {
        const active = value[slot.key];
        const locked = active && on === 1;
        return (
          <button
            key={slot.key}
            type="button"
            aria-pressed={active}
            disabled={locked}
            title={locked ? "অন্তত একটি বেলা চালু রাখতে হবে" : undefined}
            onClick={() => onChange({ ...value, [slot.key]: !active })}
            className={`rounded-2xl border px-3 py-3 text-left transition ${active ? "border-[#6C4DFF] bg-[#F1EAFF]" : "border-[#EEE8F8] bg-white"} disabled:cursor-not-allowed`}
          >
            <span className={`block text-sm font-semibold ${active ? "text-[#6C4DFF]" : "text-[#5C5872]"}`}>{slot.label}</span>
            <span className="mt-0.5 block text-xs text-[#8E8AA3]">{slot.weight} মিল</span>
          </button>
        );
      })}
    </div>
  );
}

export function normalizeCode(raw: string) {
  const fromLink = raw.match(/join\/([A-Za-z0-9]+)/);
  return (fromLink ? fromLink[1] : raw).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);
}

type Preview = { name: string; members: number } | null;

export function JoinBox({ initialCode = "", autoFocus = false }: { initialCode?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [preview, setPreview] = useState<Preview>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (code.length < 6) return;
    let alive = true;
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      if (!supabase) return;
      setChecking(true);
      const { data, error: rpcError } = await supabase.rpc("invite_preview", { p_code: code });
      if (!alive) return;
      setChecking(false);
      const row = Array.isArray(data) ? (data[0] as { name: string; members: number } | undefined) : undefined;
      if (rpcError || !row) {
        setPreview(null);
        setError("এই কোডে কোনো মেস পাওয়া যায়নি।");
      } else {
        setPreview(row);
        setError("");
      }
    }, 350);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [code]);

  async function join(event: FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || code.length < 6) return;
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("join_mess", { p_code: code });
    if (rpcError) {
      setError(explain(rpcError));
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={join} className="space-y-3">
      <input
        value={code}
        onChange={(event) => {
          setCode(normalizeCode(event.target.value));
          setPreview(null);
          setError("");
        }}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="যেমন: 7F3A9C21"
        aria-label="ইনভাইট কোড"
        className="h-14 w-full rounded-2xl bg-[#F6F4FB] px-4 text-center font-mono text-lg tracking-[0.3em] outline-none placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
      />
      {preview && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#E9FBE8] px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-lg">🏠</span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{preview.name}</p>
            <p className="text-xs text-[#4D6B4A]">{preview.members} জন সদস্য আছেন</p>
          </div>
        </div>
      )}
      {checking && !preview && <p className="text-sm text-[#8E8AA3]">মেস খোঁজা হচ্ছে…</p>}
      {error && <p className="text-sm text-[#E11D48]">{error}</p>}
      <button
        className="h-12 w-full rounded-2xl bg-[#17171C] text-sm font-semibold text-white disabled:opacity-50"
        disabled={busy || !preview}
        type="submit"
      >
        {busy ? "যোগ দেওয়া হচ্ছে…" : preview ? `${preview.name}-এ যোগ দিন` : "যোগ দিন"}
      </button>
    </form>
  );
}

export function Onboarding() {
  const session = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [slots, setSlots] = useState<MealMark>({ b: true, l: true, d: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("মেসের একটা নাম দিন।");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("create_mess", {
      p_name: trimmed,
      p_breakfast: slots.b,
      p_lunch: slots.l,
      p_dinner: slots.d,
    });
    if (rpcError) {
      setError(explain(rpcError));
      setBusy(false);
      return;
    }
    router.replace("/mess?welcome=1");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-[#E9E1FF] px-4 py-8 lg:py-14">
      <div className="mx-auto w-full max-w-[480px]">
        <div className="flex items-center justify-between">
          <p className="text-[26px] font-bold tracking-tight">মেসমেট</p>
          <Link href="/account" className="block h-10 w-10 overflow-hidden rounded-full" aria-label="প্রোফাইল">
            <Avatar name={session?.name ?? "স"} src={session?.avatarUrl ?? null} className="h-10 w-10 rounded-full text-sm" />
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(60,30,120,0.08)]">
          <div className="bg-[linear-gradient(135deg,#6C4DFF_0%,#9B7BFF_55%,#C9B8FF_100%)] px-6 pb-7 pt-6 text-white">
            <p className="text-sm text-white/80">স্বাগতম{session ? `, ${greetingName(session.name)}` : ""}</p>
            <h1 className="mt-1 text-2xl font-bold leading-snug">আপনার মেসের হিসাব শুরু করুন</h1>
            <p className="mt-2 text-sm leading-6 text-white/80">নিজে মেস খুলে ম্যানেজার হন, অথবা ম্যানেজারের দেওয়া কোড দিয়ে যোগ দিন।</p>
          </div>

          <div className="px-6 pb-7 pt-5">
            <div className="grid grid-cols-2 rounded-full bg-[#F6F4FB] p-1 text-sm">
              <button
                className={`rounded-full py-2.5 ${mode === "create" ? "bg-white font-semibold text-[#6C4DFF] shadow-sm" : "text-[#8E8AA3]"}`}
                onClick={() => setMode("create")}
                type="button"
              >
                নতুন মেস খুলুন
              </button>
              <button
                className={`rounded-full py-2.5 ${mode === "join" ? "bg-white font-semibold text-[#6C4DFF] shadow-sm" : "text-[#8E8AA3]"}`}
                onClick={() => setMode("join")}
                type="button"
              >
                কোড দিয়ে যোগ দিন
              </button>
            </div>

            {mode === "create" ? (
              <form onSubmit={create} className="mt-6 space-y-5">
                <label className="block">
                  <span className="text-sm font-medium">মেসের নাম</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value.slice(0, 60))}
                    placeholder="যেমন: শান্তিনগর বয়েজ মেস"
                    className="mt-2 h-12 w-full rounded-2xl bg-[#F6F4FB] px-4 text-sm outline-none"
                  />
                </label>
                <div>
                  <p className="text-sm font-medium">কোন কোন বেলা রান্না হয়?</p>
                  <p className="mb-3 mt-1 text-xs text-[#8E8AA3]">পরে মেস সেটিংস থেকে বদলানো যাবে।</p>
                  <SlotPicker value={slots} onChange={setSlots} />
                </div>
                <div className="rounded-2xl bg-[#F7F4FF] px-4 py-3 text-xs leading-5 text-[#5C5872]">
                  আপনি হবেন এই মেসের ম্যানেজার। মেস খোলার পর একটা ইনভাইট কোড পাবেন, সেটা সদস্যদের পাঠালেই তারা যুক্ত হতে পারবে।
                </div>
                {error && <p className="text-sm text-[#E11D48]">{error}</p>}
                <button className="h-12 w-full rounded-2xl bg-[#6C4DFF] text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">
                  {busy ? "মেস খোলা হচ্ছে…" : "মেস খুলুন"}
                </button>
              </form>
            ) : (
              <div className="mt-6">
                <p className="mb-3 text-sm text-[#5C5872]">ম্যানেজারের কাছ থেকে পাওয়া ৮ অক্ষরের কোড বা লিংক বসান।</p>
                <JoinBox autoFocus />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { useSession } from "@/lib/session";
import { useMaybeMess } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const session = useSession();
  const store = useMaybeMess();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(session?.name ?? "");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  async function leave() {
    setBusy(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function rename() {
    const trimmed = name.trim().slice(0, 60);
    const supabase = createClient();
    if (!supabase || !session) return;
    if (!trimmed) return setError("নাম খালি রাখা যাবে না।");
    setBusy(true);
    setError("");
    setSaved("");
    const [{ error: profileError }] = await Promise.all([
      supabase.from("profiles").update({ full_name: trimmed, updated_at: new Date().toISOString() }).eq("id", session.id),
      supabase.auth.updateUser({ data: { full_name: trimmed } }),
    ]);
    setBusy(false);
    if (profileError) return setError("নাম সেভ করা যায়নি। আবার চেষ্টা করুন।");
    setSaved("নাম সেভ হয়েছে।");
    router.refresh();
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-lg rounded-[28px] bg-[#F7F4FF] p-6">
        <h1 className="text-xl font-semibold">প্রোফাইল</h1>
        <p className="mt-2 text-sm leading-6 text-[#5C5872]">প্রোফাইল দেখতে আগে ঢুকুন।</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-[#6C4DFF]">
          ঢুকুন
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-lg rounded-[28px] bg-white p-6">
      <Avatar name={session.name} src={session.avatarUrl} className="h-24 w-24 rounded-full text-3xl" />
      <h1 className="mt-4 text-2xl font-semibold">{session.name}</h1>
      <p className="mt-1 text-sm text-[#8E8AA3]">{session.email}</p>
      <p className="mt-3 inline-flex rounded-full bg-[#F1EAFF] px-3 py-1 text-xs font-semibold text-[#6C4DFF]">
        {session.provider === "google" ? "গুগল" : "ইমেইল"}
      </p>

      <label className="mt-6 block">
        <span className="text-sm text-[#5C5872]">মেসে যে নামে দেখাবে</span>
        <input
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl bg-[#F6F4FB] px-4 text-sm outline-none"
        />
      </label>
      {error && <p className="mt-2 text-sm text-[#E11D48]">{error}</p>}
      {saved && <p className="mt-2 text-sm text-[#128A4A]">{saved}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="h-11 rounded-2xl bg-[#6C4DFF] px-5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy || !name.trim() || name.trim() === session.name}
          onClick={rename}
          type="button"
        >
          নাম সেভ
        </button>
        {!store && (
          <Link href="/onboarding" className="flex h-11 items-center rounded-2xl bg-[#F1EAFF] px-5 text-sm font-semibold text-[#6C4DFF]">
            মেস খুলুন বা যোগ দিন
          </Link>
        )}
        <button
          className="h-11 rounded-2xl bg-[#17171C] px-5 text-sm font-semibold text-white disabled:opacity-60"
          disabled={busy}
          onClick={leave}
          type="button"
        >
          বের হন
        </button>
      </div>
    </section>
  );
}

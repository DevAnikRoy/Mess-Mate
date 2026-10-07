"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Avatar } from "./avatar";
import { IconCopy } from "./icons";
import { SlotPicker } from "./onboarding";
import { dateLabel } from "@/lib/dates";
import { explain } from "@/lib/errors";
import type { MealMark, Member } from "@/lib/model";
import { useMess } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

export function MessSettings() {
  const { mess, members, me, isManager, say } = useMess();
  const router = useRouter();
  const welcome = useSearchParams().get("welcome") === "1";
  const [code, setCode] = useState(mess.inviteCode);
  const [name, setName] = useState(mess.name);
  const [slots, setSlots] = useState<MealMark>(mess.slots);
  const [busy, setBusy] = useState<string | null>(null);
  const active = members.filter((member) => !member.leftOn);
  const former = members.filter((member) => member.leftOn);
  const link = typeof window === "undefined" ? `/join/${code}` : `${window.location.origin}/join/${code}`;
  const dirty = name.trim() !== mess.name || slots.b !== mess.slots.b || slots.l !== mess.slots.l || slots.d !== mess.slots.d;

  async function call(key: string, run: () => PromiseLike<{ error: { message: string; code?: string } | null }>, done?: string) {
    setBusy(key);
    const { error } = await run();
    setBusy(null);
    if (error) {
      say(explain(error));
      return false;
    }
    if (done) say(done);
    return true;
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      say("কপি হয়েছে।");
    } catch {
      say("কপি করা যায়নি, নিজে সিলেক্ট করে কপি করুন।");
    }
  }

  async function share() {
    const text = `${mess.name} মেসে যোগ দিতে এই লিংকে ঢুকুন: ${link}\nকোড: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "মেসমেট", text });
        return;
      } catch {
        return;
      }
    }
    copy(text);
  }

  async function regenerate() {
    const supabase = createClient();
    if (!supabase) return;
    if (!window.confirm("পুরনো কোড আর কাজ করবে না। নতুন কোড বানাবেন?")) return;
    setBusy("code");
    const { data, error } = await supabase.rpc("regenerate_invite", { p_mess: mess.id });
    setBusy(null);
    if (error) return say(explain(error));
    setCode(String(data));
    say("নতুন কোড তৈরি হয়েছে।");
  }

  async function save() {
    const supabase = createClient();
    if (!supabase) return;
    const trimmed = name.trim();
    if (!trimmed) return say("মেসের নাম খালি রাখা যাবে না।");
    const ok = await call(
      "save",
      () => supabase.from("messes").update({ name: trimmed, breakfast: slots.b, lunch: slots.l, dinner: slots.d }).eq("id", mess.id),
      "মেসের তথ্য সেভ হয়েছে।",
    );
    if (ok) router.refresh();
  }

  async function makeManager(member: Member) {
    const supabase = createClient();
    if (!supabase) return;
    if (!window.confirm(`${member.name} কে ম্যানেজার বানাবেন? আপনি সাধারণ সদস্য হয়ে যাবেন।`)) return;
    const ok = await call(`m-${member.id}`, () => supabase.rpc("transfer_manager", { p_mess: mess.id, p_user: member.id }), "ম্যানেজার বদল হয়েছে।");
    if (ok) router.refresh();
  }

  async function remove(member: Member) {
    const supabase = createClient();
    if (!supabase) return;
    if (!window.confirm(`${member.name} কে মেস থেকে বাদ দেবেন? তার আগের হিসাব রিপোর্টে থেকে যাবে।`)) return;
    const ok = await call(`r-${member.id}`, () => supabase.rpc("remove_member", { p_mess: mess.id, p_user: member.id }), "সদস্য বাদ দেওয়া হয়েছে।");
    if (ok) router.refresh();
  }

  async function leave() {
    const supabase = createClient();
    if (!supabase) return;
    if (!window.confirm("মেস ছেড়ে দেবেন? আপনার আগের হিসাব রিপোর্টে থেকে যাবে।")) return;
    const ok = await call("leave", () => supabase.rpc("leave_mess", { p_mess: mess.id }));
    if (!ok) return;
    router.replace("/onboarding");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-xs font-medium text-[#8E8AA3]">মেস ও সদস্য</p>
        <h1 className="text-2xl font-bold tracking-tight">{mess.name}</h1>
      </div>

      {welcome && isManager && (
        <div className="rounded-[24px] bg-[#E9FBE8] px-5 py-4">
          <p className="font-semibold">মেস খোলা হয়েছে 🎉</p>
          <p className="mt-1 text-sm leading-6 text-[#4D6B4A]">নিচের লিংক বা কোড সদস্যদের পাঠান। তারা নিজের গুগল বা ইমেইল দিয়ে ঢুকে যোগ দেবে।</p>
        </div>
      )}

      {isManager && (
        <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#6C4DFF_0%,#9B7BFF_60%,#C9B8FF_100%)] p-5 text-white">
          <p className="text-sm text-white/80">ইনভাইট কোড</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-mono text-3xl font-bold tracking-[0.25em]">{code}</p>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/20" onClick={() => copy(code)} type="button" aria-label="কোড কপি">
              <IconCopy className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-3 break-all rounded-2xl bg-white/15 px-3 py-2 text-xs">{link}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="h-11 rounded-2xl bg-white px-4 text-sm font-semibold text-[#6C4DFF]" onClick={share} type="button">
              লিংক পাঠান
            </button>
            <button className="h-11 rounded-2xl bg-white/20 px-4 text-sm font-semibold" onClick={() => copy(link)} type="button">
              লিংক কপি
            </button>
            <button className="h-11 rounded-2xl bg-white/10 px-4 text-sm disabled:opacity-60" disabled={busy === "code"} onClick={regenerate} type="button">
              নতুন কোড
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-[#F3EEF9] p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">সদস্য ({active.length} জন)</h2>
          {!isManager && <span className="text-xs text-[#8E8AA3]">কোড লাগলে ম্যানেজারকে বলুন</span>}
        </div>
        <ul className="mt-3 divide-y divide-[#F3EEF9]">
          {active.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={member.name} src={member.avatarUrl} className="h-11 w-11 rounded-full text-sm" />
              <Link href={`/members/${member.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {member.name}
                  {member.id === me.id && <span className="ml-1 text-xs font-normal text-[#8E8AA3]">(আপনি)</span>}
                </p>
                <p className="text-xs text-[#8E8AA3]">
                  {member.role === "manager" ? "ম্যানেজার" : "সদস্য"} · {dateLabel(member.joinedOn)} থেকে
                </p>
              </Link>
              {isManager && member.id !== me.id && (
                <div className="flex gap-2">
                  <button className="h-9 rounded-xl bg-[#F1EAFF] px-3 text-xs font-semibold text-[#6C4DFF] disabled:opacity-60" disabled={busy !== null} onClick={() => makeManager(member)} type="button">
                    ম্যানেজার বানান
                  </button>
                  <button className="h-9 rounded-xl bg-[#FFE4EA] px-3 text-xs font-semibold text-[#E11D48] disabled:opacity-60" disabled={busy !== null} onClick={() => remove(member)} type="button">
                    বাদ দিন
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {former.length > 0 && (
          <p className="mt-2 text-xs text-[#8E8AA3]">আগের সদস্য: {former.map((member) => member.name).join(", ")}</p>
        )}
      </section>

      {isManager && (
        <section className="rounded-[28px] border border-[#F3EEF9] p-5">
          <h2 className="font-semibold">মেস সেটিংস</h2>
          <label className="mt-4 block">
            <span className="text-sm text-[#5C5872]">মেসের নাম</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 60))}
              className="mt-2 h-12 w-full rounded-2xl bg-[#F6F4FB] px-4 text-sm outline-none"
            />
          </label>
          <p className="mb-3 mt-5 text-sm text-[#5C5872]">যে বেলাগুলোতে রান্না হয়</p>
          <SlotPicker value={slots} onChange={setSlots} />
          <button
            className="mt-5 h-11 rounded-2xl bg-[#6C4DFF] px-5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!dirty || busy === "save"}
            onClick={save}
            type="button"
          >
            {busy === "save" ? "সেভ হচ্ছে…" : "সেভ করুন"}
          </button>
        </section>
      )}

      <section className="rounded-[28px] bg-[#FFF7F5] p-5">
        <h2 className="font-semibold">মেস ছাড়ুন</h2>
        <p className="mt-1 text-sm leading-6 text-[#8E8AA3]">
          {isManager
            ? active.length > 1
              ? "ম্যানেজার মেস ছাড়তে পারেন না। আগে অন্য কাউকে ম্যানেজার বানান।"
              : "আপনি একাই আছেন। মেস ছাড়তে হলে আগে আরেকজনকে যুক্ত করে ম্যানেজার বানান।"
            : "ছেড়ে দিলে নতুন কিছু লিখতে পারবেন না, তবে আগের হিসাব রিপোর্টে থেকে যাবে।"}
        </p>
        {!isManager && (
          <button className="mt-4 h-11 rounded-2xl bg-[#17171C] px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={busy === "leave"} onClick={leave} type="button">
            মেস ছাড়ুন
          </button>
        )}
      </section>
    </div>
  );
}

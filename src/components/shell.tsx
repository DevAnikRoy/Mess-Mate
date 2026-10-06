"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { IconBag, IconBell, IconBill, IconDuty, IconHome, IconLogout, IconMeal, IconReport, IconSearch } from "./icons";
import { Avatar } from "./avatar";
import { CURRENT_USER, MESS_NAME, memberById, members, TODAY, upcomingDuty } from "@/lib/model";
import { greetingName } from "@/lib/profile";
import { useSession } from "@/lib/session";
import { useMess } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "ড্যাশবোর্ড", icon: IconHome },
  { href: "/meals", label: "মিল", icon: IconMeal },
  { href: "/bazaar", label: "বাজার", icon: IconBag },
  { href: "/bills", label: "ঘরের খরচ", icon: IconBill },
  { href: "/report", label: "রিপোর্ট", icon: IconReport },
  { href: "/duties", label: "ডিউটি", icon: IconDuty },
];

const mobile = [
  { href: "/", label: "হোম", icon: IconHome },
  { href: "/meals", label: "মিল", icon: IconMeal },
  { href: "/bazaar", label: "বাজার", icon: IconBag },
  { href: "/report", label: "রিপোর্ট", icon: IconReport },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const session = useSession();
  const { state } = useMess();
  const [query, setQuery] = useState("");
  const [openNotes, setOpenNotes] = useState(false);
  const [more, setMore] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const nextDuty = upcomingDuty(state);
  const me = memberById(CURRENT_USER);
  const hello = session ? greetingName(session.name) : me.short;

  async function leave() {
    setLeaving(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const markedToday = Boolean(state.meals[`${CURRENT_USER}|${TODAY}`]) || state.kitchenClosed.includes(TODAY);

  const notes = useMemo(() => {
    const items = [
      state.approved
        ? "সেপ্টেম্বরের রিপোর্ট ম্যানেজার অ্যাপ্রুভ করেছেন। হিসাব মিটিয়ে নিন।"
        : "সেপ্টেম্বরের রিপোর্ট তৈরি হয়েছে। ম্যানেজার এখনো অ্যাপ্রুভ করেননি।",
    ];
    if (!markedToday) items.push("আজকের মিল এখনো দেননি। রাত ১২টার পর এই দিন বন্ধ হয়ে যাবে।");
    if (nextDuty && nextDuty.memberId === CURRENT_USER) items.push(`${nextDuty.date.slice(8)} তারিখে আপনার ${nextDuty.name}।`);
    return items;
  }, [markedToday, nextDuty, state.approved]);

  const hits = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const people = members.filter((member) => member.name.includes(q) || member.short.includes(q));
    const shops = state.bazaar.filter((row) => row.note.includes(q) || row.amount.toString().includes(q)).slice(0, 4);
    return { people, shops };
  }, [query, state.bazaar]);

  if (path === "/login" || path.startsWith("/auth")) return children;

  return (
    <div className="min-h-dvh bg-[#E9E1FF] lg:p-5">
      <div className="mx-auto flex min-h-dvh max-w-[1440px] bg-white lg:min-h-[calc(100dvh-40px)] lg:rounded-[32px]">
        <aside className="sticky top-5 hidden h-[calc(100dvh-40px)] w-[272px] shrink-0 flex-col overflow-y-auto border-r border-[#F3EEF9] px-5 py-7 lg:flex">
          <Link href="/" className="px-2 text-[26px] font-bold tracking-tight">
            মেসমেট
          </Link>
          <p className="mt-8 px-2 text-xs text-[#8E8AA3]">প্যানেল</p>
          <nav className="mt-3 space-y-1">
            {nav.map((item) => {
              const active = path === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] ${active ? "bg-[#F1EAFF] font-semibold text-[#6C4DFF]" : "text-[#5C5872] hover:bg-[#FAF8FF]"}`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-3xl bg-[#E9FBE8] p-4">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-white text-lg">✦</div>
            <p className="text-sm font-semibold">{nextDuty?.date === TODAY ? "আজকের পালা" : "পরের পালা"}</p>
            <p className="mt-1 text-xs leading-5 text-[#4D6B4A]">
              {nextDuty
                ? `${memberById(nextDuty.memberId).name}, ${Number(nextDuty.date.slice(8))} তারিখে ${nextDuty.name}। দুই দিন আগে থেকে বারো ঘণ্টা পরপর নোটিস।`
                : "এই মাসে আর ডিউটি বাকি নেই।"}
            </p>
          </div>
          <button className="mt-4 flex items-center gap-3 px-3 py-2 text-sm text-[#5C5872] disabled:opacity-60" disabled={leaving} onClick={leave} type="button">
            <IconLogout className="h-5 w-5" />
            বের হন
          </button>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-8">
          <header className="flex items-center gap-3 px-4 pt-4 lg:px-8 lg:pt-6">
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold lg:text-xl">হ্যালো {hello},</p>
              <p className="text-xs text-[#8E8AA3] lg:hidden">২ অক্টোবর · {MESS_NAME}</p>
            </div>
            <label className="relative hidden w-[320px] lg:block">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8AA3]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="সদস্য, বাজার বা বিল খুঁজুন"
                className="h-11 w-full rounded-full bg-[#F6F4FB] pl-10 pr-4 text-sm outline-none"
              />
              {query && hits && "people" in hits && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[#F0EAF8] bg-white p-2">
                  {hits.people.map((member) => (
                    <button key={member.id} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#F7F4FF]" onClick={() => { setQuery(""); router.push(`/members/${member.id}`); }} type="button">
                      {member.name}
                    </button>
                  ))}
                  {hits.shops.map((row) => (
                    <button key={row.id} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#F7F4FF]" onClick={() => { setQuery(""); router.push("/bazaar"); }} type="button">
                      {row.note.split("\n")[0]} · ৳{row.amount.toLocaleString("en-IN")}
                    </button>
                  ))}
                  {!hits.people.length && !hits.shops.length && <p className="px-3 py-2 text-sm text-[#8E8AA3]">কিছু মেলেনি</p>}
                </div>
              )}
            </label>
            <button className="relative grid h-11 w-11 place-items-center rounded-full bg-[#F6F4FB]" onClick={() => setOpenNotes((value) => !value)} type="button" aria-label="নোটিস">
              <IconBell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#6C4DFF]" />
            </button>
            <Link href={session ? "/account" : `/members/${CURRENT_USER}`} className="block h-11 w-11 overflow-hidden rounded-full" aria-label="প্রোফাইল">
              <Avatar name={session?.name ?? me.short} src={session?.avatarUrl ?? null} className="h-11 w-11 rounded-full text-sm" />
            </Link>
          </header>
          {openNotes && (
            <div className="mx-4 mt-3 rounded-2xl bg-[#F7F4FF] p-3 lg:mx-8">
              {notes.map((note) => (
                <p key={note} className="border-b border-[#E8E0F4] py-2 text-sm last:border-0">
                  {note}
                </p>
              ))}
            </div>
          )}
          <div className="px-4 py-4 lg:px-8 lg:py-6">{children}</div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E7E0F4] bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between">
          {mobile.map((item) => {
            const active = path === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${active ? "font-semibold text-[#6C4DFF]" : "text-[#8E8AA3]"}`}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${more ? "font-semibold text-[#6C4DFF]" : "text-[#8E8AA3]"}`} onClick={() => setMore((value) => !value)} type="button">
            <IconBill className="h-5 w-5" />
            আরও
          </button>
        </div>
      </nav>
      {more && (
        <div className="fixed inset-x-3 bottom-20 z-30 rounded-3xl bg-white p-3 shadow-[0_12px_40px_rgba(40,20,80,0.12)] lg:hidden">
          <Link href="/bills" onClick={() => setMore(false)} className="block rounded-2xl px-3 py-3 text-sm hover:bg-[#F7F4FF]">ঘরের খরচ</Link>
          <Link href="/duties" onClick={() => setMore(false)} className="block rounded-2xl px-3 py-3 text-sm hover:bg-[#F7F4FF]">ডিউটি</Link>
          <Link href="/account" onClick={() => setMore(false)} className="block rounded-2xl px-3 py-3 text-sm hover:bg-[#F7F4FF]">প্রোফাইল</Link>
          <button className="block w-full rounded-2xl px-3 py-3 text-left text-sm hover:bg-[#F7F4FF] disabled:opacity-60" disabled={leaving} onClick={leave} type="button">বের হন</button>
        </div>
      )}
    </div>
  );
}

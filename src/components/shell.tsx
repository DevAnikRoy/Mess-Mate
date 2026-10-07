"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconBag, IconBell, IconBill, IconDuty, IconHome, IconLogout, IconMeal, IconReport, IconSearch, IconUsers } from "./icons";
import { Avatar } from "./avatar";
import { addMonths, dateLabel, monthName, monthOf } from "@/lib/dates";
import { mealKey, upcomingDuty } from "@/lib/model";
import { greetingName } from "@/lib/profile";
import { useSession } from "@/lib/session";
import { useMaybeMess, useMess } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "ড্যাশবোর্ড", icon: IconHome },
  { href: "/meals", label: "মিল", icon: IconMeal },
  { href: "/bazaar", label: "বাজার", icon: IconBag },
  { href: "/bills", label: "ঘরের খরচ", icon: IconBill },
  { href: "/report", label: "রিপোর্ট", icon: IconReport },
  { href: "/duties", label: "ডিউটি", icon: IconDuty },
  { href: "/mess", label: "মেস ও সদস্য", icon: IconUsers },
];

const mobile = [
  { href: "/", label: "হোম", icon: IconHome },
  { href: "/meals", label: "মিল", icon: IconMeal },
  { href: "/bazaar", label: "বাজার", icon: IconBag },
  { href: "/report", label: "রিপোর্ট", icon: IconReport },
];

const bare = (path: string) => path === "/login" || path.startsWith("/auth") || path === "/onboarding" || path.startsWith("/join");

function useSignOut() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  async function leave() {
    setLeaving(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return { leaving, leave };
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const store = useMaybeMess();
  if (bare(path)) return children;
  if (!store) {
    return (
      <div className="min-h-dvh bg-[#E9E1FF] px-4 py-6 lg:p-10">
        <div className="mx-auto max-w-lg">
          <Link href="/onboarding" className="mb-5 block text-[26px] font-bold tracking-tight">
            মেসমেট
          </Link>
          {path === "/account" ? (
            children
          ) : (
            <div className="rounded-[28px] bg-white p-6 text-center">
              <p className="font-semibold">মেস খোঁজা হচ্ছে…</p>
              <p className="mt-1 text-sm text-[#8E8AA3]">একটু অপেক্ষা করুন। না এলে নিচের লিংক থেকে মেস খুলুন বা যোগ দিন।</p>
              <Link href="/onboarding" className="mt-4 inline-block text-sm font-semibold text-[#6C4DFF]">
                মেস খুলুন বা যোগ দিন
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }
  return <Chrome>{children}</Chrome>;
}

function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const session = useSession();
  const { state, mess, me, members, activeMembers, today, months, isManager, ready, failed, retry, notice, clearNotice, memberById } = useMess();
  const { leaving, leave } = useSignOut();
  const [query, setQuery] = useState("");
  const [openNotes, setOpenNotes] = useState(false);
  const [more, setMore] = useState(false);
  const nextDuty = upcomingDuty(state, today);
  const hello = greetingName(session?.name ?? me.name);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clearNotice, 4500);
    return () => window.clearTimeout(timer);
  }, [notice, clearNotice]);

  const notes = useMemo(() => {
    if (!ready) return [];
    const items: { text: string; href: string }[] = [];
    const closed = state.kitchenClosed.includes(today);
    if (!closed && !state.meals[mealKey(me.id, today)]) {
      items.push({ text: "আজকের মিল এখনো দেননি। রাত ১২টার পর এই দিন বন্ধ হয়ে যাবে।", href: "/meals" });
    }
    const previous = addMonths(monthOf(today), -1);
    if (months.includes(previous)) {
      items.push(
        state.approvals.includes(previous)
          ? { text: `${monthName(previous)} মাসের রিপোর্ট ম্যানেজার অ্যাপ্রুভ করেছেন। হিসাব মিটিয়ে নিন।`, href: "/report" }
          : { text: `${monthName(previous)} মাসের রিপোর্ট তৈরি। ম্যানেজার এখনো অ্যাপ্রুভ করেননি।`, href: "/report" },
      );
    }
    if (nextDuty && nextDuty.memberId === me.id) {
      items.push({ text: `${dateLabel(nextDuty.date)} আপনার ${nextDuty.name}।`, href: "/duties" });
    }
    if (isManager && activeMembers.length < 2) {
      items.push({ text: "মেসে এখনো আপনি একা। ইনভাইট কোড দিয়ে সদস্যদের যুক্ত করুন।", href: "/mess" });
    }
    return items;
  }, [activeMembers.length, isManager, me.id, months, nextDuty, ready, state.approvals, state.kitchenClosed, state.meals, today]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const people = members.filter((member) => member.name.toLowerCase().includes(q));
    const shops = state.bazaar.filter((row) => row.note.toLowerCase().includes(q) || row.amount.toString().includes(q)).slice(0, 4);
    const bills = state.bills.filter((row) => row.title.toLowerCase().includes(q) || row.amount.toString().includes(q)).slice(0, 3);
    return { people, shops, bills };
  }, [members, query, state.bazaar, state.bills]);

  const dutyMember = nextDuty ? memberById(nextDuty.memberId) : undefined;

  return (
    <div className="min-h-dvh bg-[#E9E1FF] lg:p-5">
      <div className="mx-auto flex min-h-dvh max-w-[1440px] bg-white lg:min-h-[calc(100dvh-40px)] lg:rounded-[32px]">
        <aside className="sticky top-5 hidden h-[calc(100dvh-40px)] w-[272px] shrink-0 flex-col overflow-y-auto border-r border-[#F3EEF9] px-5 py-7 lg:flex">
          <Link href="/" className="px-2 text-[26px] font-bold tracking-tight">
            মেসমেট
          </Link>
          <p className="mt-2 truncate px-2 text-sm text-[#8E8AA3]">{mess.name}</p>
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
            <p className="text-sm font-semibold">{nextDuty?.date === today ? "আজকের পালা" : "পরের পালা"}</p>
            <p className="mt-1 text-xs leading-5 text-[#4D6B4A]">
              {nextDuty && dutyMember
                ? `${dutyMember.name}, ${dateLabel(nextDuty.date)} ${nextDuty.name}।`
                : "সামনে কোনো ডিউটি ঠিক করা নেই।"}
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
              <p className="truncate text-xs text-[#8E8AA3] lg:hidden">
                {dateLabel(today)} · {mess.name}
              </p>
            </div>
            <label className="relative hidden w-[320px] lg:block">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8AA3]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="সদস্য, বাজার বা বিল খুঁজুন"
                className="h-11 w-full rounded-full bg-[#F6F4FB] pl-10 pr-4 text-sm outline-none"
              />
              {hits && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[#F0EAF8] bg-white p-2 shadow-[0_12px_40px_rgba(40,20,80,0.08)]">
                  {hits.people.map((member) => (
                    <button key={member.id} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#F7F4FF]" onClick={() => { setQuery(""); router.push(`/members/${member.id}`); }} type="button">
                      {member.name}
                    </button>
                  ))}
                  {hits.shops.map((row) => (
                    <button key={row.id} className="block w-full truncate rounded-xl px-3 py-2 text-left text-sm hover:bg-[#F7F4FF]" onClick={() => { setQuery(""); router.push("/bazaar"); }} type="button">
                      বাজার · {row.note.split("\n")[0]} · ৳{row.amount.toLocaleString("en-IN")}
                    </button>
                  ))}
                  {hits.bills.map((row) => (
                    <button key={row.id} className="block w-full truncate rounded-xl px-3 py-2 text-left text-sm hover:bg-[#F7F4FF]" onClick={() => { setQuery(""); router.push("/bills"); }} type="button">
                      খরচ · {row.title} · ৳{row.amount.toLocaleString("en-IN")}
                    </button>
                  ))}
                  {!hits.people.length && !hits.shops.length && !hits.bills.length && <p className="px-3 py-2 text-sm text-[#8E8AA3]">কিছু মেলেনি</p>}
                </div>
              )}
            </label>
            <button className="relative grid h-11 w-11 place-items-center rounded-full bg-[#F6F4FB]" onClick={() => setOpenNotes((value) => !value)} type="button" aria-label="নোটিস">
              <IconBell className="h-5 w-5" />
              {notes.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#6C4DFF]" />}
            </button>
            <Link href="/account" className="block h-11 w-11 overflow-hidden rounded-full" aria-label="প্রোফাইল">
              <Avatar name={session?.name ?? me.name} src={session?.avatarUrl ?? me.avatarUrl} className="h-11 w-11 rounded-full text-sm" />
            </Link>
          </header>
          {openNotes && (
            <div className="mx-4 mt-3 rounded-2xl bg-[#F7F4FF] p-3 lg:mx-8">
              {notes.length ? (
                notes.map((note) => (
                  <Link key={note.text} href={note.href} onClick={() => setOpenNotes(false)} className="block border-b border-[#E8E0F4] py-2 text-sm last:border-0">
                    {note.text}
                  </Link>
                ))
              ) : (
                <p className="py-2 text-sm text-[#8E8AA3]">নতুন কোনো নোটিস নেই।</p>
              )}
            </div>
          )}
          <div className="px-4 py-4 lg:px-8 lg:py-6">
            {failed ? (
              <div className="mx-auto max-w-md rounded-[28px] bg-[#FFF4F0] p-6 text-center">
                <p className="font-semibold">হিসাব আনা যায়নি</p>
                <p className="mt-1 text-sm text-[#8E8AA3]">ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
                <button className="mt-4 h-11 rounded-2xl bg-[#6C4DFF] px-5 text-sm font-semibold text-white" onClick={retry} type="button">
                  আবার চেষ্টা
                </button>
              </div>
            ) : ready ? (
              children
            ) : (
              <Loading />
            )}
          </div>
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
          <Link href="/mess" onClick={() => setMore(false)} className="block rounded-2xl px-3 py-3 text-sm hover:bg-[#F7F4FF]">মেস ও সদস্য</Link>
          <Link href="/account" onClick={() => setMore(false)} className="block rounded-2xl px-3 py-3 text-sm hover:bg-[#F7F4FF]">প্রোফাইল</Link>
          <button className="block w-full rounded-2xl px-3 py-3 text-left text-sm hover:bg-[#F7F4FF] disabled:opacity-60" disabled={leaving} onClick={leave} type="button">বের হন</button>
        </div>
      )}
      {notice && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-2xl bg-[#17171C] px-4 py-3 text-sm text-white shadow-lg lg:bottom-8">
          {notice}
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-40 animate-pulse rounded-[28px] bg-[#F4F0FC]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-[28px] bg-[#F7F4FF]" />
        <div className="h-28 animate-pulse rounded-[28px] bg-[#F7F4FF]" />
        <div className="h-28 animate-pulse rounded-[28px] bg-[#F7F4FF]" />
      </div>
    </div>
  );
}

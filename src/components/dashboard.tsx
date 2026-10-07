"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MealChart, SlotDonut, Spark } from "./charts";
import { IconArrow } from "./icons";
import { MonthLoading, MonthPicker } from "./month-picker";
import { addMonths, dateLabel, monthLabel, monthName, monthOf } from "@/lib/dates";
import { mealText, taka } from "@/lib/format";
import { markWeight, mealKey, readMark } from "@/lib/model";
import { useMess } from "@/lib/store";

export function Dashboard() {
  const { ledger, month, state, mess, me, isManager, today, months, activeMembers, memberById, monthReady } = useMess();
  const [range, setRange] = useState<"7" | "15" | "all">("all");
  const current = monthOf(today);
  const elapsed = month === current ? Number(today.slice(8, 10)) : ledger.days;
  const days = ledger.daily.slice(0, elapsed);
  const shown = range === "all" ? days : days.slice(range === "7" ? -7 : -15);
  const open = days.filter((day) => !day.closed);
  const peak = Math.max(...open.map((day) => day.meals), 0);
  const low = open.length ? Math.min(...open.map((day) => day.meals)) : 0;
  const avg = open.length ? ledger.totalMeals / open.length : 0;
  const marker = ((avg - low) / Math.max(peak - low, 1)) * 100;
  const mine = ledger.rows.find((row) => row.member.id === me.id);
  const top = [...ledger.rows].sort((a, b) => b.meals - a.meals)[0];
  const previous = addMonths(current, -1);
  const monthBazaar = state.bazaar.filter((row) => row.date.startsWith(month));
  const hasData = ledger.totalMeals > 0 || ledger.totalBazaar > 0 || ledger.totalBills > 0;
  const markedToday = Boolean(state.meals[mealKey(me.id, today)]) || state.kitchenClosed.includes(today);

  const series = useMemo(
    () =>
      Object.fromEntries(
        ledger.rows.map((row) => [row.member.id, days.map((day) => (day.closed ? 0 : markWeight(readMark(state, row.member.id, day.date))))]),
      ) as Record<string, number[]>,
    [days, ledger.rows, state],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[#8E8AA3]">{mess.name}</p>
          <h1 className="text-2xl font-bold tracking-tight">{monthLabel(month)}</h1>
        </div>
        <MonthPicker />
      </div>

      {!monthReady(month) ? <MonthLoading /> : <>

      {month === current && !markedToday && (
        <Link href="/meals" className="flex items-center justify-between gap-3 rounded-[22px] bg-[#6C4DFF] px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">আজকের মিল দিন</p>
            <p className="text-xs text-white/80">রাত ১২টার পর আজকের ঘর বন্ধ হয়ে যাবে।</p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#6C4DFF]">
            <IconArrow className="h-4 w-4" />
          </span>
        </Link>
      )}

      {months.includes(previous) && month === current && (
        <Link href="/report" className="flex items-center justify-between gap-3 rounded-[22px] bg-[#F6F3FF] px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{monthName(previous)} মাসের রিপোর্ট তৈরি হয়েছে</p>
            <p className="text-xs text-[#8E8AA3]">
              {state.approvals.includes(previous) ? "ম্যানেজার অ্যাপ্রুভ করেছেন। এখন হিসাব মিটিয়ে নিন।" : "ম্যানেজার এখনো অ্যাপ্রুভ করেননি।"}
            </p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#6C4DFF] text-white">
            <IconArrow className="h-4 w-4" />
          </span>
        </Link>
      )}

      {isManager && activeMembers.length < 2 && (
        <Link href="/mess" className="flex items-center justify-between gap-3 rounded-[22px] bg-[#E9FBE8] px-4 py-3">
          <div>
            <p className="text-sm font-semibold">সদস্যদের যুক্ত করুন</p>
            <p className="text-xs text-[#4D6B4A]">ইনভাইট কোড বা লিংক পাঠালেই তারা যোগ দিতে পারবে।</p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#128A4A]">
            <IconArrow className="h-4 w-4" />
          </span>
        </Link>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#5C5872]">সদস্যরা</h2>
          <span className="text-xs text-[#8E8AA3]">সবাই সব অঙ্ক দেখতে পারে</span>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-visible">
          {ledger.rows.map((row) => (
            <Link
              key={row.member.id}
              href={`/members/${row.member.id}`}
              className="min-w-[210px] flex-1 rounded-[22px] p-3.5 lg:min-w-0"
              style={{ background: row.member.tint }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{row.member.short}</p>
                  <p className="text-[11px] text-[#5C5872]">
                    {row.member.leftOn ? "মেস ছেড়েছেন" : row.member.role === "manager" ? "ম্যানেজার" : "সদস্য"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold">{mealText(row.meals)} মিল</p>
                  {row.net !== 0 && (
                    <p className={`text-[11px] font-semibold ${row.net > 0 ? "text-[#128A4A]" : "text-[#E11D48]"}`}>{row.net > 0 ? "পাবে" : "দিবে"}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-[#5C5872]">ব্যালেন্স</p>
                  <p className="text-xl font-bold tracking-tight">{taka(Math.abs(row.net))}</p>
                </div>
                <Spark values={series[row.member.id] ?? []} color={row.net >= 0 ? "#128A4A" : "#E11D48"} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {!hasData ? (
        <section className="rounded-[28px] border border-dashed border-[#DCD2F5] p-6">
          <h2 className="text-lg font-semibold">{monthName(month)} মাসের হিসাব এখনো ফাঁকা</h2>
          <p className="mt-1 text-sm text-[#8E8AA3]">মিল আর বাজার লেখা শুরু করলেই এখানে চার্ট আর হিসাব দেখা যাবে।</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Step href="/meals" n="১" title="মিল দিন" text="প্রতিদিন নিজের মিল নিজে দিন।" />
            <Step href="/bazaar" n="২" title="বাজার লিখুন" text="যে বাজার করবে সে লিখে রাখবে।" />
            <Step href="/bills" n="৩" title="ঘরের খরচ" text="ভাড়া, বিদ্যুৎ, গ্যাস, বুয়া।" />
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-3 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <article className="rounded-[24px] border border-[#F3EEF9] p-4">
                <p className="text-sm text-[#8E8AA3]">আমার ব্যালেন্স</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="rounded-2xl bg-[#6C4DFF] px-4 py-3 text-xl font-bold text-white">{taka(Math.abs(mine?.net ?? 0))}</div>
                  {mine && mine.net !== 0 && (
                    <span className={`rounded-xl px-2 py-1 text-xs font-semibold ${mine.net > 0 ? "bg-[#E5F8EC] text-[#128A4A]" : "bg-[#FFE4EA] text-[#E11D48]"}`}>
                      {mine.net > 0 ? "পাবে" : "দিবে"}
                    </span>
                  )}
                </div>
                <p className="mt-4 text-sm text-[#8E8AA3]">আমার বাজার</p>
                <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#17171C] px-4 py-3 text-white">
                  <span className="text-lg font-semibold">{taka(mine?.bazaar ?? 0)}</span>
                  <Link href="/bazaar" className="grid h-9 w-9 place-items-center rounded-xl bg-[#6C4DFF]" aria-label="বাজার">
                    <IconArrow className="h-4 w-4" />
                  </Link>
                </div>
              </article>
              {top && top.meals > 0 && (
                <article className="rounded-[24px] border border-[#F3EEF9] p-4">
                  <p className="text-sm font-semibold">সবচেয়ে বেশি মিল</p>
                  <div className="mt-3 rounded-2xl bg-[#FAF8FF] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{top.member.name}</p>
                      <p className="shrink-0 text-sm font-semibold text-[#6C4DFF]">{mealText(top.meals)} মিল</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[11px] text-[#8E8AA3]">বাজার</p>
                        <p className="font-semibold">{taka(top.bazaar)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#8E8AA3]">খাবার</p>
                        <p className="font-semibold">{taka(top.food)}</p>
                      </div>
                    </div>
                  </div>
                </article>
              )}
            </div>

            <article className="rounded-[24px] border border-[#F3EEF9] p-4 lg:col-span-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">মিলের ধারা</h2>
                <div className="flex rounded-full bg-[#F6F4FB] p-1 text-xs">
                  {([["7", "৭ দিন"], ["15", "১৫ দিন"], ["all", "পুরো মাস"]] as const).map(([key, label]) => (
                    <button key={key} className={`rounded-full px-3 py-1.5 ${range === key ? "bg-[#6C4DFF] font-semibold text-white" : "text-[#8E8AA3]"}`} onClick={() => setRange(key)} type="button">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <MealChart data={shown} />
              <p className="text-center text-[11px] text-[#8E8AA3]">তারিখ · {monthName(month)} · দিনের মোট মিল</p>
            </article>

            <article className="rounded-[24px] border border-[#F3EEF9] p-4 lg:col-span-3">
              <h2 className="font-semibold">এই মাসের চিত্র</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <Stat label="প্রতি মিল" value={ledger.rate == null ? "—" : taka(ledger.rate)} />
                <Stat label="মোট মিল" value={mealText(ledger.totalMeals)} />
                <Stat label="মোট বাজার" value={taka(ledger.totalBazaar)} />
                <Stat label="ঘরের বিল" value={taka(ledger.totalBills)} />
              </dl>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11px] text-[#8E8AA3]">
                  <span>কম {mealText(low)}</span>
                  <span>বেশি {mealText(peak)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-[#F1EAFF]">
                  <div className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-[#6C4DFF]" style={{ left: `${Math.min(98, Math.max(2, marker))}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-[#8E8AA3]">
                  গড় দিনে {mealText(Number(avg.toFixed(1)))} মিল · রান্না বন্ধ {ledger.closedDays} দিন
                </p>
              </div>
              <div className="mt-4 border-t border-[#F3EEF9] pt-3">
                <SlotDonut b={ledger.slots.b} l={ledger.slots.l} d={ledger.slots.d} />
              </div>
            </article>
          </section>

          <section className="grid gap-3 lg:grid-cols-5">
            <article className="rounded-[24px] border border-[#F3EEF9] p-4 lg:col-span-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">কে কত দিবে বা পাবে</h2>
                <Link href="/report" className="text-sm font-semibold text-[#6C4DFF]">
                  পুরো রিপোর্ট
                </Link>
              </div>
              <div className="space-y-2">
                {ledger.rows.map((row) => {
                  const max = Math.max(...ledger.rows.map((item) => item.bazaar), 1);
                  return (
                    <Link key={row.member.id} href={`/members/${row.member.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl px-1 py-2 hover:bg-[#FAF8FF]">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-semibold">{row.member.name}</span>
                          <span className="shrink-0 text-[#8E8AA3]">বাজার {taka(row.bazaar)}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-[#F4F0FF]">
                          <div className="h-1.5 rounded-full bg-[#6C4DFF]" style={{ width: `${(row.bazaar / max) * 100}%` }} />
                        </div>
                      </div>
                      <p className={`w-28 text-right text-sm font-semibold ${row.net > 0 ? "text-[#128A4A]" : row.net < 0 ? "text-[#E11D48]" : "text-[#8E8AA3]"}`}>
                        {row.net === 0 ? "সমান" : `${row.net > 0 ? "পাবে" : "দিবে"} ${taka(Math.abs(row.net))}`}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </article>
            <article className="rounded-[24px] border border-[#F3EEF9] p-4 lg:col-span-2">
              <h2 className="font-semibold">সাম্প্রতিক বাজার</h2>
              <div className="mt-3 space-y-3">
                {monthBazaar.slice(0, 5).map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.note.split("\n")[0] || "বাজার"}</p>
                      <p className="text-[11px] text-[#8E8AA3]">
                        {memberById(row.memberId)?.short ?? "সদস্য"} · {dateLabel(row.date)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{taka(row.amount)}</p>
                  </div>
                ))}
                {!monthBazaar.length && <p className="text-sm text-[#8E8AA3]">এই মাসে এখনো বাজার লেখা হয়নি।</p>}
              </div>
            </article>
          </section>
        </>
      )}
      </>}
    </div>
  );
}

function Step({ href, n, title, text }: { href: string; n: string; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-2xl bg-[#F7F4FF] p-4 hover:bg-[#F1EAFF]">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#6C4DFF] text-sm font-semibold text-white">{n}</span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#8E8AA3]">{text}</p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[#8E8AA3]">{label}</dt>
      <dd className="text-lg font-bold tracking-tight">{value}</dd>
    </div>
  );
}

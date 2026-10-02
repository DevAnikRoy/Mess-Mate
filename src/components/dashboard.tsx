"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MealChart, SlotDonut, Spark } from "./charts";
import { IconArrow } from "./icons";
import { mealText, monthLabel, shortMonth, taka } from "@/lib/format";
import { CURRENT_USER, MESS_NAME, type MonthId, markWeight, members, readMark } from "@/lib/model";
import { useMess } from "@/lib/store";

export function Dashboard() {
  const { ledger, month, setMonth, state } = useMess();
  const [range, setRange] = useState<"7" | "15" | "all">("all");
  const me = ledger.rows.find((row) => row.member.id === CURRENT_USER) ?? ledger.rows[0];
  const top = [...ledger.rows].sort((a, b) => b.meals - a.meals)[0];
  const daily = range === "all" ? ledger.daily : ledger.daily.slice(range === "7" ? -7 : -15);
  const peak = Math.max(...ledger.daily.map((day) => day.meals), 0);
  const low = Math.min(...ledger.daily.filter((day) => !day.closed).map((day) => day.meals), peak);
  const avg = ledger.days ? ledger.totalMeals / ledger.days : 0;
  const span = Math.max(peak - low, 1);
  const marker = ((avg - low) / span) * 100;

  const series = useMemo(() => {
    return Object.fromEntries(
      members.map((member) => [
        member.id,
        ledger.daily.map((day) => (day.closed ? 0 : markWeight(readMark(state, member.id, day.date)))),
      ]),
    ) as Record<string, number[]>;
  }, [ledger.daily, state]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#8E8AA3]">{MESS_NAME}</p>
          <h1 className="text-2xl font-bold tracking-tight">{monthLabel(month)}</h1>
        </div>
        <div className="flex rounded-full bg-[#F6F4FB] p-1">
          {(["2026-09", "2026-10"] as MonthId[]).map((item) => (
            <button
              key={item}
              className={`rounded-full px-4 py-2 text-sm ${month === item ? "bg-white font-semibold shadow-[0_1px_2px_rgba(27,23,48,0.06)]" : "text-[#8E8AA3]"}`}
              onClick={() => setMonth(item)}
              type="button"
            >
              {shortMonth(item)}
            </button>
          ))}
        </div>
      </div>

      <Link href="/report" className="flex items-center justify-between gap-3 rounded-[22px] bg-[#F6F3FF] px-4 py-3">
        <div>
          <p className="text-sm font-semibold">সেপ্টেম্বরের রিপোর্ট তৈরি হয়েছে</p>
          <p className="text-xs text-[#8E8AA3]">{state.approved ? "ম্যানেজার অ্যাপ্রুভ করেছেন। এখন হিসাব মিটিয়ে নিন।" : "ম্যানেজার এখনো অ্যাপ্রুভ করেননি।"}</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#6C4DFF] text-white">
          <IconArrow className="h-4 w-4" />
        </span>
      </Link>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#5C5872]">সদস্যরা</h2>
          <span className="text-xs text-[#8E8AA3]">সবাই সব অঙ্ক দেখতে পারে</span>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar lg:grid lg:grid-cols-4 lg:overflow-visible">
          {ledger.rows.map((row) => (
            <Link
              key={row.member.id}
              href={`/members/${row.member.id}`}
              className="min-w-[210px] flex-1 rounded-[22px] p-3.5 lg:min-w-0"
              style={{ background: row.member.tint }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{row.member.short}</p>
                  <p className="text-[11px] text-[#5C5872]">{row.member.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold">{mealText(row.meals)} মিল</p>
                  <p className={`text-[11px] font-semibold ${row.net >= 0 ? "text-[#128A4A]" : "text-[#E11D48]"}`}>{row.net >= 0 ? "পাবে" : "দিবে"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-[#5C5872]">ব্যালেন্স</p>
                  <p className="text-xl font-bold tracking-tight">{taka(Math.abs(row.net))}</p>
                </div>
                <Spark values={series[row.member.id]} color={row.net >= 0 ? "#128A4A" : "#E11D48"} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          <article className="rounded-[24px] border border-[#F3EEF9] p-4">
            <p className="text-sm text-[#8E8AA3]">আমার ব্যালেন্স</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="rounded-2xl bg-[#6C4DFF] px-4 py-3 text-xl font-bold text-white">{taka(Math.abs(me.net))}</div>
              <span className={`rounded-xl px-2 py-1 text-xs font-semibold ${me.net >= 0 ? "bg-[#E5F8EC] text-[#128A4A]" : "bg-[#FFE4EA] text-[#E11D48]"}`}>
                {me.net >= 0 ? "পাবে" : "দিবে"}
              </span>
            </div>
            <p className="mt-4 text-sm text-[#8E8AA3]">আমার বাজার</p>
            <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#17171C] px-4 py-3 text-white">
              <span className="text-lg font-semibold">{taka(me.bazaar)}</span>
              <Link href="/bazaar" className="grid h-9 w-9 place-items-center rounded-xl bg-[#6C4DFF]">
                <IconArrow className="h-4 w-4" />
              </Link>
            </div>
          </article>
          <article className="rounded-[24px] border border-[#F3EEF9] p-4">
            <p className="text-sm font-semibold">সবচেয়ে বেশি মিল</p>
            <div className="mt-3 rounded-2xl bg-[#FAF8FF] p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{top.member.name}</p>
                <p className="text-sm font-semibold text-[#6C4DFF]">{mealText(top.meals)} মিল</p>
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
          <MealChart data={daily} />
          <p className="text-center text-[11px] text-[#8E8AA3]">তারিখ · {shortMonth(month)} · দিনের মোট মিল</p>
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
            <p className="mt-2 text-[11px] text-[#8E8AA3]">গড় দিনে {mealText(Number(avg.toFixed(1)))} মিল · রান্না বন্ধ {ledger.closedDays} দিন</p>
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
            <Link href="/report" className="text-sm font-semibold text-[#6C4DFF]">পুরো রিপোর্ট</Link>
          </div>
          <div className="space-y-2">
            {ledger.rows.map((row) => {
              const max = Math.max(...ledger.rows.map((item) => item.bazaar), 1);
              return (
                <Link key={row.member.id} href={`/members/${row.member.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl px-1 py-2 hover:bg-[#FAF8FF]">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{row.member.name}</span>
                      <span className="text-[#8E8AA3]">বাজার {taka(row.bazaar)}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-[#F4F0FF]">
                      <div className="h-1.5 rounded-full bg-[#6C4DFF]" style={{ width: `${(row.bazaar / max) * 100}%` }} />
                    </div>
                  </div>
                  <p className={`w-28 text-right text-sm font-semibold ${row.net >= 0 ? "text-[#128A4A]" : "text-[#E11D48]"}`}>
                    {row.net >= 0 ? "পাবে" : "দিবে"} {taka(Math.abs(row.net))}
                  </p>
                </Link>
              );
            })}
          </div>
        </article>
        <article className="rounded-[24px] border border-[#F3EEF9] p-4 lg:col-span-2">
          <h2 className="font-semibold">সাম্প্রতিক বাজার</h2>
          <div className="mt-3 space-y-3">
            {state.bazaar.filter((row) => row.date.startsWith(month)).slice(0, 5).map((row) => {
              const person = members.find((member) => member.id === row.memberId);
              return (
                <div key={row.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.note.split("\n")[0]}</p>
                    <p className="text-[11px] text-[#8E8AA3]">{person?.short} · {Number(row.date.slice(8))} তারিখ</p>
                  </div>
                  <p className="text-sm font-semibold">{taka(row.amount)}</p>
                </div>
              );
            })}
            {!state.bazaar.some((row) => row.date.startsWith(month)) && <p className="text-sm text-[#8E8AA3]">এই মাসে এখনো বাজার লেখা হয়নি।</p>}
          </div>
        </article>
      </section>
    </div>
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EntryActions, useCanChange } from "./entry-tools";
import { MonthLoading, MonthPicker } from "./month-picker";
import { addMonths, dateLabel, editDeadline, monthLabel, monthOf, monthOpen } from "@/lib/dates";
import { mealText, taka } from "@/lib/format";
import { useMess } from "@/lib/store";

export function Report() {
  const { state, members, months, today, isManager, monthReady, ensureMonth, ledgerFor, memberById, approve, updateAmount, removeEntry } = useMess();
  const canChange = useCanChange();
  const current = monthOf(today);
  const previous = addMonths(current, -1);
  const [target, setTarget] = useState(months.includes(previous) ? previous : current);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureMonth(target);
  }, [ensureMonth, target]);

  const ledger = ledgerFor(target);
  const finished = target < current;
  const approved = state.approvals.includes(target);
  const open = monthOpen(target, today);
  const manager = members.find((member) => member.role === "manager" && !member.leftOn);
  const bazaar = state.bazaar.filter((row) => row.date.startsWith(target));
  const bills = state.bills.filter((row) => row.date.startsWith(target));

  async function onApprove() {
    if (!window.confirm(`${monthLabel(target)} রিপোর্ট অ্যাপ্রুভ করবেন? পরে কোনো অঙ্ক বদলালে অ্যাপ্রুভ আবার খুলে যাবে।`)) return;
    setBusy(true);
    await approve(target);
    setBusy(false);
  }

  let badge = { text: "চলতি মাস · এখন পর্যন্ত", cls: "bg-[#FFF6E8] text-[#A16207]" };
  if (finished) {
    badge = approved
      ? { text: "ম্যানেজার অ্যাপ্রুভ করেছেন", cls: "bg-[#E5F8EC] text-[#128A4A]" }
      : { text: "ম্যানেজার এখনো অ্যাপ্রুভ করেননি", cls: "bg-[#F1EAFF] text-[#6C4DFF]" };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[#8E8AA3]">
            {finished ? (open ? `${dateLabel(editDeadline(target))} রাত পর্যন্ত সংশোধন করা যাবে` : "সংশোধনের সময় শেষ") : "মাস শেষে ১ তারিখে চূড়ান্ত হবে"}
          </p>
          <h1 className="text-2xl font-bold">{monthLabel(target)} রিপোর্ট</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.cls}`}>{badge.text}</span>
          <MonthPicker value={target} onChange={setTarget} />
        </div>
      </div>

      {!monthReady(target) ? (
        <MonthLoading />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="মোট বাজার" value={taka(ledger.totalBazaar)} tint="#C9F8E4" />
            <Tile label="মোট মিল" value={mealText(ledger.totalMeals)} tint="#E4D4FF" />
            <Tile label="প্রতি মিল" value={ledger.rate == null ? "—" : taka(ledger.rate)} tint="#FFE6A8" />
            <Tile label="ঘরের বিল" value={taka(ledger.totalBills)} tint="#D9F5B0" />
          </section>

          {ledger.totalBazaar > 0 && ledger.totalMeals === 0 && (
            <p className="rounded-[22px] bg-[#FFF6E8] px-4 py-3 text-sm">বাজার আছে কিন্তু কোনো মিল নেই, তাই মিল রেট বের করা যাচ্ছে না। আগে মিলগুলো ঠিক করুন।</p>
          )}

          <section className="overflow-hidden rounded-[24px] border border-[#F3EEF9]">
            <div className="hidden grid-cols-6 gap-2 bg-[#FAF8FF] px-4 py-3 text-xs text-[#8E8AA3] lg:grid">
              <span>সদস্য</span>
              <span>মিল</span>
              <span>খাবার</span>
              <span>দিয়েছে</span>
              <span>বিলের ভাগ</span>
              <span className="text-right">ফলাফল</span>
            </div>
            {ledger.rows.map((row) => (
              <Link key={row.member.id} href={`/members/${row.member.id}`} className="grid gap-1 border-t border-[#F3EEF9] px-4 py-3 first:border-0 hover:bg-[#FAF8FF] lg:grid-cols-6 lg:items-center">
                <p className="font-semibold">{row.member.name}</p>
                <p className="text-sm">{mealText(row.meals)} মিল</p>
                <p className="text-sm">খাবার {taka(row.food)}</p>
                <p className="text-sm">দিয়েছে {taka(row.paid)}</p>
                <p className="text-sm">ভাগ {taka(row.share)}</p>
                <p className={`text-sm font-semibold lg:text-right ${row.net > 0 ? "text-[#128A4A]" : row.net < 0 ? "text-[#E11D48]" : "text-[#8E8AA3]"}`}>
                  {row.net === 0 ? "সমান" : `${row.net > 0 ? "পাবে" : "দিবে"} ${taka(Math.abs(row.net))}`}
                </p>
              </Link>
            ))}
          </section>

          {finished && manager && (
            <p className={`rounded-[22px] px-4 py-3 text-sm leading-6 ${approved ? "bg-[#E5F8EC]" : "bg-[#F7F4FF]"}`}>
              যার দিতে হবে, সে ম্যানেজার {manager.name}-এর কাছে জমা দেবে। যার পাওনা, সে ম্যানেজারের কাছ থেকে নেবে।
              {open && ` ${dateLabel(editDeadline(target))} রাত পর্যন্ত ভুল সারানো যাবে। সারালে অ্যাপ্রুভ আবার খুলবে।`}
            </p>
          )}

          {isManager && finished && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="h-12 rounded-2xl bg-[#6C4DFF] px-5 font-semibold text-white disabled:opacity-40"
                disabled={approved || busy}
                onClick={onApprove}
                type="button"
              >
                {approved ? "অ্যাপ্রুভ করা হয়েছে" : "রিপোর্ট অ্যাপ্রুভ"}
              </button>
              <p className="text-xs text-[#8E8AA3]">অ্যাপ্রুভের তারিখ বাঁধা নেই। সংখ্যা বদল {dateLabel(editDeadline(target))} পর্যন্ত।</p>
            </div>
          )}

          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-[24px] border border-[#F3EEF9] p-4">
              <h2 className="font-semibold">বাজারের অঙ্ক</h2>
              <div className="mt-2 divide-y divide-[#F3EEF9]">
                {bazaar.map((row) => (
                  <div key={row.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.note.split("\n")[0] || "বাজার"}</p>
                        <p className="text-[11px] text-[#8E8AA3]">
                          {memberById(row.memberId)?.short ?? "সদস্য"} · {dateLabel(row.date)}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold">{taka(row.amount)}</p>
                    </div>
                    {canChange(row) && (
                      <EntryActions key={`${row.id}-${row.amount}`} amount={row.amount} onSave={(value) => updateAmount("bazaar", row.id, value)} onDelete={() => removeEntry("bazaar", row.id)} />
                    )}
                  </div>
                ))}
                {!bazaar.length && <p className="py-3 text-sm text-[#8E8AA3]">কোনো বাজার নেই।</p>}
              </div>
            </article>
            <article className="rounded-[24px] border border-[#F3EEF9] p-4">
              <h2 className="font-semibold">ঘরের বিল</h2>
              <div className="mt-2 divide-y divide-[#F3EEF9]">
                {bills.map((row) => (
                  <div key={row.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.title}</p>
                        <p className="text-[11px] text-[#8E8AA3]">
                          {memberById(row.memberId)?.short ?? "সদস্য"} · {dateLabel(row.date)}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold">{taka(row.amount)}</p>
                    </div>
                    {canChange(row) && (
                      <EntryActions key={`${row.id}-${row.amount}`} amount={row.amount} onSave={(value) => updateAmount("bill", row.id, value)} onDelete={() => removeEntry("bill", row.id)} />
                    )}
                  </div>
                ))}
                {!bills.length && <p className="py-3 text-sm text-[#8E8AA3]">কোনো বিল নেই।</p>}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="rounded-[22px] p-4" style={{ background: tint }}>
      <p className="text-xs text-[#5C5872]">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

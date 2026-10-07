"use client";

import { useState } from "react";
import { EntryActions, WhoWhen, useCanChange } from "./entry-tools";
import { MonthLoading, MonthPicker } from "./month-picker";
import { dateLabel, monthName } from "@/lib/dates";
import { parseAmount, taka } from "@/lib/format";
import { useMess } from "@/lib/store";

const QUICK = ["বাসা ভাড়া", "বিদ্যুৎ বিল", "গ্যাস", "ওয়াইফাই", "বুয়া", "পানি", "হার্পিক/সাবান"];

export function Bills() {
  const { state, me, today, month, ledger, monthReady, memberById, addBill, updateAmount, removeEntry, say } = useMess();
  const canChange = useCanChange();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [memberId, setMemberId] = useState(me.id);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const rows = state.bills.filter((bill) => bill.date.startsWith(month));

  async function save() {
    const value = parseAmount(amount);
    if (!title.trim()) return say("কিসের খরচ সেটা লিখুন।");
    if (value == null) return say("সঠিক টাকার অঙ্ক দিন।");
    setBusy(true);
    const ok = await addBill({ memberId, date, title: title.trim().slice(0, 120), amount: value });
    setBusy(false);
    if (!ok) return;
    setTitle("");
    setAmount("");
    say("খরচ যোগ হয়েছে।");
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="min-w-0">
        <p className="text-xs text-[#8E8AA3]">ভাড়া, কারেন্ট, ওয়াইফাই, হার্পিক</p>
        <h1 className="text-2xl font-bold">ঘরের খরচ</h1>
        <p className="mt-2 text-sm leading-6 text-[#5C5872]">
          এই টাকা বাজারের মিল রেটে মেশে না। মাসের সব সদস্যে সমান ভাগ হয়। যে দিয়েছে, তার দেওয়া টাকা থেকে বাদ যায়।
        </p>
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          {QUICK.map((item) => (
            <button key={item} className="shrink-0 rounded-full bg-[#F6F4FB] px-3 py-1.5 text-xs" onClick={() => setTitle(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <input
          className="mt-3 h-12 w-full rounded-2xl bg-[#F7F5FC] px-4 outline-none"
          placeholder="কিসের খরচ"
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          className="mt-2 h-12 w-full rounded-2xl bg-[#F7F5FC] px-4 outline-none"
          inputMode="decimal"
          placeholder="টাকা"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <WhoWhen memberId={memberId} date={date} onMember={setMemberId} onDate={setDate} />
        <button className="mt-3 h-12 w-full rounded-2xl bg-[#17171C] font-semibold text-white disabled:opacity-60" disabled={busy} onClick={save} type="button">
          {busy ? "সেভ হচ্ছে…" : "খরচ যোগ করুন"}
        </button>
      </section>

      <section className="min-w-0 rounded-[24px] border border-[#F3EEF9] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{monthName(month)}</h2>
          <div className="min-w-0 max-w-full">
            <MonthPicker />
          </div>
        </div>
        {!monthReady(month) ? (
          <MonthLoading />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-2xl bg-[#17171C] px-3 py-3 text-white sm:px-4">
                <p className="text-xs text-white/70">মোট খরচ</p>
                <p className="truncate text-lg font-bold sm:text-xl">{taka(ledger.totalBills)}</p>
              </div>
              <div className="min-w-0 rounded-2xl bg-[#F1EAFF] px-3 py-3 sm:px-4">
                <p className="truncate text-xs text-[#8E8AA3]">জনপ্রতি ({ledger.rows.length} জন)</p>
                <p className="truncate text-lg font-bold text-[#6C4DFF] sm:text-xl">{taka(ledger.share)}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {rows.map((bill) => (
                <div key={bill.id} className="rounded-2xl bg-[#FAF8FF] px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{bill.title}</p>
                      <p className="truncate text-[11px] text-[#8E8AA3]">
                        {bill.memberId === me.id ? "আমি" : memberById(bill.memberId)?.short ?? "সদস্য"} দিয়েছেন · {dateLabel(bill.date)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{taka(bill.amount)}</p>
                  </div>
                  {canChange(bill) && (
                    <EntryActions
                      key={`${bill.id}-${bill.amount}`}
                      amount={bill.amount}
                      onSave={(value) => updateAmount("bill", bill.id, value)}
                      onDelete={() => removeEntry("bill", bill.id)}
                    />
                  )}
                </div>
              ))}
              {!rows.length && <p className="py-6 text-center text-sm text-[#8E8AA3]">এই মাসে এখনো কোনো খরচ যোগ হয়নি।</p>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { taka } from "@/lib/format";
import { CURRENT_USER, TODAY, buildLedger, members } from "@/lib/model";
import { useMess } from "@/lib/store";

export function Bills() {
  const { state, addBill } = useMess();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const sept = buildLedger(state, "2026-09");

  function save() {
    const value = Number(amount);
    if (!title.trim() || !value) return;
    addBill({ id: `bill-${Date.now()}`, memberId: CURRENT_USER, date: TODAY, title: title.trim(), amount: value });
    setTitle("");
    setAmount("");
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
      <section>
        <p className="text-xs text-[#8E8AA3]">ভাড়া, কারেন্ট, ওয়াইফাই, হার্পিক</p>
        <h1 className="text-2xl font-bold">ঘরের খরচ</h1>
        <p className="mt-2 text-sm leading-6 text-[#5C5872]">এই টাকা বাজারের মিল রেটে মেশে না। মাসের সব সদস্যে সমান ভাগ হয়। যে দিয়েছে, তার দেওয়া টাকা থেকে বাদ যায়।</p>
        <input className="mt-4 h-12 w-full rounded-2xl bg-[#F7F5FC] px-4 outline-none" placeholder="কী কিনেছেন" value={title} onChange={(event) => setTitle(event.target.value)} />
        <input className="mt-2 h-12 w-full rounded-2xl bg-[#F7F5FC] px-4 outline-none" inputMode="decimal" placeholder="টাকা" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <button className="mt-3 h-12 w-full rounded-2xl bg-[#17171C] font-semibold text-white" onClick={save} type="button">খরচ যোগ করুন</button>
      </section>
      <section className="rounded-[24px] border border-[#F3EEF9] p-4">
        <div className="flex items-end justify-between">
          <h2 className="font-semibold">সেপ্টেম্বর</h2>
          <p className="text-sm">জনপ্রতি {taka(sept.share)}</p>
        </div>
        <div className="mt-3 space-y-2">
          {state.bills.filter((bill) => bill.date.startsWith("2026-09")).map((bill) => (
            <div key={bill.id} className="flex items-center justify-between rounded-2xl bg-[#FAF8FF] px-3 py-3">
              <div>
                <p className="text-sm font-semibold">{bill.title}</p>
                <p className="text-[11px] text-[#8E8AA3]">{members.find((member) => member.id === bill.memberId)?.short} দিয়েছেন</p>
              </div>
              <p className="font-semibold">{taka(bill.amount)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

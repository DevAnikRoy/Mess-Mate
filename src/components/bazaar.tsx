"use client";

import { useState } from "react";
import { taka } from "@/lib/format";
import { CURRENT_USER, memberById, TODAY, members, suggestTotal } from "@/lib/model";
import { useMess } from "@/lib/store";

export function Bazaar() {
  const { state, addBazaar } = useMess();
  const [note, setNote] = useState("চাল ৫ কেজি ৩৫০\nসবজি ১৮০\nমোট ");
  const [guess, setGuess] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const mine = state.bazaar.filter((row) => row.memberId === CURRENT_USER);
  const total = mine.reduce((sum, row) => sum + row.amount, 0);

  function preview() {
    const found = suggestTotal(note);
    setGuess(found);
    if (found != null) setAmount(String(found));
  }

  function save() {
    const value = Number(amount);
    if (!value || value < 0) return;
    addBazaar({ id: `b-${Date.now()}`, memberId: CURRENT_USER, date: TODAY, note: note.trim(), amount: value });
    setNote("");
    setAmount("");
    setGuess(null);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="text-xs text-[#8E8AA3]">খাতার মতো লিখুন</p>
        <h1 className="text-2xl font-bold">বাজার</h1>
        <textarea
          className="mt-4 min-h-48 w-full rounded-[24px] bg-[#F7F5FC] p-4 text-sm leading-6 outline-none"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="বাংলা বা ইংরেজিতে যা খুশি লিখুন"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="rounded-full bg-[#F1EAFF] px-4 py-2 text-sm font-semibold text-[#6C4DFF]" onClick={preview} type="button">
            অঙ্ক বের করো
          </button>
          {guess != null && <span className="text-sm text-[#8E8AA3]">লেখা থেকে {taka(guess)} পাওয়া গেছে</span>}
        </div>
        <label className="mt-4 block text-sm">
          নিশ্চিত মোট
          <input className="mt-1 h-12 w-full rounded-2xl bg-[#F7F5FC] px-4 text-lg font-semibold outline-none" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="৳" />
        </label>
        <button className="mt-3 h-12 w-full rounded-2xl bg-[#6C4DFF] font-semibold text-white" onClick={save} type="button">
          বাজার সেভ
        </button>
        <p className="mt-2 text-xs text-[#8E8AA3]">হিসাবে শুধু এই নিশ্চিত টাকা ঢুকবে। আসল লেখা রয়ে যাবে।</p>
      </section>
      <section className="rounded-[24px] border border-[#F3EEF9] p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{memberById(CURRENT_USER).short}র বাজার</h2>
          <p className="font-semibold">{taka(total)}</p>
        </div>
        <div className="mt-3 space-y-3">
          {mine.map((row) => (
            <article key={row.id} className="rounded-2xl bg-[#FAF8FF] p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8E8AA3]">{Number(row.date.slice(8))} তারিখ</span>
                <span className="font-semibold">{taka(row.amount)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-5">{row.note}</p>
            </article>
          ))}
        </div>
        <h3 className="mb-2 mt-6 text-sm font-semibold text-[#8E8AA3]">সবার বাজার</h3>
        {members.map((member) => {
          const sum = state.bazaar.filter((row) => row.memberId === member.id).reduce((totalSum, row) => totalSum + row.amount, 0);
          return (
            <div key={member.id} className="flex items-center justify-between border-t border-[#F3EEF9] py-2 text-sm">
              <span>{member.name}</span>
              <span className="font-semibold">{taka(sum)}</span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

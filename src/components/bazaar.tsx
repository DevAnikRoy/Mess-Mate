"use client";

import { useState } from "react";
import { EntryActions, WhoWhen, useCanChange } from "./entry-tools";
import { MonthLoading, MonthPicker } from "./month-picker";
import { dateLabel, monthName } from "@/lib/dates";
import { parseAmount, taka } from "@/lib/format";
import { monthMembers, suggestTotal } from "@/lib/model";
import { useMess } from "@/lib/store";

export function Bazaar() {
  const { state, me, today, month, members, monthReady, memberById, addBazaar, updateAmount, removeEntry, say } = useMess();
  const canChange = useCanChange();
  const [note, setNote] = useState("");
  const [guess, setGuess] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [memberId, setMemberId] = useState(me.id);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const rows = state.bazaar.filter((row) => row.date.startsWith(month));
  const people = monthMembers(state, members, month);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  function preview() {
    const found = suggestTotal(note);
    setGuess(found);
    if (found != null) setAmount(String(found));
    else say("লেখায় কোনো অঙ্ক পাওয়া যায়নি। নিচে নিজে মোট লিখুন।");
  }

  async function save() {
    const value = parseAmount(amount);
    if (value == null) return say("নিশ্চিত মোট টাকা লিখুন।");
    if (!note.trim()) return say("কী কী কিনেছেন সেটা লিখুন।");
    setBusy(true);
    const ok = await addBazaar({ memberId, date, note: note.trim().slice(0, 2000), amount: value });
    setBusy(false);
    if (!ok) return;
    setNote("");
    setAmount("");
    setGuess(null);
    say("বাজার সেভ হয়েছে।");
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="min-w-0">
        <p className="text-xs text-[#8E8AA3]">খাতার মতো লিখুন</p>
        <h1 className="text-2xl font-bold">বাজার</h1>
        <textarea
          className="mt-4 min-h-48 w-full rounded-[24px] bg-[#F7F5FC] p-4 text-sm leading-6 outline-none"
          value={note}
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          placeholder={"যেমন:\nচাল ৫ কেজি ৩৫০\nসবজি ১৮০\nমাছ ৪২০"}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="rounded-full bg-[#F1EAFF] px-4 py-2 text-sm font-semibold text-[#6C4DFF] disabled:opacity-50" disabled={!note.trim()} onClick={preview} type="button">
            অঙ্ক বের করো
          </button>
          {guess != null && <span className="text-sm text-[#8E8AA3]">লেখা থেকে {taka(guess)} পাওয়া গেছে</span>}
        </div>
        <label className="mt-4 block text-sm">
          নিশ্চিত মোট
          <input
            className="mt-1 h-12 w-full rounded-2xl bg-[#F7F5FC] px-4 text-lg font-semibold outline-none"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="৳"
          />
        </label>
        <WhoWhen memberId={memberId} date={date} onMember={setMemberId} onDate={setDate} />
        <button className="mt-3 h-12 w-full rounded-2xl bg-[#6C4DFF] font-semibold text-white disabled:opacity-60" disabled={busy} onClick={save} type="button">
          {busy ? "সেভ হচ্ছে…" : "বাজার সেভ"}
        </button>
        <p className="mt-2 text-xs text-[#8E8AA3]">হিসাবে শুধু এই নিশ্চিত টাকা ঢুকবে। আসল লেখা রয়ে যাবে। আজকের মধ্যে নিজে বদলাতে পারবেন, পরে ম্যানেজার।</p>
      </section>

      <section className="min-w-0 rounded-[24px] border border-[#F3EEF9] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{monthName(month)} মাসের বাজার</h2>
          <div className="min-w-0 max-w-full">
            <MonthPicker />
          </div>
        </div>
        {!monthReady(month) ? (
          <MonthLoading />
        ) : (
          <>
            <div className="rounded-2xl bg-[#17171C] px-4 py-3 text-white">
              <p className="text-xs text-white/70">মোট বাজার</p>
              <p className="text-2xl font-bold">{taka(total)}</p>
            </div>
            <div className="mt-3">
              {people.map((member) => {
                const sum = rows.filter((row) => row.memberId === member.id).reduce((value, row) => value + row.amount, 0);
                return (
                  <div key={member.id} className="flex items-center justify-between border-b border-[#F3EEF9] py-2 text-sm last:border-0">
                    <span>{member.id === me.id ? "আমি" : member.name}</span>
                    <span className="font-semibold">{taka(sum)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 space-y-3">
              {rows.map((row) => (
                <article key={row.id} className={`rounded-2xl p-3 ${row.memberId === me.id ? "bg-[#F4EFFF]" : "bg-[#FAF8FF]"}`}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-[#8E8AA3]">
                      {memberById(row.memberId)?.short ?? "সদস্য"} · {dateLabel(row.date)}
                    </span>
                    <span className="shrink-0 font-semibold">{taka(row.amount)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">{row.note}</p>
                  {canChange(row) && (
                    <EntryActions
                      key={`${row.id}-${row.amount}`}
                      amount={row.amount}
                      onSave={(value) => updateAmount("bazaar", row.id, value)}
                      onDelete={() => removeEntry("bazaar", row.id)}
                    />
                  )}
                </article>
              ))}
              {!rows.length && <p className="py-6 text-center text-sm text-[#8E8AA3]">এই মাসে এখনো কোনো বাজার লেখা হয়নি।</p>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

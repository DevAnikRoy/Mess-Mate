"use client";

import { useState } from "react";
import { addDays, dateLabel } from "@/lib/dates";
import { useMess } from "@/lib/store";

const BATHROOM = "বাথরুম পরিষ্কার";

export function Duties() {
  const { state, me, isManager, today, activeMembers, memberById, addDuties, toggleDuty, removeDuty, say } = useMess();
  const [name, setName] = useState("");
  const [date, setDate] = useState(addDays(today, 1));
  const [memberId, setMemberId] = useState(activeMembers[0]?.id ?? me.id);
  const [start, setStart] = useState(addDays(today, 1));
  const [every, setEvery] = useState(3);
  const [busy, setBusy] = useState(false);
  const upcoming = state.duties.filter((duty) => duty.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const recent = state.duties.filter((duty) => duty.date < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  async function addOne() {
    if (!name.trim()) return say("ডিউটির নাম লিখুন।");
    if (date < today) return say("আজ বা সামনের তারিখ দিন।");
    setBusy(true);
    const ok = await addDuties([{ name: name.trim().slice(0, 40), date, memberId, kind: "custom" }]);
    setBusy(false);
    if (ok) {
      setName("");
      say("ডিউটি যোগ হয়েছে।");
    }
  }

  async function rotate() {
    if (start < today) return say("আজ বা সামনের তারিখ থেকে শুরু করুন।");
    const taken = new Set(state.duties.filter((duty) => duty.kind === "bathroom").map((duty) => duty.date));
    const rows = [];
    for (let offset = 0, turn = 0; offset < 30; offset += every) {
      const day = addDays(start, offset);
      if (taken.has(day)) continue;
      rows.push({ name: BATHROOM, date: day, memberId: activeMembers[turn % activeMembers.length].id, kind: "bathroom" as const });
      turn += 1;
    }
    if (!rows.length) return say("এই সময়ে বাথরুমের পালা আগেই ঠিক করা আছে।");
    setBusy(true);
    const ok = await addDuties(rows);
    setBusy(false);
    if (ok) say(`আগামী ৩০ দিনে ${rows.length}টা পালা ঠিক হয়েছে।`);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="text-xs text-[#8E8AA3]">কার কবে পালা</p>
        <h1 className="text-2xl font-bold">ডিউটি</h1>
        <div className="mt-4 space-y-2">
          {upcoming.map((duty) => {
            const mine = duty.memberId === me.id;
            const person = memberById(duty.memberId);
            return (
              <article key={duty.id} className={`flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 ${mine ? "border-[#D9CCFF] bg-[#FAF8FF]" : "border-[#F3EEF9]"}`}>
                <div className="min-w-0">
                  <p className="font-semibold">{duty.name}</p>
                  <p className="text-xs text-[#8E8AA3]">
                    {duty.date === today ? "আজ" : dateLabel(duty.date)} · {person?.name ?? "সদস্য"}
                    {mine ? " · আপনার পালা" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(mine || isManager) && (
                    <button
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${duty.done ? "bg-[#E5F8EC] text-[#128A4A]" : "bg-[#F1EAFF] text-[#6C4DFF]"}`}
                      onClick={() => toggleDuty(duty.id)}
                      type="button"
                    >
                      {duty.done ? "হয়ে গেছে" : "করেছি"}
                    </button>
                  )}
                  {!mine && !isManager && duty.done && <span className="text-xs font-semibold text-[#128A4A]">হয়ে গেছে</span>}
                  {isManager && (
                    <button className="text-xs text-[#E11D48]" onClick={() => window.confirm("এই ডিউটি মুছবেন?") && removeDuty(duty.id)} type="button" aria-label="মুছুন">
                      ✕
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {!upcoming.length && (
            <p className="rounded-[22px] bg-[#F7F4FF] px-4 py-6 text-center text-sm text-[#8E8AA3]">
              {isManager ? "সামনে কোনো ডিউটি নেই। ডান পাশ থেকে বাথরুমের পালা বা নতুন ডিউটি যোগ করুন।" : "সামনে কোনো ডিউটি ঠিক করা নেই।"}
            </p>
          )}
        </div>
        {recent.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-sm font-semibold text-[#8E8AA3]">গত কয়েক দিন</h2>
            <div className="space-y-1">
              {recent.map((duty) => (
                <p key={duty.id} className="flex justify-between text-sm">
                  <span>
                    {dateLabel(duty.date)} · {duty.name} · {memberById(duty.memberId)?.short ?? "সদস্য"}
                  </span>
                  <span className={duty.done ? "text-[#128A4A]" : "text-[#E11D48]"}>{duty.done ? "হয়েছে" : "হয়নি"}</span>
                </p>
              ))}
            </div>
          </>
        )}
      </section>

      {isManager ? (
        <div className="space-y-4">
          <section className="rounded-[24px] bg-[#E9FBE8] p-4">
            <h2 className="font-semibold">বাথরুমের পালা</h2>
            <p className="mt-1 text-sm text-[#4D6B4A]">সদস্যদের মধ্যে পালাক্রমে আগামী ৩০ দিনের ভাগ করে দেবে।</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-[#4D6B4A]">
                শুরু
                <input className="mt-1 h-11 w-full rounded-2xl bg-white px-3 text-sm text-[#1B1730] outline-none" type="date" min={today} value={start} onChange={(event) => event.target.value && setStart(event.target.value)} />
              </label>
              <label className="text-xs text-[#4D6B4A]">
                কত দিন পরপর
                <select className="mt-1 h-11 w-full rounded-2xl bg-white px-3 text-sm text-[#1B1730] outline-none" value={every} onChange={(event) => setEvery(Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 7].map((value) => (
                    <option key={value} value={value}>
                      {value === 7 ? "সপ্তাহে একবার" : `${value} দিন`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="mt-3 h-11 w-full rounded-2xl bg-[#128A4A] font-semibold text-white disabled:opacity-60" disabled={busy} onClick={rotate} type="button">
              পালা ঠিক করুন
            </button>
          </section>

          <section className="rounded-[24px] bg-[#F7F4FF] p-4">
            <h2 className="font-semibold">নতুন ডিউটি</h2>
            <p className="mt-1 text-sm text-[#5C5872]">যেমন রান্নাঘর, ছাদ, গ্যাস বিল জমা।</p>
            <input className="mt-3 h-11 w-full rounded-2xl bg-white px-3 outline-none" maxLength={40} placeholder="ডিউটির নাম" value={name} onChange={(event) => setName(event.target.value)} />
            <input className="mt-2 h-11 w-full rounded-2xl bg-white px-3 outline-none" type="date" min={today} value={date} onChange={(event) => event.target.value && setDate(event.target.value)} />
            <select className="mt-2 h-11 w-full rounded-2xl bg-white px-3 outline-none" value={memberId} onChange={(event) => setMemberId(event.target.value)}>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <button className="mt-3 h-11 w-full rounded-2xl bg-[#6C4DFF] font-semibold text-white disabled:opacity-60" disabled={busy} onClick={addOne} type="button">
              ডিউটি যোগ
            </button>
          </section>
        </div>
      ) : (
        <section className="rounded-[24px] bg-[#F7F4FF] p-4 text-sm leading-6 text-[#5C5872]">
          <h2 className="font-semibold text-[#1B1730]">কীভাবে চলে</h2>
          <p className="mt-2">ম্যানেজার পালা ঠিক করেন। নিজের কাজ শেষ হলে &quot;করেছি&quot; চাপুন, সবাই দেখতে পাবে।</p>
        </section>
      )}
    </div>
  );
}

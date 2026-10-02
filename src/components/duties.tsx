"use client";

import { useState } from "react";
import { CURRENT_USER, type MemberId, TODAY, memberById, members } from "@/lib/model";
import { useMess } from "@/lib/store";

export function Duties() {
  const { state, addDuty, toggleDuty } = useMess();
  const [name, setName] = useState("");
  const [date, setDate] = useState("2026-10-06");
  const [memberId, setMemberId] = useState<MemberId>("tanmoy");
  const upcoming = state.duties.filter((duty) => duty.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="text-xs text-[#8E8AA3]">বাথরুম তৈরি আছে</p>
        <h1 className="text-2xl font-bold">ডিউটি</h1>
        <div className="mt-4 space-y-2">
          {upcoming.map((duty) => {
            const done = state.dutyDone.includes(duty.id);
            const mine = duty.memberId === CURRENT_USER;
            return (
              <article key={duty.id} className="flex items-center justify-between rounded-[22px] border border-[#F3EEF9] px-4 py-3">
                <div>
                  <p className="font-semibold">{duty.name}</p>
                  <p className="text-xs text-[#8E8AA3]">{Number(duty.date.slice(8))} অক্টোবর · {memberById(duty.memberId).name}{mine ? " · আপনার পালা" : ""}</p>
                </div>
                <button className={`rounded-full px-3 py-1.5 text-xs font-semibold ${done ? "bg-[#E5F8EC] text-[#128A4A]" : "bg-[#F1EAFF] text-[#6C4DFF]"}`} onClick={() => toggleDuty(duty.id)} type="button">
                  {done ? "হয়ে গেছে" : "করেছি"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
      <section className="rounded-[24px] bg-[#F7F4FF] p-4">
        <h2 className="font-semibold">নতুন ডিউটি</h2>
        <p className="mt-1 text-sm text-[#5C5872]">নাম দিলেই বাথরুমের মতো নোটিস চলবে। দিনের ৪৮ ঘণ্টা আগে থেকে ১২ ঘণ্টা পরপর।</p>
        <input className="mt-3 h-11 w-full rounded-2xl bg-white px-3 outline-none" placeholder="যেমন রান্নাঘর" value={name} onChange={(event) => setName(event.target.value)} />
        <input className="mt-2 h-11 w-full rounded-2xl bg-white px-3 outline-none" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <select className="mt-2 h-11 w-full rounded-2xl bg-white px-3 outline-none" value={memberId} onChange={(event) => setMemberId(event.target.value as MemberId)}>
          {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
        <button
          className="mt-3 h-11 w-full rounded-2xl bg-[#6C4DFF] font-semibold text-white"
          onClick={() => {
            if (!name.trim()) return;
            addDuty({ id: `duty-${Date.now()}`, name: name.trim(), date, memberId, kind: "custom" });
            setName("");
          }}
          type="button"
        >
          ডিউটি যোগ
        </button>
        <ol className="mt-4 space-y-1 text-xs text-[#5C5872]">
          <li>৪৮ ঘণ্টা আগে প্রথম নোটিস</li>
          <li>তারপর প্রতি ১২ ঘণ্টা</li>
          <li>করেছি চাপলে নোটিস থামে</li>
        </ol>
      </section>
    </div>
  );
}

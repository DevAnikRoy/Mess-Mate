"use client";

import { useMemo, useState } from "react";
import { mealText } from "@/lib/format";
import { CURRENT_USER, type MealMark, type MemberId, TODAY, isPast, markWeight, members, readMark } from "@/lib/model";
import { useMess } from "@/lib/store";

const empty: MealMark = { b: false, l: false, d: false };

export function Meals() {
  const { state, saveMeal, setKitchen, addGuest } = useMess();
  const [memberId, setMemberId] = useState<MemberId>(CURRENT_USER);
  const [date, setDate] = useState(TODAY);
  const [manager, setManager] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const mark = readMark(state, memberId, date) ?? empty;
  const closed = state.kitchenClosed.includes(date);
  const locked = isPast(date) && !manager;
  const month = date.slice(0, 7) === "2026-10" ? "2026-10" : "2026-09";
  const days = month === "2026-09" ? 30 : 31;

  const monthMeals = useMemo(() => {
    let total = 0;
    for (let day = 1; day <= days; day += 1) {
      const key = `${month}-${String(day).padStart(2, "0")}`;
      if (state.kitchenClosed.includes(key)) continue;
      total += markWeight(readMark(state, memberId, key));
    }
    return total;
  }, [days, memberId, month, state]);

  function update(next: MealMark) {
    if (locked || closed) return;
    saveMeal(memberId, date, next);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-xs text-[#8E8AA3]">প্রতিদিন একবার</p>
        <h1 className="text-2xl font-bold">আজকের মিল</h1>
      </div>
      <div className="flex gap-2">
        <button className={`rounded-full px-4 py-2 text-sm ${month === "2026-09" ? "bg-[#17171C] text-white" : "bg-[#F6F4FB]"}`} onClick={() => setDate("2026-09-01")} type="button">সেপ্টেম্বর</button>
        <button className={`rounded-full px-4 py-2 text-sm ${month === "2026-10" ? "bg-[#17171C] text-white" : "bg-[#F6F4FB]"}`} onClick={() => setDate(TODAY)} type="button">অক্টোবর</button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {members.map((member) => (
          <button
            key={member.id}
            className={`rounded-full px-4 py-2 text-sm ${memberId === member.id ? "bg-[#6C4DFF] font-semibold text-white" : "bg-[#F6F4FB]"}`}
            onClick={() => setMemberId(member.id)}
            type="button"
          >
            {member.short}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র"].map((label) => (
          <span key={label} className="pb-1 text-center text-[10px] text-[#8E8AA3]">{label}</span>
        ))}
        {Array.from({ length: month === "2026-10" ? 5 : 3 }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const key = `${month}-${String(day).padStart(2, "0")}`;
          const weight = state.kitchenClosed.includes(key) ? 0 : markWeight(readMark(state, memberId, key));
          const active = key === date;
          return (
            <button
              key={key}
              className={`rounded-2xl px-1 py-2 text-center ${active ? "bg-[#6C4DFF] text-white" : "bg-[#F7F5FC]"}`}
              onClick={() => setDate(key)}
              type="button"
            >
              <span className="block text-sm font-semibold">{day}</span>
              <span className={`block text-[10px] ${active ? "text-white/80" : "text-[#8E8AA3]"}`}>{weight ? mealText(weight) : "—"}</span>
            </button>
          );
        })}
      </div>

      <article className="rounded-[24px] border border-[#F3EEF9] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8E8AA3]">{Number(date.slice(8))} তারিখ · {members.find((m) => m.id === memberId)?.name}</p>
            <p className="text-lg font-bold">{closed ? "রান্না নেই" : `${mealText(markWeight(mark))} মিল`}</p>
          </div>
          <p className="text-sm text-[#8E8AA3]">এই মাসে {mealText(monthMeals)}</p>
        </div>

        {locked && <p className="mt-3 rounded-2xl bg-[#FFF6E8] px-3 py-2 text-sm">এই দিন পেরিয়ে গেছে। ম্যানেজার সংশোধন চালু করলে বসানো যাবে।</p>}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {([["b", "সকাল", "০.৫"], ["l", "দুপুর", "১"], ["d", "রাত", "১"]] as const).map(([slot, label, weight]) => {
            const on = mark[slot];
            return (
              <button
                key={slot}
                disabled={locked || closed}
                className={`rounded-2xl px-2 py-4 text-center ${on ? "bg-[#6C4DFF] text-white" : "bg-[#F6F4FB]"} disabled:opacity-50`}
                onClick={() => update({ ...mark, [slot]: !on })}
                type="button"
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span className={`block text-[11px] ${on ? "text-white/80" : "text-[#8E8AA3]"}`}>{weight} মিল</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="rounded-2xl bg-[#F6F4FB] px-3 py-3 text-sm font-semibold disabled:opacity-50" disabled={locked || closed} onClick={() => update(empty)} type="button">
            আজ খাব না
          </button>
          <button
            className={`rounded-2xl px-3 py-3 text-sm font-semibold disabled:opacity-50 ${closed ? "bg-[#17171C] text-white" : "bg-[#F6F4FB]"}`}
            disabled={locked}
            onClick={() => setKitchen(date, !closed)}
            type="button"
          >
            {closed ? "রান্না আবার চালু" : "আজ রান্না নেই"}
          </button>
        </div>
        {isPast(date) && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input checked={manager} onChange={(event) => setManager(event.target.checked)} type="checkbox" />
            ম্যানেজার সংশোধন
          </label>
        )}
      </article>

      <article className="rounded-[24px] border border-[#F3EEF9] p-4">
        <h2 className="font-semibold">অতিথির মিল</h2>
        <p className="mt-1 text-sm text-[#8E8AA3]">অতিথির দুপুর এই সদস্যের মিলে যোগ হবে।</p>
        <div className="mt-3 flex items-center gap-2">
          <input className="h-11 w-20 rounded-2xl bg-[#F6F4FB] px-3" min={1} type="number" value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value) || 1)} />
          <button
            className="h-11 rounded-2xl bg-[#6C4DFF] px-4 text-sm font-semibold text-white disabled:opacity-50"
            disabled={locked || closed}
            onClick={() => addGuest({ id: `g-${Date.now()}`, memberId, date, slot: "l", count: guestCount, name: "অতিথি" })}
            type="button"
          >
            দুপুরের অতিথি যোগ
          </button>
        </div>
        <div className="mt-3 space-y-1">
          {state.guests.filter((guest) => guest.date === date && guest.memberId === memberId).map((guest) => (
            <p key={guest.id} className="text-sm">{guest.count} জন · দুপুর</p>
          ))}
        </div>
      </article>
    </div>
  );
}

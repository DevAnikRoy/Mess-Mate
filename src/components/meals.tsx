"use client";

import { useState } from "react";
import { MonthLoading, MonthPicker } from "./month-picker";
import { dateLabel, dayOf, editDeadline, monthOf, monthOpen, saturdayOffset } from "@/lib/dates";
import { mealText } from "@/lib/format";
import { type MealMark, type Slot, SLOTS, markWeight, monthMembers, readMark } from "@/lib/model";
import { useMess } from "@/lib/store";

const none: MealMark = { b: false, l: false, d: false };
const WEEK = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র"];

export function Meals() {
  const { state, mess, me, isManager, today, month, members, monthReady, ledger, saveMeal, setKitchen, addGuest, removeGuest } = useMess();
  const [memberId, setMemberId] = useState(me.id);
  const [picked, setPicked] = useState(today);
  const [guestSlot, setGuestSlot] = useState<Slot>(mess.slots.l ? "l" : mess.slots.d ? "d" : "b");
  const [guestCount, setGuestCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const current = monthOf(today);
  const date = picked.startsWith(month) ? picked : month === current ? today : `${month}-01`;
  const people = monthMembers(state, members, month);
  const member = people.find((item) => item.id === memberId) ?? me;
  const mark = readMark(state, member.id, date);
  const closed = state.kitchenClosed.includes(date);
  const windowOpen = monthOpen(month, today);
  const fixable = isManager && windowOpen && date <= today;
  const ownToday = member.id === me.id && date === today && !me.leftOn;
  const canEdit = !closed && (ownToday || fixable);
  const canKitchen = date === today || fixable;
  const slots = SLOTS.filter((slot) => mess.slots[slot.key] || mark?.[slot.key]);
  const guests = state.guests.filter((guest) => guest.date === date && guest.memberId === member.id);
  const days = ledger.days;

  const monthMeals = ledger.rows.find((row) => row.member.id === member.id)?.meals ?? 0;

  async function update(next: MealMark) {
    if (!canEdit || busy) return;
    setBusy(true);
    await saveMeal(member.id, date, next);
    setBusy(false);
  }

  async function toggleKitchen() {
    if (!canKitchen || busy) return;
    if (!closed && !window.confirm(`${dateLabel(date)} রান্না বন্ধ? সেদিনের সবার মিল হিসাবে ধরা হবে না।`)) return;
    setBusy(true);
    await setKitchen(date, !closed);
    setBusy(false);
  }

  async function guest() {
    if (!canEdit || busy) return;
    setBusy(true);
    await addGuest({ memberId: member.id, date, slot: guestSlot, count: guestCount });
    setBusy(false);
  }

  let status = "এখনো দেননি";
  if (closed) status = "রান্না নেই";
  else if (mark) status = markWeight(mark) ? `${mealText(markWeight(mark))} মিল` : "খাবে না";

  let hint: string | null = null;
  if (date > today) hint = "সামনের দিনের মিল আগে থেকে দেওয়া যায় না।";
  else if (!canEdit && !closed) {
    if (member.id !== me.id && !isManager) hint = "অন্যের মিল শুধু দেখা যায়। ভুল থাকলে ম্যানেজারকে বলুন।";
    else if (isManager && !windowOpen) hint = `${dateLabel(editDeadline(month))} পর্যন্ত সংশোধন করা যেত। এই মাস এখন বন্ধ।`;
    else hint = "এই দিন পেরিয়ে গেছে। ভুল থাকলে ম্যানেজার ঠিক করে দেবেন।";
  } else if (fixable && !ownToday) hint = `ম্যানেজার হিসেবে সংশোধন করছেন · ${dateLabel(editDeadline(month))} পর্যন্ত খোলা।`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[#8E8AA3]">প্রতিদিন নিজের মিল নিজে দিন</p>
          <h1 className="text-2xl font-bold">মিল</h1>
        </div>
        <MonthPicker />
      </div>

      {people.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {people.map((item) => (
            <button
              key={item.id}
              className={`shrink-0 rounded-full px-4 py-2 text-sm ${member.id === item.id ? "bg-[#6C4DFF] font-semibold text-white" : "bg-[#F6F4FB]"}`}
              onClick={() => setMemberId(item.id)}
              type="button"
            >
              {item.id === me.id ? "আমি" : item.short}
            </button>
          ))}
        </div>
      )}

      {!monthReady(month) ? (
        <MonthLoading />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK.map((label) => (
              <span key={label} className="pb-1 text-center text-[10px] text-[#8E8AA3]">
                {label}
              </span>
            ))}
            {Array.from({ length: saturdayOffset(month) }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const key = dayOf(month, index + 1);
              const off = state.kitchenClosed.includes(key);
              const value = readMark(state, member.id, key);
              const active = key === date;
              const future = key > today;
              return (
                <button
                  key={key}
                  disabled={future}
                  className={`rounded-2xl px-1 py-2 text-center ${active ? "bg-[#6C4DFF] text-white" : key === today ? "bg-[#F1EAFF]" : "bg-[#F7F5FC]"} disabled:opacity-40`}
                  onClick={() => setPicked(key)}
                  type="button"
                >
                  <span className="block text-sm font-semibold">{index + 1}</span>
                  <span className={`block text-[10px] ${active ? "text-white/80" : "text-[#8E8AA3]"}`}>
                    {off ? "বন্ধ" : value ? mealText(markWeight(value)) : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          <article className="rounded-[24px] border border-[#F3EEF9] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-[#8E8AA3]">
                  {date === today ? "আজ" : dateLabel(date)} · {member.name}
                </p>
                <p className="text-lg font-bold">{status}</p>
              </div>
              <p className="shrink-0 text-sm text-[#8E8AA3]">এই মাসে {mealText(monthMeals)}</p>
            </div>

            {hint && <p className="mt-3 rounded-2xl bg-[#FFF6E8] px-3 py-2 text-sm leading-6">{hint}</p>}

            <div className={`mt-4 grid gap-2 ${slots.length === 3 ? "grid-cols-3" : slots.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {slots.map((slot) => {
                const on = Boolean(mark?.[slot.key]);
                return (
                  <button
                    key={slot.key}
                    disabled={!canEdit || busy}
                    aria-pressed={on}
                    className={`rounded-2xl px-2 py-4 text-center ${on ? "bg-[#6C4DFF] text-white" : "bg-[#F6F4FB]"} disabled:opacity-50`}
                    onClick={() => update({ ...(mark ?? none), [slot.key]: !on })}
                    type="button"
                  >
                    <span className="block text-sm font-semibold">{slot.label}</span>
                    <span className={`block text-[11px] ${on ? "text-white/80" : "text-[#8E8AA3]"}`}>{slot.weight} মিল</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className={`rounded-2xl px-3 py-3 text-sm font-semibold disabled:opacity-50 ${mark && !markWeight(mark) ? "bg-[#17171C] text-white" : "bg-[#F6F4FB]"}`}
                disabled={!canEdit || busy}
                onClick={() => update(none)}
                type="button"
              >
                {date === today ? "আজ খাব না" : "খায়নি"}
              </button>
              <button
                className={`rounded-2xl px-3 py-3 text-sm font-semibold disabled:opacity-50 ${closed ? "bg-[#17171C] text-white" : "bg-[#F6F4FB]"}`}
                disabled={!canKitchen || busy}
                onClick={toggleKitchen}
                type="button"
              >
                {closed ? "রান্না আবার চালু" : date === today ? "আজ রান্না নেই" : "রান্না হয়নি"}
              </button>
            </div>
          </article>

          <article className="rounded-[24px] border border-[#F3EEF9] p-4">
            <h2 className="font-semibold">অতিথির মিল</h2>
            <p className="mt-1 text-sm text-[#8E8AA3]">অতিথির মিল {member.id === me.id ? "আপনার" : `${member.short}-এর`} মিলে যোগ হবে।</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex rounded-2xl bg-[#F6F4FB] p-1">
                {SLOTS.filter((slot) => mess.slots[slot.key]).map((slot) => (
                  <button
                    key={slot.key}
                    className={`rounded-xl px-3 py-2 text-sm ${guestSlot === slot.key ? "bg-white font-semibold shadow-sm" : "text-[#8E8AA3]"}`}
                    onClick={() => setGuestSlot(slot.key)}
                    type="button"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center rounded-2xl bg-[#F6F4FB]">
                <button className="h-11 w-10 text-lg" onClick={() => setGuestCount((value) => Math.max(1, value - 1))} type="button" aria-label="কম">
                  −
                </button>
                <span className="w-8 text-center font-semibold">{guestCount}</span>
                <button className="h-11 w-10 text-lg" onClick={() => setGuestCount((value) => Math.min(20, value + 1))} type="button" aria-label="বেশি">
                  +
                </button>
              </div>
              <button
                className="h-11 rounded-2xl bg-[#6C4DFF] px-4 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!canEdit || busy}
                onClick={guest}
                type="button"
              >
                অতিথি যোগ
              </button>
            </div>
            {guests.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {guests.map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-xl bg-[#FAF8FF] px-3 py-2 text-sm">
                    <span>
                      {item.count} জন · {SLOTS.find((slot) => slot.key === item.slot)?.label}
                    </span>
                    {canEdit && (
                      <button className="text-xs font-semibold text-[#E11D48]" onClick={() => removeGuest(item.id)} type="button">
                        মুছুন
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </>
      )}
    </div>
  );
}

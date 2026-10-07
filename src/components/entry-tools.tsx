"use client";

import { useState } from "react";
import { addMonths, monthOf, monthOpen } from "@/lib/dates";
import { parseAmount } from "@/lib/format";
import { useMess } from "@/lib/store";

/** Earliest date the manager may still back-fill. */
export function useEditFloor() {
  const { today, mess } = useMess();
  const current = monthOf(today);
  const previous = addMonths(current, -1);
  const floor = monthOpen(previous, today) ? `${previous}-01` : `${current}-01`;
  return floor < mess.createdOn.slice(0, 8) + "01" ? mess.createdOn.slice(0, 8) + "01" : floor;
}

export function useCanChange() {
  const { me, isManager, today } = useMess();
  return (row: { date: string; createdBy: string }) =>
    (isManager && monthOpen(monthOf(row.date), today) && row.date <= today) || (row.createdBy === me.id && row.date === today && !me.leftOn);
}

export function WhoWhen({
  memberId,
  date,
  onMember,
  onDate,
}: {
  memberId: string;
  date: string;
  onMember: (id: string) => void;
  onDate: (date: string) => void;
}) {
  const { isManager, activeMembers, today } = useMess();
  const floor = useEditFloor();
  if (!isManager) return null;
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
      <label className="min-w-0 text-xs text-[#8E8AA3]">
        কে দিয়েছে
        <select
          value={memberId}
          onChange={(event) => onMember(event.target.value)}
          className="mt-1 h-11 w-full min-w-0 truncate rounded-2xl bg-[#F7F5FC] px-3 text-sm text-[#1B1730] outline-none"
        >
          {activeMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-xs text-[#8E8AA3]">
        তারিখ
        <input
          type="date"
          value={date}
          min={floor}
          max={today}
          onChange={(event) => event.target.value && onDate(event.target.value)}
          className="mt-1 block h-11 w-full min-w-0 appearance-none rounded-2xl bg-[#F7F5FC] px-3 text-left text-sm text-[#1B1730] outline-none"
        />
      </label>
    </div>
  );
}

export function EntryActions({ amount, onSave, onDelete }: { amount: number; onSave: (value: number) => Promise<boolean>; onDelete: () => Promise<boolean> }) {
  const { say } = useMess();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(amount));
  const [busy, setBusy] = useState(false);

  async function save() {
    const parsed = parseAmount(value);
    if (parsed == null) return say("সঠিক টাকার অঙ্ক দিন।");
    setBusy(true);
    const ok = await onSave(parsed);
    setBusy(false);
    if (ok) setEditing(false);
  }

  async function remove() {
    if (!window.confirm("এই হিসাবটা মুছে ফেলবেন?")) return;
    setBusy(true);
    await onDelete();
    setBusy(false);
  }

  if (editing) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="decimal"
          autoFocus
          className="h-9 w-28 rounded-xl bg-white px-3 text-sm font-semibold outline-none ring-1 ring-[#E7E0F4]"
        />
        <button className="h-9 rounded-xl bg-[#6C4DFF] px-3 text-xs font-semibold text-white disabled:opacity-60" disabled={busy} onClick={save} type="button">
          সেভ
        </button>
        <button className="h-9 px-2 text-xs text-[#8E8AA3]" onClick={() => setEditing(false)} type="button">
          বাতিল
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex gap-3 text-xs font-semibold">
      <button className="text-[#6C4DFF]" onClick={() => { setValue(String(amount)); setEditing(true); }} type="button">
        টাকা বদলান
      </button>
      <button className="text-[#E11D48] disabled:opacity-60" disabled={busy} onClick={remove} type="button">
        মুছুন
      </button>
    </div>
  );
}

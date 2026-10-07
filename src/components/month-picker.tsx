"use client";

import { bnDigits, monthName, monthOf } from "@/lib/dates";
import { useMess } from "@/lib/store";

export function MonthLoading() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="h-28 animate-pulse rounded-[24px] bg-[#F7F4FF]" />
      <div className="h-56 animate-pulse rounded-[24px] bg-[#F7F4FF]" />
    </div>
  );
}

export function MonthPicker({ value, onChange }: { value?: string; onChange?: (month: string) => void }) {
  const { months, month, setMonth, today } = useMess();
  const current = value ?? month;
  const pick = onChange ?? setMonth;
  const year = monthOf(today).slice(0, 4);
  if (months.length < 2) return null;
  return (
    <div className="no-scrollbar flex max-w-full overflow-x-auto rounded-full bg-[#F6F4FB] p-1">
      {[...months].reverse().map((item) => (
        <button
          key={item}
          className={`shrink-0 rounded-full px-4 py-2 text-sm ${current === item ? "bg-white font-semibold shadow-[0_1px_2px_rgba(27,23,48,0.06)]" : "text-[#8E8AA3]"}`}
          onClick={() => pick(item)}
          type="button"
        >
          {monthName(item)}
          {item.slice(0, 4) !== year ? ` ${bnDigits(item.slice(2, 4))}` : ""}
        </button>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Avatar } from "./avatar";
import { Spark } from "./charts";
import { MonthLoading, MonthPicker } from "./month-picker";
import { dateLabel, monthName, monthOf } from "@/lib/dates";
import { mealText, taka } from "@/lib/format";
import { SLOTS, markWeight, readMark } from "@/lib/model";
import { useMess } from "@/lib/store";

export function MemberProfile({ id }: { id: string }) {
  const { state, me, month, today, ledger, monthReady, memberById } = useMess();
  const member = memberById(id);

  if (!member) {
    return (
      <div className="mx-auto max-w-md rounded-[28px] bg-[#F7F4FF] p-6 text-center">
        <p className="font-semibold">এই সদস্যকে আপনার মেসে পাওয়া যায়নি</p>
        <Link href="/mess" className="mt-3 inline-block text-sm font-semibold text-[#6C4DFF]">
          সদস্যদের তালিকা
        </Link>
      </div>
    );
  }

  const row = ledger.rows.find((item) => item.member.id === member.id);
  const upto = month === monthOf(today) ? Number(today.slice(8, 10)) : ledger.days;
  const series = ledger.daily.slice(0, upto).map((day) => (day.closed ? 0 : markWeight(readMark(state, member.id, day.date))));
  const shops = state.bazaar.filter((item) => item.memberId === member.id && item.date.startsWith(month));
  const paidBills = state.bills.filter((item) => item.memberId === member.id && item.date.startsWith(month));
  const guests = state.guests.filter((item) => item.memberId === member.id && item.date.startsWith(month));
  const net = row?.net ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex justify-end">
        <MonthPicker />
      </div>
      <div className="rounded-[28px] p-5" style={{ background: member.tint }}>
        <div className="flex items-center gap-3">
          <Avatar name={member.name} src={member.avatarUrl} className="h-14 w-14 rounded-full text-lg" />
          <div className="min-w-0">
            <p className="text-sm">
              {member.leftOn ? "মেস ছেড়েছেন" : member.role === "manager" ? "ম্যানেজার" : "সদস্য"}
              {member.id === me.id && " · আপনি"}
            </p>
            <h1 className="truncate text-2xl font-bold lg:text-3xl">{member.name}</h1>
          </div>
        </div>
        <p className="mt-4 text-sm">{monthName(month)} মাসের ব্যালেন্স</p>
        <p className="text-4xl font-bold tracking-tight">{net === 0 ? taka(0) : `${net > 0 ? "পাবে" : "দিবে"} ${taka(Math.abs(net))}`}</p>
        {series.length > 1 && (
          <div className="mt-4">
            <Spark values={series} color={member.ink} />
          </div>
        )}
      </div>

      {!monthReady(month) ? (
        <MonthLoading />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cell label="মিল" value={mealText(row?.meals ?? 0)} />
            <Cell label="খাবার" value={taka(row?.food ?? 0)} />
            <Cell label="বাজার" value={taka(row?.bazaar ?? 0)} />
            <Cell label="বিল দিয়েছে" value={taka(row?.billsPaid ?? 0)} />
          </section>
          {row && (
            <p className="text-sm text-[#5C5872]">
              খাবার {taka(row.food)} + বিলের ভাগ {taka(row.share)}। দিয়েছে {taka(row.paid)}।
            </p>
          )}
          {guests.length > 0 && (
            <p className="text-sm">
              অতিথি:{" "}
              {guests.map((guest) => `${dateLabel(guest.date)} ${SLOTS.find((slot) => slot.key === guest.slot)?.label} ${guest.count} জন`).join(", ")}। এই মিল তার নামেই আছে।
            </p>
          )}
          <section className="rounded-[24px] border border-[#F3EEF9] p-4">
            <h2 className="font-semibold">বাজারের লেখা</h2>
            <div className="mt-3 space-y-3">
              {shops.map((shop) => (
                <article key={shop.id}>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8E8AA3]">{dateLabel(shop.date)}</span>
                    <span className="font-semibold">{taka(shop.amount)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-5">{shop.note}</p>
                </article>
              ))}
              {!shops.length && <p className="text-sm text-[#8E8AA3]">এই মাসে কোনো বাজার নেই।</p>}
            </div>
          </section>
          {paidBills.length > 0 && (
            <section className="rounded-[24px] border border-[#F3EEF9] p-4">
              <h2 className="font-semibold">যে বিল দিয়েছেন</h2>
              {paidBills.map((bill) => (
                <div key={bill.id} className="mt-2 flex justify-between text-sm">
                  <span>{bill.title}</span>
                  <span className="font-semibold">{taka(bill.amount)}</span>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F7F5FC] p-3">
      <p className="text-[11px] text-[#8E8AA3]">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

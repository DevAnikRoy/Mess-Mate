"use client";

import { mealText, taka } from "@/lib/format";
import { type MemberId, buildLedger, members } from "@/lib/model";
import { useMess } from "@/lib/store";
import { Spark } from "./charts";

export function MemberProfile({ id }: { id: MemberId }) {
  const { state } = useMess();
  const member = members.find((item) => item.id === id) ?? members[0];
  const ledger = buildLedger(state, "2026-09");
  const row = ledger.rows.find((item) => item.member.id === member.id) ?? ledger.rows[0];
  const shops = state.bazaar.filter((item) => item.memberId === member.id && item.date.startsWith("2026-09"));
  const paidBills = state.bills.filter((item) => item.memberId === member.id && item.date.startsWith("2026-09"));
  const guests = state.guests.filter((item) => item.memberId === member.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-[28px] p-5" style={{ background: member.tint }}>
        <p className="text-sm">{member.role}</p>
        <h1 className="text-3xl font-bold">{member.name}</h1>
        <p className="mt-4 text-sm">সেপ্টেম্বরের ব্যালেন্স</p>
        <p className="text-4xl font-bold tracking-tight">{row.net >= 0 ? "পাবে" : "দিবে"} {taka(Math.abs(row.net))}</p>
        <div className="mt-4">
          <Spark values={ledger.daily.map((day) => day.meals)} color={member.ink} />
        </div>
      </div>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cell label="মিল" value={mealText(row.meals)} />
        <Cell label="খাবার" value={taka(row.food)} />
        <Cell label="বাজার" value={taka(row.bazaar)} />
        <Cell label="বিল দিয়েছে" value={taka(row.billsPaid)} />
      </section>
      <p className="text-sm text-[#5C5872]">খাবার {taka(row.food)} + বিলের ভাগ {taka(row.share)}। দিয়েছে {taka(row.paid)}।</p>
      {!!guests.length && <p className="text-sm">অতিথি: {guests.map((guest) => `${Number(guest.date.slice(8))} তারিখ দুপুর ${guest.count} জন`).join(", ")}। এই মিল তার নামেই আছে।</p>}
      <section className="rounded-[24px] border border-[#F3EEF9] p-4">
        <h2 className="font-semibold">বাজারের লেখা</h2>
        <div className="mt-3 space-y-3">
          {shops.map((shop) => (
            <article key={shop.id}>
              <div className="flex justify-between text-sm"><span className="text-[#8E8AA3]">{Number(shop.date.slice(8))} সেপ্টেম্বর</span><span className="font-semibold">{taka(shop.amount)}</span></div>
              <p className="whitespace-pre-wrap text-sm leading-5">{shop.note}</p>
            </article>
          ))}
        </div>
      </section>
      {!!paidBills.length && (
        <section className="rounded-[24px] border border-[#F3EEF9] p-4">
          <h2 className="font-semibold">যে বিল দিয়েছেন</h2>
          {paidBills.map((bill) => (
            <div key={bill.id} className="mt-2 flex justify-between text-sm"><span>{bill.title}</span><span className="font-semibold">{taka(bill.amount)}</span></div>
          ))}
        </section>
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

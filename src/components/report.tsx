"use client";

import { useState } from "react";
import { mealText, taka } from "@/lib/format";
import { buildLedger, memberById, members } from "@/lib/model";
import { useMess } from "@/lib/store";

export function Report() {
  const { state, approve, adjustAmount } = useMess();
  const ledger = buildLedger(state, "2026-09");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function commit(kind: "bazaar" | "bill", id: string) {
    const amount = Number(draft);
    if (!amount && amount !== 0) return;
    adjustAmount(kind, id, amount);
    setEditId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[#8E8AA3]">১ অক্টোবর তৈরি</p>
          <h1 className="text-2xl font-bold">সেপ্টেম্বরের রিপোর্ট</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${state.approved ? "bg-[#E5F8EC] text-[#128A4A]" : "bg-[#F1EAFF] text-[#6C4DFF]"}`}>
          {state.approved ? "ম্যানেজার অ্যাপ্রুভ করেছেন" : "ম্যানেজার এখনো অ্যাপ্রুভ করেননি"}
        </span>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="মোট বাজার" value={taka(ledger.totalBazaar)} tint="#C9F8E4" />
        <Tile label="মোট মিল" value={mealText(ledger.totalMeals)} tint="#E4D4FF" />
        <Tile label="প্রতি মিল" value={ledger.rate == null ? "—" : taka(ledger.rate)} tint="#FFE6A8" />
        <Tile label="ঘরের বিল" value={taka(ledger.totalBills)} tint="#D9F5B0" />
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#F3EEF9]">
        <div className="hidden grid-cols-6 gap-2 bg-[#FAF8FF] px-4 py-3 text-xs text-[#8E8AA3] lg:grid">
          <span>সদস্য</span><span>মিল</span><span>খাবার</span><span>দিয়েছে</span><span>বিলের ভাগ</span><span className="text-right">ফলাফল</span>
        </div>
        {ledger.rows.map((row) => (
          <div key={row.member.id} className="grid gap-1 border-t border-[#F3EEF9] px-4 py-3 lg:grid-cols-6 lg:items-center">
            <p className="font-semibold">{row.member.name}</p>
            <p className="text-sm">{mealText(row.meals)} মিল</p>
            <p className="text-sm">{taka(row.food)}</p>
            <p className="text-sm">{taka(row.paid)}</p>
            <p className="text-sm">{taka(row.share)}</p>
            <p className={`text-sm font-semibold lg:text-right ${row.net >= 0 ? "text-[#128A4A]" : "text-[#E11D48]"}`}>
              {row.net >= 0 ? "পাবে" : "দিবে"} {taka(Math.abs(row.net))}
            </p>
          </div>
        ))}
      </section>

      {state.approved && (
        <p className="rounded-[22px] bg-[#E5F8EC] px-4 py-3 text-sm">
          সবাই দেখতে পাচ্ছে রিপোর্ট অ্যাপ্রুভ হয়েছে। যার দিতে হবে, সে {memberById("anik").short}র কাছে জমা দেবে। যার পাওনা, সে {memberById("anik").short}র কাছ থেকে নেবে। ২০ অক্টোবর রাত পর্যন্ত ভুল সারানো যাবে। সারালে অ্যাপ্রুভ আবার খুলবে।
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="h-12 rounded-2xl bg-[#6C4DFF] px-5 font-semibold text-white disabled:opacity-40" disabled={state.approved} onClick={approve} type="button">
          রিপোর্ট অ্যাপ্রুভ
        </button>
        <p className="self-center text-xs text-[#8E8AA3]">অ্যাপ্রুভের তারিখ বাঁধা নেই। সংখ্যা বদল ২০ তারিখ পর্যন্ত।</p>
      </div>

      <section className="grid gap-3 lg:grid-cols-2">
        <Editor title="বাজারের অঙ্ক" rows={state.bazaar.filter((row) => row.date.startsWith("2026-09"))} kind="bazaar" editId={editId} draft={draft} setDraft={setDraft} setEditId={setEditId} commit={commit} />
        <Editor title="ঘরের বিল" rows={state.bills.filter((row) => row.date.startsWith("2026-09")).map((row) => ({ ...row, note: row.title }))} kind="bill" editId={editId} draft={draft} setDraft={setDraft} setEditId={setEditId} commit={commit} />
      </section>
    </div>
  );
}

function Tile({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="rounded-[22px] p-4" style={{ background: tint }}>
      <p className="text-xs text-[#5C5872]">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function Editor({
  title,
  rows,
  kind,
  editId,
  draft,
  setDraft,
  setEditId,
  commit,
}: {
  title: string;
  rows: { id: string; memberId: string; amount: number; note: string }[];
  kind: "bazaar" | "bill";
  editId: string | null;
  draft: string;
  setDraft: (value: string) => void;
  setEditId: (value: string | null) => void;
  commit: (kind: "bazaar" | "bill", id: string) => void;
}) {
  return (
    <article className="rounded-[24px] border border-[#F3EEF9] p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{row.note.split("\n")[0]}</p>
              <p className="text-[11px] text-[#8E8AA3]">{members.find((member) => member.id === row.memberId)?.short}</p>
            </div>
            {editId === row.id ? (
              <span className="flex items-center gap-1">
                <input className="h-9 w-24 rounded-xl bg-[#F6F4FB] px-2" value={draft} onChange={(event) => setDraft(event.target.value)} />
                <button className="text-xs font-semibold text-[#6C4DFF]" onClick={() => commit(kind, row.id)} type="button">সেভ</button>
              </span>
            ) : (
              <button className="font-semibold" onClick={() => { setEditId(row.id); setDraft(String(row.amount)); }} type="button">{taka(row.amount)}</button>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

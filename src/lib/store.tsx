"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  type AppState,
  type BillEntry,
  type BazaarEntry,
  type Duty,
  type GuestEntry,
  type MealMark,
  type MemberId,
  type MonthId,
  buildLedger,
  initialState,
  writeMark,
} from "./model";

type Store = {
  state: AppState;
  month: MonthId;
  setMonth: (month: MonthId) => void;
  ledger: ReturnType<typeof buildLedger>;
  saveMeal: (memberId: MemberId, date: string, mark: MealMark) => void;
  setKitchen: (date: string, closed: boolean) => void;
  addBazaar: (entry: BazaarEntry) => void;
  addBill: (entry: BillEntry) => void;
  addGuest: (entry: GuestEntry) => void;
  adjustAmount: (kind: "bazaar" | "bill", id: string, amount: number) => void;
  approve: () => void;
  addDuty: (duty: Duty) => void;
  toggleDuty: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

function affectsReport(date: string) {
  return date.startsWith("2026-09");
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [month, setMonth] = useState<MonthId>("2026-09");
  const ledger = useMemo(() => buildLedger(state, month), [state, month]);

  const value = useMemo<Store>(() => {
    const unapprove = (date: string, prev: AppState) => (affectsReport(date) ? false : prev.approved);
    return {
      state,
      month,
      setMonth,
      ledger,
      saveMeal: (memberId, date, mark) => {
        setState((prev) => ({
          ...prev,
          meals: writeMark(prev.meals, memberId, date, mark),
          approved: unapprove(date, prev),
        }));
      },
      setKitchen: (date, closed) => {
        setState((prev) => ({
          ...prev,
          kitchenClosed: closed ? [...new Set([...prev.kitchenClosed, date])] : prev.kitchenClosed.filter((item) => item !== date),
          approved: unapprove(date, prev),
        }));
      },
      addBazaar: (entry) => {
        setState((prev) => ({ ...prev, bazaar: [entry, ...prev.bazaar], approved: unapprove(entry.date, prev) }));
      },
      addBill: (entry) => {
        setState((prev) => ({ ...prev, bills: [entry, ...prev.bills], approved: unapprove(entry.date, prev) }));
      },
      addGuest: (entry) => {
        setState((prev) => ({ ...prev, guests: [entry, ...prev.guests], approved: unapprove(entry.date, prev) }));
      },
      adjustAmount: (kind, id, amount) => {
        setState((prev) => {
          const list = kind === "bazaar" ? prev.bazaar : prev.bills;
          const row = list.find((item) => item.id === id);
          const nextList = list.map((item) => (item.id === id ? { ...item, amount } : item));
          return {
            ...prev,
            bazaar: kind === "bazaar" ? (nextList as BazaarEntry[]) : prev.bazaar,
            bills: kind === "bill" ? (nextList as BillEntry[]) : prev.bills,
            approved: row && affectsReport(row.date) ? false : prev.approved,
          };
        });
      },
      approve: () => setState((prev) => ({ ...prev, approved: true })),
      addDuty: (duty) => setState((prev) => ({ ...prev, duties: [...prev.duties, duty] })),
      toggleDuty: (id) => {
        setState((prev) => ({
          ...prev,
          dutyDone: prev.dutyDone.includes(id) ? prev.dutyDone.filter((item) => item !== id) : [...prev.dutyDone, id],
        }));
      },
    };
  }, [ledger, month, state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMess() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useMess");
  return store;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, dayOf, daysInMonth, dhakaToday, monthOf, monthRange } from "./dates";
import { explain } from "./errors";
import {
  type AppState,
  type BazaarEntry,
  type BillEntry,
  type Duty,
  type GuestEntry,
  type Ledger,
  type MealMark,
  type Member,
  type Mess,
  type MessContext,
  type Slot,
  buildLedger,
  emptyState,
  mealKey,
  writeMark,
} from "./model";
import { createClient } from "./supabase/client";

type Kind = "bazaar" | "bill";

type Store = {
  mess: Mess;
  members: Member[];
  activeMembers: Member[];
  me: Member;
  isManager: boolean;
  today: string;
  months: string[];
  month: string;
  setMonth: (month: string) => void;
  ensureMonth: (month: string) => void;
  monthReady: (month: string) => boolean;
  ready: boolean;
  failed: boolean;
  retry: () => void;
  state: AppState;
  ledger: Ledger;
  ledgerFor: (month: string) => Ledger;
  memberById: (id: string) => Member | undefined;
  notice: string | null;
  clearNotice: () => void;
  say: (text: string) => void;
  saveMeal: (memberId: string, date: string, mark: MealMark) => Promise<boolean>;
  setKitchen: (date: string, closed: boolean) => Promise<boolean>;
  addBazaar: (entry: { memberId: string; date: string; note: string; amount: number }) => Promise<boolean>;
  addBill: (entry: { memberId: string; date: string; title: string; amount: number }) => Promise<boolean>;
  updateAmount: (kind: Kind, id: string, amount: number) => Promise<boolean>;
  removeEntry: (kind: Kind, id: string) => Promise<boolean>;
  addGuest: (entry: { memberId: string; date: string; slot: Slot; count: number }) => Promise<boolean>;
  removeGuest: (id: string) => Promise<boolean>;
  approve: (month: string) => Promise<boolean>;
  addDuties: (rows: { name: string; date: string; memberId: string; kind: Duty["kind"] }[]) => Promise<boolean>;
  toggleDuty: (id: string) => Promise<boolean>;
  removeDuty: (id: string) => Promise<boolean>;
};

type DbError = { message: string; code?: string };
type Page = { data: unknown[] | null; error: DbError | null };

type MealRow = { user_id: string; day: string; breakfast: boolean; lunch: boolean; dinner: boolean };
type BazaarRow = { id: string; user_id: string; day: string; note: string; amount: number | string; created_by: string };
type BillRow = { id: string; user_id: string; day: string; title: string; amount: number | string; created_by: string };
type GuestRow = { id: string; host_id: string; day: string; slot: Slot; count: number };
type DutyRow = { id: string; name: string; day: string; user_id: string; kind: Duty["kind"]; done_at: string | null };

type MonthData = {
  month: string;
  meals: Record<string, MealMark>;
  kitchenClosed: string[];
  bazaar: BazaarEntry[];
  bills: BillEntry[];
  guests: GuestEntry[];
};

const BAZAAR_COLS = "id, user_id, day, note, amount, created_by";
const BILL_COLS = "id, user_id, day, title, amount, created_by";
const GUEST_COLS = "id, host_id, day, slot, count";
const DUTY_COLS = "id, name, day, user_id, kind, done_at";

const toBazaar = (row: BazaarRow): BazaarEntry => ({
  id: row.id,
  memberId: row.user_id,
  date: row.day,
  note: row.note,
  amount: Number(row.amount),
  createdBy: row.created_by,
});
const toBill = (row: BillRow): BillEntry => ({
  id: row.id,
  memberId: row.user_id,
  date: row.day,
  title: row.title,
  amount: Number(row.amount),
  createdBy: row.created_by,
});
const toGuest = (row: GuestRow): GuestEntry => ({ id: row.id, memberId: row.host_id, date: row.day, slot: row.slot, count: row.count });
const toDuty = (row: DutyRow): Duty => ({
  id: row.id,
  name: row.name,
  date: row.day,
  memberId: row.user_id,
  kind: row.kind,
  done: Boolean(row.done_at),
});

const newestFirst = (a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date);

async function pages(run: (from: number, to: number) => PromiseLike<Page>) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await run(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

function mergeMonth(prev: AppState, data: MonthData): AppState {
  const inMonth = (date: string) => date.startsWith(data.month);
  const meals = Object.fromEntries(Object.entries(prev.meals).filter(([key]) => !inMonth(key.split("|")[1])));
  return {
    ...prev,
    meals: { ...meals, ...data.meals },
    kitchenClosed: [...prev.kitchenClosed.filter((date) => !inMonth(date)), ...data.kitchenClosed],
    bazaar: [...prev.bazaar.filter((row) => !inMonth(row.date)), ...data.bazaar].sort(newestFirst),
    bills: [...prev.bills.filter((row) => !inMonth(row.date)), ...data.bills].sort(newestFirst),
    guests: [...prev.guests.filter((row) => !inMonth(row.date)), ...data.guests],
  };
}

const reopen = (prev: AppState, date: string) => prev.approvals.filter((month) => month !== monthOf(date));

const Ctx = createContext<Store | null>(null);

export function MessProvider({ context, children }: { context: MessContext | null; children: React.ReactNode }) {
  if (!context) return <>{children}</>;
  return <LiveMess context={context}>{children}</LiveMess>;
}

function LiveMess({ context, children }: { context: MessContext; children: React.ReactNode }) {
  const { mess, members, userId } = context;
  const db = useMemo(() => createClient(), []);
  const [today, setToday] = useState(() => dhakaToday());
  const current = monthOf(today);
  const first = monthOf(mess.createdOn) < current ? monthOf(mess.createdOn) : current;
  const months = useMemo(() => monthRange(first, current), [first, current]);
  const [month, setMonthState] = useState(current);
  const [state, setState] = useState<AppState>(emptyState);
  const [loaded, setLoaded] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const loadedRef = useRef<string[]>([]);
  const lastSync = useRef(0);

  const fetchMonth = useCallback(
    async (target: string): Promise<MonthData> => {
      if (!db) throw new Error("offline");
      const from = `${target}-01`;
      const to = dayOf(target, daysInMonth(target));
      const scoped = (table: string, cols: string) => db.from(table).select(cols).eq("mess_id", mess.id).gte("day", from).lte("day", to);
      const [meals, closed, guests, bazaar, bills] = await Promise.all([
        pages((a, b) => scoped("meals", "user_id, day, breakfast, lunch, dinner").order("day").order("user_id").range(a, b)),
        pages((a, b) => scoped("kitchen_closed", "day").order("day").range(a, b)),
        pages((a, b) => scoped("guests", GUEST_COLS).order("day").order("id").range(a, b)),
        pages((a, b) => scoped("bazaar", BAZAAR_COLS).order("day", { ascending: false }).order("created_at", { ascending: false }).range(a, b)),
        pages((a, b) => scoped("expenses", BILL_COLS).order("day", { ascending: false }).order("created_at", { ascending: false }).range(a, b)),
      ]);
      return {
        month: target,
        meals: Object.fromEntries(
          (meals as MealRow[]).map((row) => [mealKey(row.user_id, row.day), { b: row.breakfast, l: row.lunch, d: row.dinner }]),
        ),
        kitchenClosed: (closed as { day: string }[]).map((row) => row.day),
        guests: (guests as GuestRow[]).map(toGuest),
        bazaar: (bazaar as BazaarRow[]).map(toBazaar),
        bills: (bills as BillRow[]).map(toBill),
      };
    },
    [db, mess.id],
  );

  const sync = useCallback(
    async (targets: string[], day: string) => {
      if (!db) throw new Error("offline");
      const [data, duties, approvals] = await Promise.all([
        Promise.all(targets.map(fetchMonth)),
        pages((a, b) =>
          db
            .from("duties")
            .select(DUTY_COLS)
            .eq("mess_id", mess.id)
            .gte("day", addDays(day, -7))
            .lte("day", addDays(day, 62))
            .order("day")
            .order("id")
            .range(a, b),
        ),
        pages((a, b) => db.from("month_approvals").select("month").eq("mess_id", mess.id).order("month").range(a, b)),
      ]);
      setState((prev) => ({
        ...data.reduce(mergeMonth, prev),
        duties: (duties as DutyRow[]).map(toDuty),
        approvals: (approvals as { month: string }[]).map((row) => monthOf(row.month)),
      }));
      const next = [...new Set([...loadedRef.current, ...targets])];
      loadedRef.current = next;
      setLoaded(next);
      lastSync.current = Date.now();
    },
    [db, fetchMonth, mess.id],
  );

  useEffect(() => {
    let alive = true;
    const targets = [current, addMonths(current, -1)].filter((item) => item >= first);
    sync([...new Set([...loadedRef.current, ...targets])], today)
      .then(() => {
        if (!alive) return;
        setReady(true);
        setFailed(false);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt, current, first, sync, today]);

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") return;
      setToday(dhakaToday());
      if (Date.now() - lastSync.current < 30_000) return;
      sync(loadedRef.current, dhakaToday()).catch(() => undefined);
    }
    const timer = window.setInterval(() => setToday(dhakaToday()), 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [sync]);

  const ledger = useMemo(() => buildLedger(state, members, month), [members, month, state]);
  const me = members.find((member) => member.id === userId) ?? members[0];
  const activeMembers = useMemo(() => members.filter((member) => !member.leftOn), [members]);

  const clearNotice = useCallback(() => setNotice(null), []);

  function fail(error: DbError | null) {
    setNotice(explain(error));
    return false;
  }

  const ensureMonth = useCallback(
    (target: string) => {
      if (loadedRef.current.includes(target)) return;
      sync([target], dhakaToday()).catch(() => setNotice("এই মাসের হিসাব আনা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।"));
    },
    [sync],
  );

  function setMonth(target: string) {
    setMonthState(target);
    ensureMonth(target);
  }

  const value: Store = {
    mess,
    members,
    activeMembers,
    me,
    isManager: me.role === "manager",
    today,
    months,
    month,
    setMonth,
    ensureMonth,
    monthReady: (target) => loaded.includes(target),
    ready,
    failed,
    retry: () => {
      setFailed(false);
      setAttempt((count) => count + 1);
    },
    state,
    ledger,
    ledgerFor: (target) => (target === month ? ledger : buildLedger(state, members, target)),
    memberById: (id) => members.find((member) => member.id === id),
    notice,
    clearNotice,
    say: setNotice,

    saveMeal: async (memberId, date, mark) => {
      if (!db) return fail(null);
      const before = state.meals[mealKey(memberId, date)];
      setState((prev) => ({ ...prev, meals: writeMark(prev.meals, memberId, date, mark), approvals: reopen(prev, date) }));
      const { error } = await db
        .from("meals")
        .upsert(
          { mess_id: mess.id, user_id: memberId, day: date, breakfast: mark.b, lunch: mark.l, dinner: mark.d },
          { onConflict: "mess_id,user_id,day" },
        );
      if (!error) return true;
      setState((prev) => ({ ...prev, meals: writeMark(prev.meals, memberId, date, before) }));
      return fail(error);
    },

    setKitchen: async (date, closed) => {
      if (!db) return fail(null);
      const { error } = closed
        ? await db.from("kitchen_closed").insert({ mess_id: mess.id, day: date })
        : await db.from("kitchen_closed").delete().eq("mess_id", mess.id).eq("day", date);
      if (error) return fail(error);
      setState((prev) => ({
        ...prev,
        kitchenClosed: closed ? [...new Set([...prev.kitchenClosed, date])] : prev.kitchenClosed.filter((item) => item !== date),
        approvals: reopen(prev, date),
      }));
      return true;
    },

    addBazaar: async ({ memberId, date, note, amount }) => {
      if (!db) return fail(null);
      const { data, error } = await db
        .from("bazaar")
        .insert({ mess_id: mess.id, user_id: memberId, day: date, note, amount })
        .select(BAZAAR_COLS)
        .single();
      if (error || !data) return fail(error);
      setState((prev) => ({ ...prev, bazaar: [toBazaar(data as BazaarRow), ...prev.bazaar].sort(newestFirst), approvals: reopen(prev, date) }));
      return true;
    },

    addBill: async ({ memberId, date, title, amount }) => {
      if (!db) return fail(null);
      const { data, error } = await db
        .from("expenses")
        .insert({ mess_id: mess.id, user_id: memberId, day: date, title, amount })
        .select(BILL_COLS)
        .single();
      if (error || !data) return fail(error);
      setState((prev) => ({ ...prev, bills: [toBill(data as BillRow), ...prev.bills].sort(newestFirst), approvals: reopen(prev, date) }));
      return true;
    },

    updateAmount: async (kind, id, amount) => {
      if (!db) return fail(null);
      const table = kind === "bazaar" ? "bazaar" : "expenses";
      const { data, error } = await db.from(table).update({ amount }).eq("id", id).select("id, day");
      if (error) return fail(error);
      if (!data?.length) return fail({ message: "row-level security", code: "42501" });
      const date = (data[0] as { day: string }).day;
      setState((prev) => ({
        ...prev,
        bazaar: kind === "bazaar" ? prev.bazaar.map((row) => (row.id === id ? { ...row, amount } : row)) : prev.bazaar,
        bills: kind === "bill" ? prev.bills.map((row) => (row.id === id ? { ...row, amount } : row)) : prev.bills,
        approvals: reopen(prev, date),
      }));
      return true;
    },

    removeEntry: async (kind, id) => {
      if (!db) return fail(null);
      const table = kind === "bazaar" ? "bazaar" : "expenses";
      const { data, error } = await db.from(table).delete().eq("id", id).select("id, day");
      if (error) return fail(error);
      if (!data?.length) return fail({ message: "row-level security", code: "42501" });
      const date = (data[0] as { day: string }).day;
      setState((prev) => ({
        ...prev,
        bazaar: kind === "bazaar" ? prev.bazaar.filter((row) => row.id !== id) : prev.bazaar,
        bills: kind === "bill" ? prev.bills.filter((row) => row.id !== id) : prev.bills,
        approvals: reopen(prev, date),
      }));
      return true;
    },

    addGuest: async ({ memberId, date, slot, count }) => {
      if (!db) return fail(null);
      const { data, error } = await db
        .from("guests")
        .insert({ mess_id: mess.id, host_id: memberId, day: date, slot, count })
        .select(GUEST_COLS)
        .single();
      if (error || !data) return fail(error);
      setState((prev) => ({ ...prev, guests: [...prev.guests, toGuest(data as GuestRow)], approvals: reopen(prev, date) }));
      return true;
    },

    removeGuest: async (id) => {
      if (!db) return fail(null);
      const { data, error } = await db.from("guests").delete().eq("id", id).select("id, day");
      if (error) return fail(error);
      if (!data?.length) return fail({ message: "row-level security", code: "42501" });
      const date = (data[0] as { day: string }).day;
      setState((prev) => ({ ...prev, guests: prev.guests.filter((row) => row.id !== id), approvals: reopen(prev, date) }));
      return true;
    },

    approve: async (target) => {
      if (!db) return fail(null);
      const { error } = await db.rpc("approve_month", { p_mess: mess.id, p_month: `${target}-01` });
      if (error) return fail(error);
      setState((prev) => ({ ...prev, approvals: [...new Set([...prev.approvals, target])] }));
      return true;
    },

    addDuties: async (rows) => {
      if (!db) return fail(null);
      if (!rows.length) return true;
      const { data, error } = await db
        .from("duties")
        .insert(rows.map((row) => ({ mess_id: mess.id, name: row.name, day: row.date, user_id: row.memberId, kind: row.kind })))
        .select(DUTY_COLS);
      if (error) return fail(error);
      const added = ((data ?? []) as DutyRow[]).map(toDuty);
      setState((prev) => ({ ...prev, duties: [...prev.duties, ...added].sort((a, b) => a.date.localeCompare(b.date)) }));
      return true;
    },

    toggleDuty: async (id) => {
      if (!db) return fail(null);
      const { data, error } = await db.rpc("toggle_duty", { p_id: id });
      if (error) return fail(error);
      setState((prev) => ({ ...prev, duties: prev.duties.map((duty) => (duty.id === id ? { ...duty, done: Boolean(data) } : duty)) }));
      return true;
    },

    removeDuty: async (id) => {
      if (!db) return fail(null);
      const { error } = await db.from("duties").delete().eq("id", id);
      if (error) return fail(error);
      setState((prev) => ({ ...prev, duties: prev.duties.filter((duty) => duty.id !== id) }));
      return true;
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMess() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useMess outside a mess");
  return store;
}

export function useMaybeMess() {
  return useContext(Ctx);
}

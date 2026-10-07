import { dayOf, daysInMonth } from "./dates";

export type Slot = "b" | "l" | "d";
export type MealMark = { b: boolean; l: boolean; d: boolean };
export type Role = "manager" | "member";

export type Member = {
  id: string;
  name: string;
  short: string;
  avatarUrl: string | null;
  role: Role;
  joinedOn: string;
  leftOn: string | null;
  tint: string;
  ink: string;
};

export type Mess = {
  id: string;
  name: string;
  inviteCode: string;
  slots: MealMark;
  createdOn: string;
};

export type MessContext = {
  userId: string;
  mess: Mess;
  members: Member[];
};

export type BazaarEntry = {
  id: string;
  memberId: string;
  date: string;
  note: string;
  amount: number;
  createdBy: string;
};

export type BillEntry = {
  id: string;
  memberId: string;
  date: string;
  title: string;
  amount: number;
  createdBy: string;
};

export type GuestEntry = {
  id: string;
  memberId: string;
  date: string;
  slot: Slot;
  count: number;
};

export type Duty = {
  id: string;
  name: string;
  date: string;
  memberId: string;
  kind: "bathroom" | "custom";
  done: boolean;
};

export type AppState = {
  meals: Record<string, MealMark>;
  kitchenClosed: string[];
  bazaar: BazaarEntry[];
  bills: BillEntry[];
  guests: GuestEntry[];
  duties: Duty[];
  approvals: string[];
};

export const emptyState: AppState = {
  meals: {},
  kitchenClosed: [],
  bazaar: [],
  bills: [],
  guests: [],
  duties: [],
  approvals: [],
};

export const SLOTS: { key: Slot; label: string; weight: number }[] = [
  { key: "b", label: "সকাল", weight: 0.5 },
  { key: "l", label: "দুপুর", weight: 1 },
  { key: "d", label: "রাত", weight: 1 },
];

const palette = [
  { tint: "#C9F8E4", ink: "#0B7A52" },
  { tint: "#E4D4FF", ink: "#6C4DFF" },
  { tint: "#FFE6A8", ink: "#A16207" },
  { tint: "#D9F5B0", ink: "#3F6212" },
  { tint: "#FFDCE5", ink: "#BE185D" },
  { tint: "#D6ECFF", ink: "#1D4ED8" },
];

export function tone(index: number) {
  return palette[index % palette.length];
}

export function shortName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function slotWeight(slot: Slot) {
  return slot === "b" ? 0.5 : 1;
}

export function markWeight(mark: MealMark | undefined) {
  if (!mark) return 0;
  return (mark.b ? 0.5 : 0) + (mark.l ? 1 : 0) + (mark.d ? 1 : 0);
}

export function mealKey(memberId: string, date: string) {
  return `${memberId}|${date}`;
}

export function readMark(state: AppState, memberId: string, date: string) {
  return state.meals[mealKey(memberId, date)];
}

/** A row with every slot off is still a submission: "ate nothing", not "forgot". */
export function writeMark(meals: AppState["meals"], memberId: string, date: string, mark: MealMark | undefined) {
  const next = { ...meals };
  const key = mealKey(memberId, date);
  if (mark) next[key] = mark;
  else delete next[key];
  return next;
}

export type PersonRow = {
  member: Member;
  meals: number;
  food: number;
  bazaar: number;
  billsPaid: number;
  paid: number;
  share: number;
  net: number;
};

export type Ledger = {
  month: string;
  days: number;
  totalMeals: number;
  totalBazaar: number;
  totalBills: number;
  rate: number | null;
  share: number;
  rows: PersonRow[];
  daily: { day: number; date: string; meals: number; closed: boolean }[];
  slots: { b: number; l: number; d: number };
  closedDays: number;
};

/** Members who belong in a month: active during it, or with any entry in it. */
export function monthMembers(state: AppState, members: Member[], month: string) {
  const start = `${month}-01`;
  const end = dayOf(month, daysInMonth(month));
  const touched = new Set<string>();
  for (const key of Object.keys(state.meals)) {
    const [id, date] = key.split("|");
    if (date.startsWith(month)) touched.add(id);
  }
  for (const row of [...state.bazaar, ...state.bills, ...state.guests]) {
    if (row.date.startsWith(month)) touched.add(row.memberId);
  }
  return members.filter((member) => (member.joinedOn <= end && (!member.leftOn || member.leftOn >= start)) || touched.has(member.id));
}

export function buildLedger(state: AppState, members: Member[], month: string): Ledger {
  const days = daysInMonth(month);
  const people = monthMembers(state, members, month);
  const closed = new Set(state.kitchenClosed.filter((date) => date.startsWith(month)));
  const daily = Array.from({ length: days }, (_, index) => {
    const date = dayOf(month, index + 1);
    return { day: index + 1, date, meals: 0, closed: closed.has(date) };
  });
  const slots = { b: 0, l: 0, d: 0 };
  const mealsBy = new Map<string, number>(people.map((member) => [member.id, 0]));

  people.forEach((member) => {
    for (let day = 1; day <= days; day += 1) {
      const date = dayOf(month, day);
      if (closed.has(date)) continue;
      const mark = state.meals[mealKey(member.id, date)];
      if (!mark) continue;
      const weight = markWeight(mark);
      mealsBy.set(member.id, (mealsBy.get(member.id) ?? 0) + weight);
      daily[day - 1].meals += weight;
      if (mark.b) slots.b += 0.5;
      if (mark.l) slots.l += 1;
      if (mark.d) slots.d += 1;
    }
  });

  state.guests.forEach((guest) => {
    if (!guest.date.startsWith(month) || closed.has(guest.date) || !mealsBy.has(guest.memberId)) return;
    const weight = slotWeight(guest.slot) * guest.count;
    mealsBy.set(guest.memberId, (mealsBy.get(guest.memberId) ?? 0) + weight);
    daily[Number(guest.date.slice(8, 10)) - 1].meals += weight;
    slots[guest.slot] += weight;
  });

  const bazaarRows = state.bazaar.filter((row) => row.date.startsWith(month));
  const billRows = state.bills.filter((row) => row.date.startsWith(month));
  const totalMeals = [...mealsBy.values()].reduce((sum, value) => sum + value, 0);
  const totalBazaar = bazaarRows.reduce((sum, row) => sum + row.amount, 0);
  const totalBills = billRows.reduce((sum, row) => sum + row.amount, 0);
  const rate = totalMeals > 0 ? totalBazaar / totalMeals : null;
  const share = people.length ? totalBills / people.length : 0;

  const raw = people.map((member) => {
    const meals = mealsBy.get(member.id) ?? 0;
    const food = rate == null ? 0 : meals * rate;
    const bazaar = bazaarRows.filter((row) => row.memberId === member.id).reduce((sum, row) => sum + row.amount, 0);
    const billsPaid = billRows.filter((row) => row.memberId === member.id).reduce((sum, row) => sum + row.amount, 0);
    const paid = bazaar + billsPaid;
    return { member, meals, food, bazaar, billsPaid, paid, share, net: paid - food - share };
  });

  const rounded = raw.map((row) => Math.round(row.net));
  const drift = rounded.reduce((sum, value) => sum + value, 0);
  if (rounded.length) rounded[0] -= drift;

  return {
    month,
    days,
    totalMeals,
    totalBazaar,
    totalBills,
    rate,
    share,
    rows: raw.map((row, index) => ({ ...row, net: rounded[index] })),
    daily,
    slots,
    closedDays: closed.size,
  };
}

export function suggestTotal(raw: string) {
  const text = raw.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
  const explicit = text.match(/(?:মোট|total)\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (explicit) return Number(explicit[1]);
  const nums = [...text.matchAll(/(\d{2,7})/g)].map((match) => Number(match[1]));
  if (nums.length >= 2) {
    const last = nums[nums.length - 1];
    const head = nums.slice(0, -1).reduce((sum, value) => sum + value, 0);
    if (head === last) return last;
  }
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0);
}

export function upcomingDuty(state: AppState, today: string) {
  return state.duties
    .filter((duty) => duty.date >= today && !duty.done)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

export type MessPlan = "free" | "mess";

export type MessSubscription = {
  messId: string;
  plan: MessPlan;
  status: "trialing" | "active" | "past_due" | "canceled";
};

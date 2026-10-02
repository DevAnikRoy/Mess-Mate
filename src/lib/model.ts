export const TODAY = "2026-10-02";

export type MemberId = "anik" | "tanmoy" | "goutam" | "shuvo";
export type MonthId = "2026-09" | "2026-10";
export type Slot = "b" | "l" | "d";

export type MealMark = { b: boolean; l: boolean; d: boolean };

export type Member = {
  id: MemberId;
  name: string;
  short: string;
  role: string;
  tint: string;
  ink: string;
};

export type BazaarEntry = {
  id: string;
  memberId: MemberId;
  date: string;
  note: string;
  amount: number;
};

export type BillEntry = {
  id: string;
  memberId: MemberId;
  date: string;
  title: string;
  amount: number;
};

export type GuestEntry = {
  id: string;
  memberId: MemberId;
  date: string;
  slot: Slot;
  count: number;
  name: string;
};

export type Duty = {
  id: string;
  name: string;
  date: string;
  memberId: MemberId;
  kind: "bathroom" | "custom";
};

export type AppState = {
  meals: Record<string, MealMark>;
  kitchenClosed: string[];
  bazaar: BazaarEntry[];
  bills: BillEntry[];
  guests: GuestEntry[];
  duties: Duty[];
  dutyDone: string[];
  approved: boolean;
};

export const MESS_NAME = "ডেমো মেস";

export const members: Member[] = [
  { id: "anik", name: "রাফি হাসান", short: "রাফি", role: "ম্যানেজার", tint: "#C9F8E4", ink: "#0B7A52" },
  { id: "tanmoy", name: "নাফিস করিম", short: "নাফিস", role: "সদস্য", tint: "#E4D4FF", ink: "#6C4DFF" },
  { id: "goutam", name: "ইমরান হোসেন", short: "ইমরান", role: "সদস্য", tint: "#FFE6A8", ink: "#A16207" },
  { id: "shuvo", name: "সজীব আহমেদ", short: "সজীব", role: "সদস্য", tint: "#D9F5B0", ink: "#3F6212" },
];

export const CURRENT_USER: MemberId = "anik";

const sept = {
  anik: [2, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 0, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5],
  tanmoy: [2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 1.5, 2.5, 2.5, 2.5, 2.5, 0, 2.5, 2, 2.5, 2.5, 2.5, 2, 2.5, 1, 1.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5],
  goutam: [2.5, 2, 2.5, 1, 1, 2.5, 2, 1.5, 2, 0.5, 2, 2.5, 1.5, 0, 1, 2.5, 2, 0, 1.5, 2, 1.5, 2.5, 2, 2, 1.5, 2, 2, 2.5, 1.5, 2],
  shuvo: [0.5, 1, 2.5, 2.5, 1, 2, 2.5, 0.5, 1.5, 1.5, 1, 0.5, 2, 0, 2.5, 2, 2, 2, 1, 1, 0, 2.5, 2, 2, 0.5, 2.5, 2, 2.5, 2, 2.5],
} as const;

function fromWeight(weight: number): MealMark {
  if (weight >= 2.5) return { b: true, l: true, d: true };
  if (weight === 2) return { b: false, l: true, d: true };
  if (weight === 1.5) return { b: true, l: true, d: false };
  if (weight === 1) return { b: false, l: true, d: false };
  if (weight === 0.5) return { b: true, l: false, d: false };
  return { b: false, l: false, d: false };
}

function iso(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

function mealKey(memberId: MemberId, date: string) {
  return `${memberId}|${date}`;
}

function seedMeals() {
  const meals: Record<string, MealMark> = {};
  (Object.keys(sept) as MemberId[]).forEach((id) => {
    sept[id].forEach((weight, index) => {
      const mark = fromWeight(weight);
      if (mark.b || mark.l || mark.d) meals[mealKey(id, iso("2026-09", index + 1))] = mark;
    });
  });
  meals[mealKey("anik", "2026-10-01")] = { b: true, l: true, d: true };
  meals[mealKey("tanmoy", "2026-10-01")] = { b: false, l: true, d: true };
  meals[mealKey("goutam", "2026-10-01")] = { b: false, l: true, d: false };
  return meals;
}

const bathroom: MemberId[] = ["anik", "tanmoy", "goutam", "shuvo"];

function seedDuties(): Duty[] {
  const duties: Duty[] = [];
  for (let day = 1; day <= 31; day += 1) {
    const date = iso("2026-10", day);
    duties.push({
      id: `bath-${date}`,
      name: "বাথরুম",
      date,
      memberId: bathroom[(day - 1) % 4],
      kind: "bathroom",
    });
  }
  return duties;
}

export function initialState(): AppState {
  return {
    meals: seedMeals(),
    kitchenClosed: ["2026-09-14"],
    bazaar: [
      { id: "b1", memberId: "anik", date: "2026-09-03", amount: 4200, note: "চাল ৫ কেজি ১৮০০\nডাল ৪০০\nসয়াবিন ২ লিটার ২০০০\nমোট ৪২০০" },
      { id: "b2", memberId: "anik", date: "2026-09-08", amount: 3800, note: "ইলিশ ২২০০\nসবজি ৯০০\nডিম ৭০০\nমোট ৩৮০০" },
      { id: "b3", memberId: "anik", date: "2026-09-15", amount: 4500, note: "মুরগি ২ কেজি ৮৪০\nদুধ ৬৪০\nমুদি ৩০২০\nমোট ৪৫০০" },
      { id: "b4", memberId: "anik", date: "2026-09-22", amount: 7500, note: "সপ্তাহের বাজার\nমাছ, মাংস, চাল, সবজি\nমোট ৭৫০০" },
      { id: "b5", memberId: "tanmoy", date: "2026-09-02", amount: 3100, note: "বাজার ৩১০০" },
      { id: "b6", memberId: "tanmoy", date: "2026-09-09", amount: 4600, note: "বাজার ৪৬০০" },
      { id: "b7", memberId: "tanmoy", date: "2026-09-16", amount: 5200, note: "বাজার ৫২০০" },
      { id: "b8", memberId: "tanmoy", date: "2026-09-24", amount: 5500, note: "বাজার ৫৫০০" },
      { id: "b9", memberId: "goutam", date: "2026-09-04", amount: 2800, note: "বাজার ২৮০০" },
      { id: "b10", memberId: "goutam", date: "2026-09-11", amount: 3600, note: "বাজার ৩৬০০" },
      { id: "b11", memberId: "goutam", date: "2026-09-18", amount: 4100, note: "বাজার ৪১০০" },
      { id: "b12", memberId: "goutam", date: "2026-09-26", amount: 3500, note: "বাজার ৩৫০০" },
      { id: "b13", memberId: "shuvo", date: "2026-09-06", amount: 2200, note: "বাজার ২২০০" },
      { id: "b14", memberId: "shuvo", date: "2026-09-12", amount: 2700, note: "বাজার ২৭০০" },
      { id: "b15", memberId: "shuvo", date: "2026-09-19", amount: 2400, note: "বাজার ২৪০০" },
      { id: "b16", memberId: "shuvo", date: "2026-09-27", amount: 2700, note: "বাজার ২৭০০" },
      { id: "b17", memberId: "anik", date: "2026-10-01", amount: 850, note: "সবজি ৪২০\nডিম ২৪০\nরুটির আটা ১৯০\nমোট ৮৫০" },
    ],
    bills: [
      { id: "bill-rent", memberId: "anik", date: "2026-09-01", title: "বাসা ভাড়া", amount: 12000 },
      { id: "bill-power", memberId: "tanmoy", date: "2026-09-28", title: "কারেন্ট বিল", amount: 2200 },
      { id: "bill-wifi", memberId: "goutam", date: "2026-09-05", title: "ওয়াইফাই", amount: 1200 },
      { id: "bill-gas", memberId: "shuvo", date: "2026-09-07", title: "গ্যাস", amount: 1800 },
      { id: "bill-bath", memberId: "shuvo", date: "2026-09-11", title: "হার্পিক ও বাথরুমের জিনিস", amount: 180 },
    ],
    guests: [
      { id: "g1", memberId: "anik", date: "2026-09-18", slot: "l", count: 1, name: "অতিথি" },
      { id: "g2", memberId: "anik", date: "2026-09-25", slot: "l", count: 1, name: "অতিথি" },
    ],
    duties: seedDuties(),
    dutyDone: ["bath-2026-10-01"],
    approved: false,
  };
}

export function slotWeight(slot: Slot) {
  return slot === "b" ? 0.5 : 1;
}

export function markWeight(mark: MealMark | undefined) {
  if (!mark) return 0;
  return (mark.b ? 0.5 : 0) + (mark.l ? 1 : 0) + (mark.d ? 1 : 0);
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
  month: MonthId;
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

function daysIn(month: MonthId) {
  return month === "2026-09" ? 30 : 31;
}

function inMonth(date: string, month: MonthId) {
  return date.startsWith(month);
}

export function buildLedger(state: AppState, month: MonthId): Ledger {
  const days = daysIn(month);
  const closed = new Set(state.kitchenClosed.filter((date) => inMonth(date, month)));
  const daily = Array.from({ length: days }, (_, index) => {
    const date = iso(month, index + 1);
    return { day: index + 1, date, meals: 0, closed: closed.has(date) };
  });
  const slots = { b: 0, l: 0, d: 0 };
  const mealByMember: Record<MemberId, number> = { anik: 0, tanmoy: 0, goutam: 0, shuvo: 0 };

  members.forEach((member) => {
    for (let day = 1; day <= days; day += 1) {
      const date = iso(month, day);
      if (closed.has(date)) continue;
      const mark = state.meals[mealKey(member.id, date)];
      const weight = markWeight(mark);
      mealByMember[member.id] += weight;
      daily[day - 1].meals += weight;
      if (mark?.b) slots.b += 0.5;
      if (mark?.l) slots.l += 1;
      if (mark?.d) slots.d += 1;
    }
  });

  state.guests.filter((guest) => inMonth(guest.date, month)).forEach((guest) => {
    if (closed.has(guest.date)) return;
    const weight = slotWeight(guest.slot) * guest.count;
    mealByMember[guest.memberId] += weight;
    const day = Number(guest.date.slice(8, 10));
    daily[day - 1].meals += weight;
    slots[guest.slot] += weight;
  });

  const totalMeals = members.reduce((sum, member) => sum + mealByMember[member.id], 0);
  const bazaarRows = state.bazaar.filter((row) => inMonth(row.date, month));
  const billRows = state.bills.filter((row) => inMonth(row.date, month));
  const totalBazaar = bazaarRows.reduce((sum, row) => sum + row.amount, 0);
  const totalBills = billRows.reduce((sum, row) => sum + row.amount, 0);
  const rate = totalMeals > 0 ? totalBazaar / totalMeals : null;
  const share = members.length ? totalBills / members.length : 0;

  const raw = members.map((member) => {
    const meals = mealByMember[member.id];
    const food = rate == null ? 0 : meals * rate;
    const bazaar = bazaarRows.filter((row) => row.memberId === member.id).reduce((sum, row) => sum + row.amount, 0);
    const billsPaid = billRows.filter((row) => row.memberId === member.id).reduce((sum, row) => sum + row.amount, 0);
    const paid = bazaar + billsPaid;
    const net = paid - food - share;
    return { member, meals, food, bazaar, billsPaid, paid, share, net };
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

export function memberById(id: MemberId) {
  return members.find((member) => member.id === id) ?? members[0];
}

export function readMark(state: AppState, memberId: MemberId, date: string) {
  return state.meals[mealKey(memberId, date)];
}

export function writeMark(meals: AppState["meals"], memberId: MemberId, date: string, mark: MealMark) {
  const next = { ...meals };
  const key = mealKey(memberId, date);
  if (!mark.b && !mark.l && !mark.d) delete next[key];
  else next[key] = mark;
  return next;
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

export function isPast(date: string) {
  return date < TODAY;
}

export type MessPlan = "free" | "mess";

export type MessSubscription = {
  messId: string;
  plan: MessPlan;
  status: "trialing" | "active" | "past_due" | "canceled";
};

export function upcomingDuty(state: AppState) {
  return state.duties
    .filter((duty) => duty.date >= TODAY && !state.dutyDone.includes(duty.id))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

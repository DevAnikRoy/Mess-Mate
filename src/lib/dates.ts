const MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const BN = "০১২৩৪৫৬৭৮৯";

const dhaka = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function bnDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => BN[Number(digit)]);
}

export function dhakaToday(now: Date = new Date()) {
  return dhaka.format(now);
}

export function monthOf(date: string) {
  return date.slice(0, 7);
}

function split(month: string) {
  const [year, index] = month.split("-").map(Number);
  return { year, index };
}

export function daysInMonth(month: string) {
  const { year, index } = split(month);
  return new Date(Date.UTC(year, index, 0)).getUTCDate();
}

export function addMonths(month: string, delta: number) {
  const { year, index } = split(month);
  const next = new Date(Date.UTC(year, index - 1 + delta, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addDays(date: string, delta: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + delta)).toISOString().slice(0, 10);
}

export function dayOf(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

export function monthRange(from: string, to: string) {
  const months: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addMonths(cursor, 1)) months.push(cursor);
  return months;
}

export function monthName(month: string) {
  return MONTHS[split(month).index - 1];
}

export function monthLabel(month: string) {
  return `${monthName(month)} ${bnDigits(split(month).year)}`;
}

export function dateLabel(date: string) {
  return `${Number(date.slice(8, 10))} ${monthName(monthOf(date))}`;
}

/** Saturday-first calendar: blank cells before the 1st. */
export function saturdayOffset(month: string) {
  const { year, index } = split(month);
  return (new Date(Date.UTC(year, index - 1, 1)).getUTCDay() + 1) % 7;
}

/** Last day the manager can still change a month's numbers. */
export function editDeadline(month: string) {
  return `${addMonths(month, 1)}-20`;
}

export function monthOpen(month: string, today: string) {
  return today <= editDeadline(month);
}

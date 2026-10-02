export function taka(amount: number) {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "−" : "";
  return `${sign}৳${Math.abs(rounded).toLocaleString("en-IN")}`;
}

export function takaExact(amount: number) {
  const sign = amount < 0 ? "−" : "";
  const abs = Math.abs(amount);
  const text = abs.toLocaleString("en-IN", {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${sign}৳${text}`;
}

export function mealText(amount: number) {
  if (!Number.isFinite(amount)) return "০";
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}

export function bnDay(iso: string) {
  const day = Number(iso.slice(8, 10));
  return String(day);
}

export function monthLabel(month: string) {
  return month === "2026-09" ? "সেপ্টেম্বর ২০২৬" : "অক্টোবর ২০২৬";
}

export function shortMonth(month: string) {
  return month === "2026-09" ? "সেপ্টেম্বর" : "অক্টোবর";
}

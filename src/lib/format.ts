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
  if (!Number.isFinite(amount)) return "0";
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}

/** Accepts Bengali or English digits; returns null when it is not a positive amount. */
export function parseAmount(raw: string) {
  const text = raw.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit))).replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const value = Number(text);
  return value > 0 && value < 10_000_000 ? value : null;
}

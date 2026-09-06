export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

export function formatCurrency(amount: number | string, currency = "INR"): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return `${CURRENCY_SYMBOLS[currency] ?? "₹"}0`;
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  const isNeg = n < 0;
  const abs = Math.abs(n);
  if (currency === "INR") {
    return (isNeg ? "-" : "") + symbol + formatIndian(abs);
  }
  return (
    (isNeg ? "-" : "") +
    symbol +
    abs.toLocaleString("en-US", { maximumFractionDigits: abs % 1 === 0 ? 0 : 2, minimumFractionDigits: 0 })
  );
}

export function formatIndian(n: number): string {
  const neg = n < 0;
  const abs = Math.abs(n);
  const [intPart, decPart] = abs.toFixed(abs % 1 === 0 ? 0 : 2).split(".");
  let out = "";
  if (intPart.length <= 3) {
    out = intPart;
  } else {
    const last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    const groups: string[] = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) groups.unshift(rest);
    out = groups.join(",") + "," + last3;
  }
  if (decPart) out += "." + decPart;
  return (neg ? "-" : "") + out;
}

export function formatCompact(amount: number | string, currency = "INR") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const symbol = CURRENCY_SYMBOLS[currency] ?? "₹";
  const abs = Math.abs(n);
  if (abs >= 10000000) return `${symbol}${(n / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${symbol}${(n / 100000).toFixed(2)} L`;
  if (abs >= 1000) return `${symbol}${(n / 1000).toFixed(1)}K`;
  return formatCurrency(n, currency);
}

export function formatDate(d: string | Date, fmt = "DD/MM/YYYY") {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mon = dt.toLocaleString("en", { month: "short" });
  if (fmt === "MM/DD/YYYY") return `${mm}/${dd}/${yyyy}`;
  if (fmt === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
  if (fmt === "DD MMM YYYY") return `${dd} ${mon} ${yyyy}`;
  return `${dd}/${mm}/${yyyy}`;
}

export function toMonthKey(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey() {
  return toMonthKey(new Date());
}

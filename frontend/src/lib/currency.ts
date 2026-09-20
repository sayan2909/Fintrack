export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  AED: "AED ",
};

export const BASE_RATES_USD: Record<string, number> = {
  USD: 1.0,
  INR: 84.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 150.0,
  CAD: 1.36,
  AUD: 1.52,
  AED: 3.67,
};

export const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
];

let liveRatesCache: { rates: Record<string, number>; timestamp: number } | null = null;

export async function fetchLiveRates(): Promise<Record<string, number>> {
  if (typeof window === "undefined") return BASE_RATES_USD;
  if (liveRatesCache && Date.now() - liveRatesCache.timestamp < 3600000) {
    return liveRatesCache.rates;
  }
  try {
    const res = await fetch("/api/currency/rates");
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data?.rates) {
        liveRatesCache = {
          rates: { ...BASE_RATES_USD, ...json.data.rates },
          timestamp: Date.now(),
        };
        return liveRatesCache.rates;
      }
    }
  } catch {}
  return BASE_RATES_USD;
}

export function getEstimatedRate(from: string, to: string): number {
  const f = (from || "INR").toUpperCase();
  const t = (to || "INR").toUpperCase();
  if (f === t) return 1.0;
  const rates = liveRatesCache?.rates ?? BASE_RATES_USD;
  const fromRate = rates[f] ?? BASE_RATES_USD[f] ?? 1.0;
  const toRate = rates[t] ?? BASE_RATES_USD[t] ?? 1.0;
  if (!fromRate || !toRate || isNaN(fromRate) || isNaN(toRate) || fromRate <= 0) return 1.0;
  return toRate / fromRate;
}

export function convertAmount(amount: number | string, from: string, to: string): number {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return 0;
  const rate = getEstimatedRate(from, to);
  const res = n * rate;
  return to.toUpperCase() === "JPY" ? Math.round(res) : Math.round(res * 100) / 100;
}

export function formatCurrency(amount: number | string, currency = "INR"): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const curr = (currency || "INR").toUpperCase();
  if (Number.isNaN(n)) return `${CURRENCY_SYMBOLS[curr] ?? "₹"}0`;
  const symbol = CURRENCY_SYMBOLS[curr] ?? curr + " ";
  const isNeg = n < 0;
  const abs = Math.abs(n);

  if (curr === "INR") {
    return (isNeg ? "-" : "") + symbol + formatIndian(abs);
  }
  if (curr === "JPY") {
    return (isNeg ? "-" : "") + symbol + Math.round(abs).toLocaleString("ja-JP");
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
  const curr = (currency || "INR").toUpperCase();
  const symbol = CURRENCY_SYMBOLS[curr] ?? "₹";
  const abs = Math.abs(n);

  if (curr === "INR") {
    if (abs >= 10000000) return `${symbol}${(n / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `${symbol}${(n / 100000).toFixed(2)} L`;
    if (abs >= 1000) return `${symbol}${(n / 1000).toFixed(1)}K`;
    return formatCurrency(n, currency);
  }

  if (abs >= 1000000) return `${symbol}${(n / 1000000).toFixed(2)}M`;
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

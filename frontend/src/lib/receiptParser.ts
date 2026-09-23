import { predictCategory } from "./categorizer";

export interface ParsedReceipt {
  merchant: string;
  amount: number | null;
  date: string | null; // ISO YYYY-MM-DD
  category: string;
  confidence: number;
  rawText: string;
  lines: string[];
}

// Noise patterns that should NOT be considered merchant names
const NOISE_LINE_PATTERNS = [
  /^(tax|retail|cash|proforma)?\s*(invoice|memo|receipt|bill|slip|voucher)/i,
  /^(customer|original|duplicate|merchant|store)\s*(copy)?$/i,
  /^gstin[:\s]|^tin[:\s]|^pan[:\s]|^cin[:\s]|^fssai[:\s]|^vat[:\s]/i,
  /^tel[:\s]|^phone[:\s]|^mob[:\s]|^mobile[:\s]|^fax[:\s]|^email[:\s]|^call[:\s]/i,
  /^www\.|\.com|\.in|\.org|\.net|https?:\/\//i,
  /^welcome|^thank\s*you|^visit\s*again|^have\s*a\s*nice/i,
  /^order\s*(#|no|id)|bill\s*(#|no|id)|table\s*(#|no)|token\s*(#|no)|kpt\s*(#|no)/i,
  /^date[:\s]|^time[:\s]|^cashier[:\s]|^pos[:\s]|^terminal[:\s]|^counter[:\s]/i,
  /^\d+[\s\-\/]\d+[\s\-\/]\d+/, // Dates
  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]/, // Time like 14:30
  /^[0-9\s\-\.\,\/]{7,}$/, // Phone numbers, barcode numbers, long IDs
  /^(road|street|st\.|ave|avenue|lane|nagar|colony|plaza|floor|block|sector|pincode|pin\s*code|pin[:\s])/i,
];

// Keywords prioritizing total amount lines
const TOTAL_KEYWORDS = [
  /(?:grand\s*total|net\s*total|final\s*total|bill\s*total)/i,
  /(?:net\s*payable|amount\s*payable|payable\s*amount|total\s*payable)/i,
  /(?:total\s*amount|total\s*amt|total\s*due|amount\s*due|balance\s*due)/i,
  /(?:total\s*inr|total\s*rs|total\s*₹)/i,
  /(?:paid\s*amount|amt\s*paid|amount\s*paid|cash\s*paid|card\s*paid)/i,
  /(?:^|\s)total(?:\s|:|$)/i,
  /(?:sub\s*total|subtotal)/i,
];

const MONTH_NAMES: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  january: "01", february: "02", march: "03", april: "04",
  june: "06", july: "07", august: "08", september: "09",
  october: "10", november: "11", december: "12"
};

/**
 * Parses raw OCR text lines from a receipt into structured transaction data.
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const merchant = extractMerchant(lines);
  const amount = extractTotalAmount(lines);
  const date = extractDate(lines, rawText);

  // Auto-categorize based on detected merchant or receipt keywords
  let categoryResult = predictCategory(merchant);
  if (categoryResult.category === "General") {
    // Attempt categorization from full text context (e.g. food items, fuel items)
    categoryResult = predictCategory(rawText.slice(0, 500));
  }

  // Calculate overall parsing confidence (0 - 100)
  let confidence = 0;
  if (merchant && merchant !== "Receipt Merchant") confidence += 40;
  if (amount !== null && amount > 0) confidence += 40;
  if (date !== null) confidence += 20;

  return {
    merchant: merchant || "Receipt Merchant",
    amount,
    date,
    category: categoryResult.category,
    confidence,
    rawText,
    lines,
  };
}

/**
 * Extracts the merchant/store name, usually in the header area.
 */
function extractMerchant(lines: string[]): string {
  // Inspect the top 6 lines of the receipt
  const candidateLines = lines.slice(0, 6);

  for (const line of candidateLines) {
    const cleaned = line.replace(/[^\w\s\.\&\-']/g, "").trim();

    // Must have at least 3 letters
    const letterCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 3) continue;

    // Check against noise patterns
    const isNoise = NOISE_LINE_PATTERNS.some((pat) => pat.test(cleaned));
    if (isNoise) continue;

    // Reject pure numbers or short tokens
    if (/^\d+$/.test(cleaned)) continue;

    // Clean up excessive whitespace and trim corporate suffixes if suitable
    const merchantName = cleaned
      .replace(/\s{2,}/g, " ")
      .replace(/\b(pvt\.?\s*ltd\.?|ltd\.?|llp|inc\.?|corp\.?|llc)\b/gi, "")
      .trim();

    if (merchantName.length >= 3) {
      return titleCase(merchantName);
    }
  }

  return "";
}

/**
 * Extracts the final total amount from receipt lines.
 */
function extractTotalAmount(lines: string[]): number | null {
  // Regex to match a price/amount format (e.g. 1,234.50 or 450.00 or ₹399)
  const currencyAmountRegex = /(?:₹|rs\.?|inr|\$|€|£)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{1,2}))(?!\w)/gi;

  // 1. Scan bottom-up for explicit Total keywords
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];

    for (const keywordRegex of TOTAL_KEYWORDS) {
      if (keywordRegex.test(line)) {
        // Extract all numbers from this line or the immediate next line (common in two-column layouts)
        const matches = Array.from(line.matchAll(currencyAmountRegex));
        if (matches.length > 0) {
          // Take the rightmost amount on a Total line
          const lastMatch = matches[matches.length - 1][1];
          const val = parseNumber(lastMatch);
          if (val > 0) return val;
        }

        // Sometimes the amount is on the next line
        if (i + 1 < lines.length) {
          const nextMatches = Array.from(lines[i + 1].matchAll(currencyAmountRegex));
          if (nextMatches.length === 1) {
            const val = parseNumber(nextMatches[0][1]);
            if (val > 0) return val;
          }
        }
      }
    }
  }

  // 2. Fallback: Find the maximum reasonable currency amount across all lines
  // Filter out unreasonable numbers (e.g. barcodes, phone numbers, invoice numbers)
  const candidateAmounts: number[] = [];
  for (const line of lines) {
    // Avoid lines with known ID headers
    if (/^(pin|tel|mob|gstin|tin|fssai|cin|pan|order|bill|token)\b/i.test(line)) continue;

    const matches = Array.from(line.matchAll(currencyAmountRegex));
    for (const match of matches) {
      const val = parseNumber(match[1]);
      // Exclude year-like values or zero/tiny cents
      if (val >= 1 && val < 500000 && !isLikelyYear(val)) {
        candidateAmounts.push(val);
      }
    }
  }

  if (candidateAmounts.length > 0) {
    // Return highest candidate
    return Math.max(...candidateAmounts);
  }

  return null;
}

/**
 * Extracts and standardizes transaction date to ISO YYYY-MM-DD.
 */
function extractDate(lines: string[], rawText: string): string | null {
  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyRegex = /\b(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d{2}|\d{2})\b/;
  // Pattern 2: YYYY-MM-DD or YYYY/MM/DD
  const ymdRegex = /\b(20\d{2})[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12][0-9]|3[01])\b/;
  // Pattern 3: DD Mon YYYY (e.g., 24 Sep 2026 or 15-Jan-2025)
  const textMonthRegex = /\b(0?[1-9]|[12][0-9]|3[01])[\s\-\.\/]([a-zA-Z]{3,9})[\s\-\.\/](20\d{2})\b/;

  // Check lines first
  for (const line of lines) {
    // DD Mon YYYY
    const tmMatch = line.match(textMonthRegex);
    if (tmMatch) {
      const day = tmMatch[1].padStart(2, "0");
      const monthStr = tmMatch[2].toLowerCase();
      const month = MONTH_NAMES[monthStr];
      const year = tmMatch[3];
      if (month) return `${year}-${month}-${day}`;
    }

    // YYYY-MM-DD
    const ymdMatch = line.match(ymdRegex);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, "0");
      const day = ymdMatch[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // DD-MM-YYYY
    const dmyMatch = line.match(dmyRegex);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, "0");
      const month = dmyMatch[2].padStart(2, "0");
      let year = dmyMatch[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
  }

  // Also check full text in case date was split
  const fullTextMatch = rawText.match(dmyRegex);
  if (fullTextMatch) {
    const day = fullTextMatch[1].padStart(2, "0");
    const month = fullTextMatch[2].padStart(2, "0");
    let year = fullTextMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  return null;
}

function parseNumber(str: string): number {
  const cleaned = str.replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function isLikelyYear(num: number): boolean {
  return num >= 2020 && num <= 2035 && Number.isInteger(num);
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

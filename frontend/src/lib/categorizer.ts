/**
 * Smart Heuristic Categorization Engine
 * Automatically maps transaction descriptions to standardized categories and transaction types.
 */

interface CategorizationResult {
  category: string;
  type: "income" | "expense";
  confidence: number;
}

const CATEGORY_RULES: Array<{
  category: string;
  type: "income" | "expense";
  keywords: string[];
}> = [
  {
    category: "Income",
    type: "income",
    keywords: [
      "salary", "payroll", "direct dep", "dividend", "bonus", "wage",
      "interest credit", "refund", "reimbursement", "payout", "stripe payout",
      "upwork", "freelance", "fiverr", "client payment"
    ],
  },
  {
    category: "Food & Dining",
    type: "expense",
    keywords: [
      "starbucks", "mcdonald", "dunkin", "burger", "pizza", "restaurant",
      "cafe", "coffee", "dining", "bar", "pub", "swiggy", "zomato",
      "doordash", "uber eats", "grubhub", "chipotle", "subway", "bakery",
      "grocery", "supermarket", "whole foods", "trader joe", "costco",
      "safeway", "instacart", "bistro", "deli", "food"
    ],
  },
  {
    category: "Transportation",
    type: "expense",
    keywords: [
      "uber", "lyft", "taxi", "cab", "ola", "transit", "subway", "metro",
      "train", "amtrak", "gas", "fuel", "petrol", "shell", "chevron", "bp",
      "exxon", "parking", "toll", "ezpass", "flight", "airline", "delta",
      "united", "southwest", "indigo", "airfare"
    ],
  },
  {
    category: "Bills & Utilities",
    type: "expense",
    keywords: [
      "electric", "electricity", "water", "utility", "pg&e", "edison",
      "wifi", "broadband", "internet", "verizon", "at&t", "t-mobile",
      "airtel", "jio", "insurance", "rent", "mortgage", "lease", "council",
      "recharge", "sewer", "trash"
    ],
  },
  {
    category: "Entertainment",
    type: "expense",
    keywords: [
      "netflix", "spotify", "youtube", "hulu", "disney", "hbo", "prime video",
      "cinema", "amc", "steam", "playstation", "xbox", "nintendo", "ticket",
      "concert", "patreon", "twitch", "game", "audible"
    ],
  },
  {
    category: "Shopping",
    type: "expense",
    keywords: [
      "amazon", "flipkart", "walmart", "target", "ebay", "apple", "best buy",
      "ikea", "zara", "h&m", "nike", "adidas", "clothing", "apparel",
      "electronics", "mall", "store", "shopify", "etsy"
    ],
  },
  {
    category: "Healthcare",
    type: "expense",
    keywords: [
      "pharmacy", "cvs", "walgreen", "hospital", "doctor", "dental",
      "dentist", "clinic", "health", "medicine", "rx", "gym", "fitness",
      "optical", "vision", "therapy"
    ],
  },
  {
    category: "Education",
    type: "expense",
    keywords: [
      "course", "university", "college", "tuition", "udemy", "coursera",
      "edx", "book", "textbook", "school", "academy"
    ],
  },
];

/**
 * Predicts category and transaction type from raw transaction text.
 */
export function predictCategory(description: string): CategorizationResult {
  if (!description) {
    return { category: "General", type: "expense", confidence: 0 };
  }

  const normalized = description.toLowerCase().trim();

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return {
          category: rule.category,
          type: rule.type,
          confidence: 0.9,
        };
      }
    }
  }

  return {
    category: "General",
    type: "expense",
    confidence: 0.1,
  };
}

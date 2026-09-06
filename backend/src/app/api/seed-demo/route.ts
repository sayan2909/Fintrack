import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, categories, transactions, budgets, savingsGoals, recurringTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { ok } from "@/lib/response";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { email, name } = await req.json().catch(() => ({}));
  const demoEmail = (email || "demo@fintrack.app").toLowerCase();
  let user = (await db.select().from(users).where(eq(users.email, demoEmail)).limit(1))[0];
  if (!user) {
    const rows = await db.insert(users).values({ name: name || "Demo User", email: demoEmail, passwordHash: await hashPassword("Demo@1234"), currency: "INR" }).returning();
    user = rows[0];
  }
  // categories
  const existing = await db.select().from(categories).where(eq(categories.userId, user.id));
  if (existing.length === 0) {
    await db.insert(categories).values([
      ...INCOME_CATEGORIES.map((c) => ({ userId: user.id, name: c.name, type: "income", color: c.color, icon: c.icon, isDefault: true })),
      ...EXPENSE_CATEGORIES.map((c) => ({ userId: user.id, name: c.name, type: "expense", color: c.color, icon: c.icon, isDefault: true })),
    ]);
  }
  const cats = await db.select().from(categories).where(eq(categories.userId, user.id));
  const catByName = (n: string) => cats.find((c) => c.name.toLowerCase() === n.toLowerCase());
  const has = await db.select().from(transactions).where(eq(transactions.userId, user.id)).limit(1);
  if (has.length === 0) {
    const txRows: typeof transactions.$inferInsert[] = [];
    const today = new Date();
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const descs: Record<string, string[]> = {
      Food: ["Swiggy order", "Zomato dinner", "Grocery - BigBasket", "Cafe coffee", "Lunch at office"],
      Shopping: ["Amazon order", "Myntra fashion", "Flipkart electronics", "DMart run"],
      Transport: ["Uber ride", "Metro recharge", "Petrol", "Ola cab"],
      Bills: ["Electricity bill", "Mobile recharge", "Broadband", "Gas cylinder"],
      Entertainment: ["Netflix", "Movie - PVR", "Spotify", "Game purchase"],
      Healthcare: ["Pharmacy", "Doctor visit", "Lab tests"],
      Education: ["Course - Udemy", "Books", "Exam fee"],
      Rent: ["Monthly rent"],
      Travel: ["Flight booking", "Hotel stay", "Train tickets"],
      Other: ["Misc expense"],
    };
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nTx = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < nTx; k++) {
        const catName = pick(Object.keys(descs));
        const cat = catByName(catName);
        const amt = catName === "Rent" ? 18000 : Math.round(80 + Math.random() * 2500);
        txRows.push({
          userId: user.id,
          categoryId: cat?.id,
          categoryName: catName,
          type: "expense",
          amount: String(amt),
          description: pick(descs[catName]),
          date: d.toISOString().slice(0, 10),
          paymentMethod: pick(["UPI", "Credit Card", "Debit Card", "Cash"]),
        });
      }
      if (i % 30 === 5) {
        const sal = catByName("Salary");
        txRows.push({ userId: user.id, categoryId: sal?.id, categoryName: "Salary", type: "income", amount: "85000", description: "Monthly salary", date: d.toISOString().slice(0, 10), paymentMethod: "Bank Transfer" });
      }
      if (i % 17 === 3) {
        const fr = catByName("Freelance");
        txRows.push({ userId: user.id, categoryId: fr?.id, categoryName: "Freelance", type: "income", amount: String(5000 + Math.floor(Math.random() * 15000)), description: "Freelance project", date: d.toISOString().slice(0, 10), paymentMethod: "Bank Transfer" });
      }
    }
    // chunk insert
    for (let i = 0; i < txRows.length; i += 50) {
      await db.insert(transactions).values(txRows.slice(i, i + 50));
    }
    const mk = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    for (const [c, amt] of [["Food", 5000], ["Shopping", 8000], ["Transport", 3000], ["Entertainment", 2500], ["Bills", 6000]] as const) {
      const cat = catByName(c);
      await db.insert(budgets).values({ userId: user.id, categoryId: cat?.id, categoryName: c, amount: String(amt), month: mk, description: `${c} budget for ${mk}` });
    }
    await db.insert(savingsGoals).values([
      { userId: user.id, name: "Emergency Fund", targetAmount: "200000", currentAmount: "85000", targetDate: new Date(today.getFullYear() + 1, 5, 30).toISOString().slice(0, 10), description: "6 months of expenses safety net", color: "#10b981" },
      { userId: user.id, name: "New Laptop", targetAmount: "120000", currentAmount: "45000", targetDate: new Date(today.getFullYear(), today.getMonth() + 5, 15).toISOString().slice(0, 10), description: "MacBook Pro for work", color: "#6366f1" },
      { userId: user.id, name: "Vacation - Goa", targetAmount: "60000", currentAmount: "18000", targetDate: new Date(today.getFullYear(), today.getMonth() + 3, 1).toISOString().slice(0, 10), description: "Year-end trip", color: "#f59e0b" },
    ]);
    const rent = catByName("Rent");
    const sal = catByName("Salary");
    await db.insert(recurringTransactions).values([
      { userId: user.id, name: "House Rent", amount: "18000", type: "expense", categoryId: rent?.id, categoryName: "Rent", frequency: "Monthly", startDate: `${today.getFullYear()}-01-05`, paymentMethod: "Bank Transfer", isActive: true },
      { userId: user.id, name: "Salary", amount: "85000", type: "income", categoryId: sal?.id, categoryName: "Salary", frequency: "Monthly", startDate: `${today.getFullYear()}-01-01`, paymentMethod: "Bank Transfer", isActive: true },
      { userId: user.id, name: "Internet - JioFiber", amount: "999", type: "expense", categoryId: catByName("Bills")?.id, categoryName: "Bills", frequency: "Monthly", startDate: `${today.getFullYear()}-01-10`, paymentMethod: "UPI", isActive: true },
      { userId: user.id, name: "Netflix + Hotstar", amount: "649", type: "expense", categoryId: catByName("Entertainment")?.id, categoryName: "Entertainment", frequency: "Monthly", startDate: `${today.getFullYear()}-01-15`, paymentMethod: "Credit Card", isActive: true },
    ]);
  }
  return ok({ seeded: true, email: demoEmail, password: "Demo@1234" });
}

import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const currentYear = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10);
    const previousYear = currentYear - 1;

    const startOfPrevYear = `${previousYear}-01-01`;
    const endOfCurrentYear = `${currentYear}-12-31`;

    const txRows = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.date, startOfPrevYear),
          lte(transactions.date, endOfCurrentYear)
        )
      );

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const monthlyData = monthNames.map((month, idx) => ({
      month,
      monthIndex: idx + 1,
      currentYear: {
        year: currentYear,
        expenses: 0,
        income: 0,
        net: 0,
      },
      previousYear: {
        year: previousYear,
        expenses: 0,
        income: 0,
        net: 0,
      },
      expenseDiff: 0,
      expenseDiffPct: 0,
    }));

    let curTotalExp = 0;
    let curTotalInc = 0;
    let prevTotalExp = 0;
    let prevTotalInc = 0;

    for (const tx of txRows) {
      const txDate = new Date(tx.date);
      const yr = txDate.getFullYear();
      const mIdx = txDate.getMonth();
      const amt = Number(tx.amount);

      if (yr === currentYear && mIdx >= 0 && mIdx < 12) {
        if (tx.type === "expense") {
          monthlyData[mIdx].currentYear.expenses += amt;
          curTotalExp += amt;
        } else {
          monthlyData[mIdx].currentYear.income += amt;
          curTotalInc += amt;
        }
      } else if (yr === previousYear && mIdx >= 0 && mIdx < 12) {
        if (tx.type === "expense") {
          monthlyData[mIdx].previousYear.expenses += amt;
          prevTotalExp += amt;
        } else {
          monthlyData[mIdx].previousYear.income += amt;
          prevTotalInc += amt;
        }
      }
    }

    // Compute net and percentage differences
    for (const m of monthlyData) {
      m.currentYear.net = m.currentYear.income - m.currentYear.expenses;
      m.previousYear.net = m.previousYear.income - m.previousYear.expenses;
      m.expenseDiff = m.currentYear.expenses - m.previousYear.expenses;
      m.expenseDiffPct = m.previousYear.expenses > 0
        ? Math.round(((m.currentYear.expenses - m.previousYear.expenses) / m.previousYear.expenses) * 100)
        : m.currentYear.expenses > 0 ? 100 : 0;
    }

    const expGrowthPct = prevTotalExp > 0
      ? Math.round(((curTotalExp - prevTotalExp) / prevTotalExp) * 100)
      : curTotalExp > 0 ? 100 : 0;

    const incGrowthPct = prevTotalInc > 0
      ? Math.round(((curTotalInc - prevTotalInc) / prevTotalInc) * 100)
      : curTotalInc > 0 ? 100 : 0;

    return ok({
      currentYear,
      previousYear,
      totals: {
        currentYear: { expenses: curTotalExp, income: curTotalInc, net: curTotalInc - curTotalExp },
        previousYear: { expenses: prevTotalExp, income: prevTotalInc, net: prevTotalInc - prevTotalExp },
        expenseGrowthPct: expGrowthPct,
        incomeGrowthPct: incGrowthPct,
      },
      monthly: monthlyData,
    });
  } catch (err) {
    console.error("[Analytics YoY] Error:", err);
    return fail("Unable to calculate year-over-year comparison.", 500);
  }
}

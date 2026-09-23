"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  Wallet,
  Utensils,
  Car,
  ShoppingBag,
  Coffee,
  Apple,
  Tv,
  Zap,
  Lightbulb,
  Plus,
  Clock,
  CheckCircle2,
  Calendar as CalendarIcon,
  List as ListIcon,
  Grid as GridIcon,
  ArrowRight,
  BellRing,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: string;
  description: string;
  date: string;
  categoryName?: string;
  paymentMethod?: string;
  createdAt?: string;
}

interface RecurringItem {
  id: string;
  name: string;
  amount: string;
  type: string;
  categoryName?: string;
  frequency: string;
  paymentMethod?: string;
  startDate: string;
  nextDue: string;
  daysUntil: number;
}

interface CalendarCell {
  dayNumber: number;
  isCurrentMonth: boolean;
  dateKey: string;
  data?: {
    expenses: number;
    income: number;
    count: number;
    items: Transaction[];
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getCategoryIcon(cat?: string, description?: string) {
  const text = ((cat || "") + " " + (description || "")).toLowerCase();
  if (
    text.includes("food") ||
    text.includes("zomato") ||
    text.includes("swiggy") ||
    text.includes("lunch") ||
    text.includes("dinner") ||
    text.includes("restaurant") ||
    text.includes("meal")
  ) {
    return {
      icon: Utensils,
      bg: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
    };
  }
  if (
    text.includes("coffee") ||
    text.includes("tea") ||
    text.includes("cafe") ||
    text.includes("starbucks")
  ) {
    return {
      icon: Coffee,
      bg: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
    };
  }
  if (
    text.includes("uber") ||
    text.includes("ola") ||
    text.includes("ride") ||
    text.includes("transport") ||
    text.includes("cab") ||
    text.includes("petrol") ||
    text.includes("fuel") ||
    text.includes("travel")
  ) {
    return {
      icon: Car,
      bg: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
    };
  }
  if (
    text.includes("shop") ||
    text.includes("amazon") ||
    text.includes("flipkart") ||
    text.includes("myntra") ||
    text.includes("clothes")
  ) {
    return {
      icon: ShoppingBag,
      bg: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    };
  }
  if (
    text.includes("grocer") ||
    text.includes("blinkit") ||
    text.includes("zepto") ||
    text.includes("market")
  ) {
    return {
      icon: Apple,
      bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    };
  }
  if (
    text.includes("movie") ||
    text.includes("netflix") ||
    text.includes("entertainment") ||
    text.includes("hotstar")
  ) {
    return {
      icon: Tv,
      bg: "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400",
    };
  }
  if (
    text.includes("bill") ||
    text.includes("electric") ||
    text.includes("wifi") ||
    text.includes("recharge") ||
    text.includes("utility") ||
    text.includes("education") ||
    text.includes("fee")
  ) {
    return {
      icon: Zap,
      bg: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
    };
  }
  if (text.includes("salary") || text.includes("income") || text.includes("freelance")) {
    return {
      icon: ArrowDown,
      bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    };
  }
  return {
    icon: Wallet,
    bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
}

function formatTime(createdAt?: string, index = 0) {
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    }
  }
  const sampleTimes = ["12:45 PM", "02:30 PM", "06:10 PM", "09:20 PM", "10:15 AM", "04:50 PM"];
  return sampleTimes[index % sampleTimes.length];
}

export default function CalendarPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Today key
  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [viewMode, setViewMode] = useState<"Month" | "Year" | "List">("Month");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const [recurring, setRecurring] = useState<RecurringItem[]>([]);

  // Fetch recurring bills for upcoming payment alerts
  useEffect(() => {
    fetch("/api/recurring", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data?.items)) {
          setRecurring(j.data.items);
        }
      })
      .catch(() => {});
  }, []);

  // Upcoming bills due in the next 7 days
  const upcomingBillsSoon = useMemo(() => {
    return recurring.filter((r) => r.type === "expense" && r.daysUntil >= 0 && r.daysUntil <= 7);
  }, [recurring]);

  // Map of nextDue date string -> recurring items
  const recurringByDate = useMemo(() => {
    const map: Record<string, RecurringItem[]> = {};
    for (const r of recurring) {
      if (!r.nextDue) continue;
      if (!map[r.nextDue]) map[r.nextDue] = [];
      map[r.nextDue].push(r);
    }
    return map;
  }, [recurring]);

  // Close month picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false);
      }
    }
    if (showMonthPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMonthPicker]);

  // Load transactions based on viewMode
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        let fromDate: string;
        let toDate: string;
        let limit = 500;

        if (viewMode === "Year") {
          fromDate = `${year}-01-01`;
          toDate = `${year}-12-31`;
          limit = 2000;
        } else {
          fromDate = new Date(year, month, 1).toISOString().slice(0, 10);
          toDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);
        }

        const res = await fetch(
          `/api/transactions?from=${fromDate}&to=${toDate}&limit=${limit}`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.transactions)) {
          setTransactions(json.data.transactions);
        }
      } catch (err) {
        console.error("Failed to load transactions for calendar:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [year, month, viewMode]);

  // Aggregate daily totals
  const dailyData = useMemo(() => {
    const map: Record<string, { expenses: number; income: number; count: number; items: Transaction[] }> = {};
    for (const tx of transactions) {
      const d = tx.date?.slice(0, 10);
      if (!d) continue;
      if (!map[d]) {
        map[d] = { expenses: 0, income: 0, count: 0, items: [] };
      }
      const amt = Number(tx.amount);
      if (tx.type === "expense") {
        map[d].expenses += amt;
      } else {
        map[d].income += amt;
      }
      map[d].count += 1;
      map[d].items.push(tx);
    }
    return map;
  }, [transactions]);

  // Monthly summary metrics
  const monthMetrics = useMemo(() => {
    let totalExp = 0;
    let totalInc = 0;
    let maxExp = 0;
    let highestDateKey = "";

    for (const [dKey, val] of Object.entries(dailyData)) {
      if (viewMode === "Year") {
        totalExp += val.expenses;
        totalInc += val.income;
        if (val.expenses > maxExp) {
          maxExp = val.expenses;
          highestDateKey = dKey;
        }
      } else {
        const dMonth = Number(dKey.split("-")[1]) - 1;
        if (dMonth === month) {
          totalExp += val.expenses;
          totalInc += val.income;
          if (val.expenses > maxExp) {
            maxExp = val.expenses;
            highestDateKey = dKey;
          }
        }
      }
    }

    const totalDays = viewMode === "Year" ? 365 : new Date(year, month + 1, 0).getDate();
    const avgDailyExp = totalExp > 0 ? Math.round(totalExp / totalDays) : 0;

    return {
      totalExp,
      totalInc,
      net: totalInc - totalExp,
      avgDailyExp,
      maxExp,
      highestDateKey,
    };
  }, [dailyData, viewMode, month, year]);

  // Yearly data per month (for Year view)
  const yearlyMonthsData = useMemo(() => {
    const list = MONTH_NAMES.map((name, idx) => {
      let expenses = 0;
      let income = 0;
      let count = 0;

      for (const [dKey, val] of Object.entries(dailyData)) {
        const [yStr, mStr] = dKey.split("-");
        if (Number(yStr) === year && Number(mStr) === idx + 1) {
          expenses += val.expenses;
          income += val.income;
          count += val.count;
        }
      }

      return {
        monthIndex: idx,
        name,
        shortName: MONTH_SHORT[idx],
        expenses,
        income,
        net: income - expenses,
        count,
      };
    });
    return list;
  }, [dailyData, year]);

  // List view grouped transactions (for List view)
  const groupedByDate = useMemo(() => {
    const groups: { date: string; displayDate: string; items: Transaction[]; totalSpent: number; totalIncome: number }[] = [];
    const dateKeys = Object.keys(dailyData).sort((a, b) => b.localeCompare(a));

    for (const dk of dateKeys) {
      const [y, m, d] = dk.split("-").map(Number);
      const dObj = new Date(y, m - 1, d);
      const displayDate = dObj.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      const val = dailyData[dk];
      if (val && val.items.length > 0) {
        groups.push({
          date: dk,
          displayDate,
          items: val.items,
          totalSpent: val.expenses,
          totalIncome: val.income,
        });
      }
    }
    return groups;
  }, [dailyData]);

  // Calendar matrix calculation (for Month view)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const daysFromPrevMonth = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Start on Monday

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const cells: CalendarCell[] = [];

    // Prev month padding
    for (let i = daysFromPrevMonth; i > 0; i--) {
      const d = prevMonthLastDay - i + 1;
      cells.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: "",
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({
        dayNumber: day,
        isCurrentMonth: true,
        dateKey,
        data: dailyData[dateKey] || { expenses: 0, income: 0, count: 0, items: [] },
      });
    }

    // Next month padding to fill complete grid
    const remaining = (cells.length % 7 === 0) ? 0 : 7 - (cells.length % 7);
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateKey: "",
      });
    }

    return cells;
  }, [year, month, dailyData]);

  const handlePrev = () => {
    if (viewMode === "Year") {
      setCurrentDate(new Date(year - 1, month, 1));
    } else {
      const prev = new Date(year, month - 1, 1);
      setCurrentDate(prev);
      setSelectedDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`);
    }
  };

  const handleNext = () => {
    if (viewMode === "Year") {
      setCurrentDate(new Date(year + 1, month, 1));
    } else {
      const next = new Date(year, month + 1, 1);
      setCurrentDate(next);
      setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(todayKey);
  };

  // Selected Day navigation
  const handlePrevDay = () => {
    if (!selectedDate) return;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d - 1);
    const newKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    setSelectedDate(newKey);
    if (dateObj.getMonth() !== month) {
      setCurrentDate(dateObj);
    }
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d + 1);
    const newKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    setSelectedDate(newKey);
    if (dateObj.getMonth() !== month) {
      setCurrentDate(dateObj);
    }
  };

  // Selected day details
  const selectedDayData = selectedDate ? dailyData[selectedDate] : null;
  const selectedDayTransactions = selectedDayData?.items || [];
  const selectedDayTotalSpent = selectedDayData?.expenses || 0;

  // Selected date formatted title
  const selectedDateTitle = useMemo(() => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const obj = new Date(y, m - 1, d);
    return obj.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  }, [selectedDate]);

  const selectedDateWeekday = useMemo(() => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const obj = new Date(y, m - 1, d);
    return obj.toLocaleDateString("en-US", { weekday: "long" });
  }, [selectedDate]);

  // Insight computation
  const selectedDayInsight = useMemo(() => {
    if (!selectedDayTransactions.length) {
      return "No expenses recorded on this day. Excellent savings streak!";
    }
    const catMap: Record<string, number> = {};
    for (const t of selectedDayTransactions) {
      if (t.type === "expense") {
        const cat = t.categoryName || "General";
        catMap[cat] = (catMap[cat] || 0) + Number(t.amount);
      }
    }
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length > 0) {
      const [topCat, amt] = sortedCats[0];
      return `Your highest expense today was ${topCat} (${formatCurrency(amt, currency)}). Keep an eye on non-essential spending.`;
    }
    return `You received ${formatCurrency(selectedDayData?.income || 0, currency)} in income today!`;
  }, [selectedDayTransactions, selectedDayData, currency]);

  return (
    <AppShell>
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Calendar
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          View and track your daily income and expenses
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Calendar / Year / List Area */}
        <div className={`${viewMode === "Year" ? "lg:col-span-12" : "lg:col-span-8"} space-y-4`}>
          {/* Navigation Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Prev / Today / Next */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                title={viewMode === "Year" ? "Previous Year" : "Previous Month"}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleToday}
                className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                title={viewMode === "Year" ? "Next Year" : "Next Month"}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Current Month / Year Dropdown Toggle */}
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setShowMonthPicker((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {viewMode === "Year" ? `${year}` : `${MONTH_NAMES[month]} ${year}`}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {/* Month / Year Picker Popover */}
              {showMonthPicker && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-fade-up">
                  {/* Year Header within picker */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setCurrentDate(new Date(year - 1, month, 1))}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{year}</span>
                    <button
                      onClick={() => setCurrentDate(new Date(year + 1, month, 1))}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* 12 Months Grid */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {MONTH_SHORT.map((mShort, idx) => (
                      <button
                        key={mShort}
                        onClick={() => {
                          setCurrentDate(new Date(year, idx, 1));
                          setSelectedDate(`${year}-${String(idx + 1).padStart(2, "0")}-01`);
                          setShowMonthPicker(false);
                        }}
                        className={`rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                          idx === month
                            ? "bg-[#bbf246] text-[#0b0e11] font-black shadow-sm"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        {mShort}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* View Mode Pills (Month / Year / List) */}
            <div className="flex items-center rounded-xl bg-slate-100/90 p-0.5 border border-slate-200/60 dark:border-white/[0.08] dark:bg-[#0b0e11] text-xs font-semibold">
              {(["Month", "Year", "List"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                    viewMode === m
                      ? "bg-white text-slate-900 shadow-2xs ring-1 ring-black/5 dark:bg-[#bbf246] dark:text-[#0b0e11] dark:ring-0 font-black"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly / Period KPI Summary Cards (3 cards) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Total Income */}
            <Card className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
              <div className="flex h-7 w-7 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-0">
                <ArrowDown className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {viewMode === "Year" ? `Income (${year})` : "Income"}
                </p>
                <p className="text-xs sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                  {formatCurrency(monthMetrics.totalInc, currency)}
                </p>
              </div>
            </Card>

            {/* Total Expenses */}
            <Card className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
              <div className="flex h-7 w-7 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-400 dark:border-0">
                <ArrowUp className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {viewMode === "Year" ? `Expenses (${year})` : "Expenses"}
                </p>
                <p className="text-xs sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums truncate">
                  {formatCurrency(monthMetrics.totalExp, currency)}
                </p>
              </div>
            </Card>

            {/* Net Savings */}
            <Card className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
              <div className="flex h-7 w-7 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-0">
                <Wallet className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {viewMode === "Year" ? `Net (${year})` : "Net"}
                </p>
                <p
                  className={`text-xs sm:text-lg font-black tabular-nums truncate ${
                    monthMetrics.net >= 0
                      ? "text-slate-900 dark:text-white"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatCurrency(monthMetrics.net, currency)}
                </p>
              </div>
            </Card>
          </div>

          {/* Upcoming Payments Alert Banner */}
          {upcomingBillsSoon.length > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-amber-200/90 bg-amber-50/50 p-3.5 px-4 text-xs dark:border-amber-500/30 dark:bg-amber-950/20 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 min-w-0">
                <BellRing className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="truncate">
                  <strong>Upcoming Payment Alert:</strong> {upcomingBillsSoon.length} recurring payment{upcomingBillsSoon.length === 1 ? "" : "s"} due in the next 7 days ({upcomingBillsSoon.map((b) => `${b.name} - ${formatCurrency(b.amount, currency)}`).join(", ")})
                </span>
              </div>
              <a href="/recurring" className="font-bold text-amber-800 hover:underline dark:text-amber-300 shrink-0 ml-3">
                View Bills →
              </a>
            </div>
          )}

          {/* VIEW 1: MONTH VIEW (Default Calendar Grid) */}
          {viewMode === "Month" && (
            <Card className="p-4 sm:p-5">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarCells.map((cell, idx) => {
                  if (!cell.isCurrentMonth) {
                    return (
                      <div
                        key={idx}
                        className="min-h-[72px] sm:min-h-[82px] rounded-2xl p-2 text-slate-300 dark:text-slate-700 select-none bg-slate-50/40 dark:bg-slate-900/30"
                      >
                        <span className="text-xs font-medium">{cell.dayNumber}</span>
                      </div>
                    );
                  }

                  const isSelected = cell.dateKey === selectedDate;
                  const cellData = cell.data;
                  const exp = cellData?.expenses || 0;
                  const inc = cellData?.income || 0;
                  const hasTransactions = (cellData?.count || 0) > 0;
                  const hasRecurring = cell.dateKey && !!recurringByDate[cell.dateKey];

                  let expDotColor = "";
                  if (exp > 0) {
                    if (exp >= 2000) expDotColor = "bg-rose-600";
                    else if (exp >= 500) expDotColor = "bg-rose-400";
                    else expDotColor = "bg-teal-400";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(cell.dateKey)}
                      className={`relative min-h-[72px] sm:min-h-[82px] rounded-2xl p-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? "border-2 border-[#bbf246] bg-[#bbf246]/10 dark:bg-[#bbf246]/15 dark:border-[#bbf246] shadow-xs"
                          : "border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#15181d] dark:hover:border-white/[0.16] dark:hover:bg-slate-800/50"
                      }`}
                    >
                      {/* Top Row: Day Number & Dots */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-semibold ${
                            isSelected
                              ? "text-slate-900 dark:text-[#bbf246] font-black"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Status indicator dots */}
                        <div className="flex items-center gap-1">
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-[#bbf246] ring-2 ring-[#bbf246]/30" />
                          )}
                          {!isSelected && hasRecurring && (
                            <span
                              title={`Scheduled Payment: ${recurringByDate[cell.dateKey].map((r) => r.name).join(", ")}`}
                              className="h-1.5 w-1.5 rounded-full bg-amber-500 ring-1 ring-amber-300 dark:ring-amber-800"
                            />
                          )}
                          {!isSelected && inc > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          )}
                          {!isSelected && exp > 0 && (
                            <span className={`h-1.5 w-1.5 rounded-full ${expDotColor}`} />
                          )}
                          {!isSelected && exp >= 500 && (
                            <span className={`h-1.5 w-1.5 rounded-full ${expDotColor}`} />
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Amount */}
                      <div className="mt-1">
                        {hasTransactions ? (
                          inc > 0 && exp === 0 ? (
                            <span className="block text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                              +{formatCurrency(inc, currency)}
                            </span>
                          ) : (
                            <span className="block text-[11px] sm:text-xs font-bold text-rose-500 dark:text-rose-400 truncate">
                              −{formatCurrency(exp, currency)}
                            </span>
                          )
                        ) : (
                          <span className="block h-4" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend Bar at Bottom of Calendar */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>No transactions</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  <span>Low spending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span>Moderate spending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-600" />
                  <span>High spending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  <span>Income day</span>
                </div>
              </div>
            </Card>
          )}

          {/* VIEW 2: YEAR VIEW (12 Months Overview) */}
          {viewMode === "Year" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {yearlyMonthsData.map((mItem) => {
                const isCurrentMonth = mItem.monthIndex === month;

                return (
                  <Card
                    key={mItem.name}
                    className={`p-4 rounded-2xl transition-all cursor-pointer hover:shadow-md ${
                      isCurrentMonth
                        ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500/20"
                        : "hover:border-emerald-300"
                    }`}
                  >
                    <div
                      onClick={() => {
                        setCurrentDate(new Date(year, mItem.monthIndex, 1));
                        setSelectedDate(`${year}-${String(mItem.monthIndex + 1).padStart(2, "0")}-01`);
                        setViewMode("Month");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          {mItem.name}
                          {isCurrentMonth && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold">
                              Current
                            </span>
                          )}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {mItem.count} txn{mItem.count === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Income</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(mItem.income, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Expenses</span>
                          <span className="font-semibold text-rose-500 dark:text-rose-400">
                            -{formatCurrency(mItem.expenses, currency)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Net</span>
                        <span
                          className={`font-extrabold ${
                            mItem.net >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {formatCurrency(mItem.net, currency)}
                        </span>
                      </div>

                      <div className="mt-2 text-right">
                        <span className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-0.5">
                          View Month <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* VIEW 3: LIST VIEW (Chronological Agenda of Transactions) */}
          {viewMode === "List" && (
            <Card className="p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Agenda & History
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chronological listing of transactions for {MONTH_NAMES[month]} {year}
                  </p>
                </div>
                <button
                  onClick={() => {
                    window.location.href = `/transactions?date=${selectedDate}`;
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Log Transaction
                </button>
              </div>

              {groupedByDate.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    No transactions found for this period.
                  </p>
                  <Button
                    className="mt-3 text-xs"
                    onClick={() => {
                      window.location.href = `/transactions?date=${selectedDate}`;
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Transaction
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedByDate.map((grp) => (
                    <div key={grp.date} className="space-y-2.5">
                      {/* Date Group Header */}
                      <div className="flex items-center justify-between bg-slate-50/70 p-2.5 px-3 rounded-xl dark:bg-slate-800/40">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {grp.displayDate}
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          {grp.totalIncome > 0 && (
                            <span className="text-emerald-600 font-bold">
                              +{formatCurrency(grp.totalIncome, currency)}
                            </span>
                          )}
                          {grp.totalSpent > 0 && (
                            <span className="text-rose-500 font-bold">
                              -{formatCurrency(grp.totalSpent, currency)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Transactions under this date */}
                      <div className="space-y-2 pl-2">
                        {grp.items.map((tx, idx) => {
                          const catTheme = getCategoryIcon(tx.categoryName, tx.description);
                          const IconComponent = catTheme.icon;
                          const isInc = tx.type === "income";

                          return (
                            <div
                              key={tx.id}
                              onClick={() => setSelectedDate(grp.date)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                                selectedDate === grp.date
                                  ? "border-emerald-500/60 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10"
                                  : "border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-900/60"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${catTheme.bg}`}
                                >
                                  <IconComponent className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {tx.description}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {tx.categoryName || (isInc ? "Income" : "General")} • {tx.paymentMethod || "Cash"}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p
                                  className={`text-xs sm:text-sm font-bold ${
                                    isInc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                                  }`}
                                >
                                  {isInc ? "+ " : "- "}
                                  {formatCurrency(Number(tx.amount), currency)}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {formatTime(tx.createdAt, idx)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Sidebar: Selected Day Details (visible in Month and List views) */}
        {viewMode !== "Year" && (
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-5 space-y-5">
              {/* Selected Date Header & Next/Prev Controls */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedDateTitle}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedDateWeekday}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevDay}
                    title="Previous Day"
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNextDay}
                    title="Next Day"
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Total Spent Card for Selected Day */}
              <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 dark:border-rose-900/30 dark:bg-rose-950/20 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                  <ArrowUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Spent</p>
                  <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                    {formatCurrency(selectedDayTotalSpent, currency)}
                  </p>
                </div>
              </div>

              {/* Scheduled Recurring Payment Alert for Selected Date */}
              {selectedDate && recurringByDate[selectedDate] && recurringByDate[selectedDate].length > 0 && (
                <div className="rounded-2xl border border-amber-300/80 bg-amber-50/80 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                    <BellRing className="h-4 w-4 text-amber-600" />
                    <span>Scheduled Payment Alert</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {recurringByDate[selectedDate].map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.name} ({r.categoryName || "Recurring"})
                        </span>
                        <span className="font-bold text-rose-600">
                          -{formatCurrency(parseFloat(r.amount), currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {selectedDayTransactions.length} transaction{selectedDayTransactions.length === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={() => {
                      window.location.href = `/transactions?date=${selectedDate}`;
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>

                {selectedDayTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No transactions recorded for this day.
                    </p>
                    <Button
                      className="mt-3 text-xs px-3 py-1.5"
                      onClick={() => {
                        window.location.href = `/transactions?date=${selectedDate}`;
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Transaction
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayTransactions.map((tx, idx) => {
                      const catTheme = getCategoryIcon(tx.categoryName, tx.description);
                      const IconComponent = catTheme.icon;
                      const isInc = tx.type === "income";

                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between gap-3 p-1 rounded-xl transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${catTheme.bg}`}
                            >
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {tx.description}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {tx.categoryName || (isInc ? "Income" : "General")}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`text-xs sm:text-sm font-bold ${
                                isInc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                              }`}
                            >
                              {isInc ? "+ " : "- "}
                              {formatCurrency(Number(tx.amount), currency)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatTime(tx.createdAt, idx)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Smart Insight Card at bottom of sidebar */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200/80 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </div>
                  <span>Insight</span>
                </div>
                <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 mt-2 leading-relaxed">
                  {selectedDayInsight}
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

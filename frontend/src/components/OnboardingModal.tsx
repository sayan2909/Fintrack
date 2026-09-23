"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  PiggyBank,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  X,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY_PREFIX = "fintrack_tour_completed_";

export function OnboardingModal() {
  const { user, setUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  // Automatic platform tour: ONLY for brand new / first-time users
  useEffect(() => {
    // Must have an authenticated user
    if (!user || !user.id) return;

    // If user has already completed or seen the tour in the database, do not show
    if (user.hasSeenTour) return;

    // Check if user has completed it in this browser
    const userTourKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    const localCompleted = localStorage.getItem(userTourKey) || localStorage.getItem("fintrack_onboarding_v1");
    if (localCompleted) return;

    // Brand new first-time user: automatically trigger tour with smooth entry
    const timer = setTimeout(() => {
      setStep(0);
      setIsOpen(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [user]);

  // Allow replaying from Settings on demand for any user
  useEffect(() => {
    const handleReplay = () => {
      setStep(0);
      setIsOpen(true);
    };
    window.addEventListener("fintrack:replay-onboarding", handleReplay);
    return () => window.removeEventListener("fintrack:replay-onboarding", handleReplay);
  }, []);

  const handleFinish = (targetUrl?: string) => {
    setIsOpen(false);

    if (user && user.id) {
      const userTourKey = `${STORAGE_KEY_PREFIX}${user.id}`;
      localStorage.setItem(userTourKey, "true");
      localStorage.setItem("fintrack_onboarding_v1", "true");

      // Optimistically update user context so it won't trigger again
      setUser({ ...user, hasSeenTour: true });

      // Persist to database so it stays completed across all devices and logins
      fetch("/api/auth/tour-complete", {
        method: "POST",
        credentials: "include",
      }).catch(() => {
        fetch("/api/auth/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ hasSeenTour: true }),
        }).catch(() => {});
      });
    }

    if (targetUrl) {
      router.push(targetUrl);
    }
  };

  if (!isOpen) return null;

  const STEPS = [
    {
      title: "Welcome to FinTrack!",
      subtitle: "Take full control of your personal finances with effortless tracking, automated calculations, and smart money habits.",
      icon: Wallet,
      color: "from-indigo-600 to-violet-600",
      content: (
        <div className="space-y-3.5 pt-2">
          <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Effortless Expense & Income Logging</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Record cash, UPI, card, or bank transfers in seconds with custom categories.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Real-Time Financial Analytics</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Track savings rate, monthly trends, and spending patterns automatically.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Smart Budgets & Goals",
      subtitle: "Prevent overspending with live progress meters and watch your savings goals grow month over month.",
      icon: PiggyBank,
      color: "from-emerald-500 to-teal-600",
      content: (
        <div className="space-y-3 pt-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/70">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Food & Dining Budget</span>
              <span className="text-emerald-600">₹4,200 / ₹6,000 (70%)</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/70">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Emergency Fund Goal</span>
              <span className="text-indigo-600">₹45,000 / ₹1,00,000 (45%)</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "You're Ready to Begin!",
      subtitle: "Start building healthier financial routines today. Log transactions or explore your dashboard.",
      icon: Sparkles,
      color: "from-amber-500 to-orange-500",
      content: (
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <button
            onClick={() => handleFinish("/transactions")}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-300/80 bg-indigo-50/50 p-4 text-center transition hover:border-indigo-500 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <PlusCircle className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Log First Transaction</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Add an expense or income right now</p>
          </button>
          <button
            onClick={() => handleFinish("/dashboard")}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Explore Dashboard</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">View balances, insights & charts</p>
          </button>
        </div>
      ),
    },
  ];

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-up">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-8 dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Close / Skip button */}
        <button
          onClick={() => handleFinish()}
          className="absolute right-5 top-5 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Skip Tour"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Step indicator dots */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === step ? "w-8 bg-indigo-600" : "w-2 bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Header Icon with Glow */}
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-2xl bg-indigo-500/20 blur-lg" />
          <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${current.color} text-white shadow-lg`}>
            <Icon className="h-7 w-7" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
          {current.title}
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {current.subtitle}
        </p>

        {/* Dynamic Content */}
        <div className="mt-4 min-h-[140px]">
          {current.content}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
          <button
            onClick={() => handleFinish()}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => handleFinish()}>
                Finish <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Global function to trigger onboarding modal from anywhere
export function triggerOnboardingReplay() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fintrack:replay-onboarding"));
  }
}

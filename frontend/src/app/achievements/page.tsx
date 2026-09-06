"use client";

import { useState, useEffect } from "react";
import {
  Award,
  Sparkles,
  Target,
  ShieldCheck,
  Wallet,
  Repeat,
  Building2,
  FolderTree,
  TrendingUp,
  CheckCircle2,
  Lock,
  Trophy,
  Flame,
  Star,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Badge, Button } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  points: number;
}

interface AchievementStats {
  unlockedCount: number;
  totalCount: number;
  totalPoints: number;
  maxPoints: number;
  completionPct: number;
}

const TIER_COLORS = {
  Bronze: "from-amber-700 to-amber-900 border-amber-600/40 text-amber-100",
  Silver: "from-slate-400 to-slate-600 border-slate-400/40 text-slate-100",
  Gold: "from-amber-400 via-amber-500 to-yellow-600 border-amber-300/60 text-amber-950",
  Platinum: "from-cyan-400 via-indigo-500 to-violet-600 border-cyan-300/60 text-white",
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchAchievements = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/achievements", { credentials: "include" });
        const json = await res.json();
        if (json.success && json.data) {
          setAchievements(json.data.achievements || []);
          setStats(json.data.stats || null);
        }
      } catch (err) {
        console.error("Failed to load achievements:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Target":
        return Target;
      case "ShieldCheck":
        return ShieldCheck;
      case "Wallet":
        return Wallet;
      case "Repeat":
        return Repeat;
      case "Building2":
        return Building2;
      case "FolderTree":
        return FolderTree;
      case "TrendingUp":
        return TrendingUp;
      case "CheckCircle2":
        return CheckCircle2;
      case "Award":
        return Award;
      default:
        return Sparkles;
    }
  };

  const categories = ["All", "Tracking", "Savings", "Budgeting", "Automation", "Accounts"];

  const filtered = activeCategory === "All"
    ? achievements
    : achievements.filter((a) => a.category === activeCategory);

  // Financial Level Calculation
  const level = stats ? Math.floor(stats.totalPoints / 250) + 1 : 1;
  const nextLevelPoints = level * 250;
  const currentLevelProgress = stats ? stats.totalPoints % 250 : 0;

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Financial Milestones & Achievements
          </h1>
          <p className="text-sm text-slate-500">
            Gamified badges, saving streaks, and financial mastery milestones.
          </p>
        </div>

        {/* Hero Level & Progress Banner */}
        <Card className="relative overflow-hidden p-6 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-amber-300 shadow-inner">
                <Trophy className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-400/25 px-2.5 py-0.5 text-xs font-extrabold text-amber-200 border border-amber-300/30">
                    Level {level} Financial Master
                  </span>
                  <span className="flex items-center gap-1 text-xs text-indigo-200 font-semibold">
                    <Flame className="h-3.5 w-3.5 text-amber-400" /> {stats?.totalPoints || 0} XP
                  </span>
                </div>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                  {stats ? `${stats.unlockedCount} of ${stats.totalCount} Badges Unlocked` : "Loading achievements..."}
                </h2>
                <p className="text-xs text-indigo-100">
                  {nextLevelPoints - (stats?.totalPoints || 0)} XP to reach Level {level + 1}
                </p>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="w-full md:w-64">
              <div className="flex justify-between text-xs font-semibold text-indigo-200 mb-1.5">
                <span>Progress to Level {level + 1}</span>
                <span>{Math.round((currentLevelProgress / 250) * 100)}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/30 backdrop-blur-sm">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(100, Math.round((currentLevelProgress / 250) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeCategory === c
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-500"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-3xl bg-slate-200 animate-pulse dark:bg-slate-800" />
            ))
          ) : (
            filtered.map((ach) => {
              const IconComp = getIcon(ach.icon);
              const progressPct = Math.min(100, Math.round((ach.progress / ach.target) * 100));

              return (
                <Card
                  key={ach.id}
                  className={`relative flex flex-col justify-between p-5 transition-all hover:shadow-lg ${
                    ach.unlocked
                      ? "border-amber-200/60 bg-gradient-to-br from-white to-amber-50/20 dark:border-amber-500/20 dark:from-slate-900 dark:to-amber-950/10"
                      : "border-slate-200/70 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60 opacity-80"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${
                          ach.unlocked
                            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/20"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                        }`}
                      >
                        {ach.unlocked ? <IconComp className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                            ach.unlocked
                              ? "bg-amber-100/70 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/40"
                              : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                          }`}
                        >
                          {ach.tier}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Star className="h-3 w-3 fill-amber-500" /> +{ach.points}
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="mt-3.5 font-extrabold text-slate-900 dark:text-white">
                      {ach.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-400">
                      {ach.description}
                    </p>
                  </div>

                  {/* Progress / Status Footer */}
                  <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                    {ach.unlocked ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Completed & Claimed</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                          <span>Progress</span>
                          <span>
                            {ach.progress} / {ach.target} ({progressPct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}

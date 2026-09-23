"use client";

import { useState, useEffect, useMemo } from "react";
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
  Search,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Modal } from "@/components/ui";
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

const TIER_BADGES = {
  Bronze: "text-amber-700 bg-amber-50 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  Silver: "text-slate-700 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  Gold: "text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  Platinum: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
};

const STAGES_CONFIG = [
  { stage: 1, title: "Foundations", minXp: 0, maxXp: 250 },
  { stage: 2, title: "Governance", minXp: 250, maxXp: 500 },
  { stage: 3, title: "Optimization", minXp: 500, maxXp: 750 },
  { stage: 4, title: "Automation", minXp: 750, maxXp: 1000 },
  { stage: 5, title: "Mastery", minXp: 1000, maxXp: 1500 },
];

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Modal
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

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

  const totalXp = stats?.totalPoints || 0;
  const currentStage = useMemo(() => {
    return (
      STAGES_CONFIG.find((s) => totalXp >= s.minXp && totalXp < s.maxXp) ||
      STAGES_CONFIG[STAGES_CONFIG.length - 1]
    );
  }, [totalXp]);

  const stageProgress = useMemo(() => {
    const min = currentStage.minXp;
    const max = currentStage.maxXp;
    const range = max - min;
    const current = Math.max(0, totalXp - min);
    return Math.min(100, Math.round((current / range) * 100));
  }, [totalXp, currentStage]);

  const xpToNext = Math.max(0, currentStage.maxXp - totalXp);

  // Filtered achievements
  const filtered = useMemo(() => {
    return achievements.filter((ach) => {
      const matchCat = activeCategory === "All" || ach.category === activeCategory;
      const matchStatus =
        statusFilter === "all" ? true : statusFilter === "unlocked" ? ach.unlocked : !ach.unlocked;
      const matchSearch =
        ach.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ach.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    });
  }, [achievements, activeCategory, statusFilter, searchQuery]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* 1. Clean, Consistent Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Achievements
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Track milestones, earn points, and build disciplined financial habits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold shadow-xs dark:border-white/[0.08] dark:bg-[#15181d]">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-slate-800 dark:text-slate-200">
                {stats?.unlockedCount || 0} / {stats?.totalCount || 0} Completed
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-900 dark:text-emerald-400 font-black">
                {totalXp} XP
              </span>
            </div>
          </div>
        </div>

        {/* 2. Unified Stage & XP Summary Card (One single proportional banner) */}
        <Card className="p-5 border-slate-200/80 dark:border-white/[0.08] dark:bg-[#15181d] rounded-3xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Stage {currentStage.stage} · {currentStage.title}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {xpToNext > 0 ? `${xpToNext} XP to Stage ${currentStage.stage + 1}` : "Maximum stage reached"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {stats ? `${stats.unlockedCount} of ${stats.totalCount} milestones completed` : "Loading..."}
                </p>
              </div>
            </div>

            {/* Stage Progress Track */}
            <div className="w-full lg:w-72">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                <span>Stage Progress</span>
                <span className="text-slate-800 dark:text-slate-200">{stageProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-400"
                  style={{ width: `${stageProgress}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>{currentStage.minXp} XP</span>
                <span>{currentStage.maxXp} XP</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 3. Single Toolbar: Status Filter, Category Dropdown & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented status control */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              All ({achievements.length})
            </button>
            <button
              onClick={() => setStatusFilter("unlocked")}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                statusFilter === "unlocked"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Completed ({achievements.filter((a) => a.unlocked).length})
            </button>
            <button
              onClick={() => setStatusFilter("locked")}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                statusFilter === "locked"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              In Progress ({achievements.filter((a) => !a.unlocked).length})
            </button>
          </div>

          {/* Category Dropdown & Search */}
          <div className="flex items-center gap-2">
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>

            <div className="relative w-44 sm:w-52">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200/80 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 4. Balanced Badge Cards Grid */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <Trophy className="mx-auto h-7 w-7 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">No achievements found</p>
              <p className="text-xs text-slate-400 mt-0.5">Try selecting a different filter or clearing search.</p>
            </div>
          ) : (
            filtered.map((ach) => {
              const IconComp = getIcon(ach.icon);
              const progressPct = Math.min(100, Math.round((ach.progress / ach.target) * 100));

              return (
                <Card
                  key={ach.id}
                  onClick={() => setSelectedAchievement(ach)}
                  className={`group relative flex flex-col justify-between p-4 border transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer ${
                    ach.unlocked
                      ? "border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111827]"
                      : "border-slate-200/70 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/30"
                  }`}
                >
                  <div>
                    {/* Header: Emblem & Tier Badge */}
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                          ach.unlocked
                            ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                        }`}
                      >
                        {ach.unlocked ? <IconComp className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${TIER_BADGES[ach.tier] || TIER_BADGES.Bronze}`}>
                          {ach.tier}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          +{ach.points} XP
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {ach.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>

                  {/* Card Footer: Status or Progress Bar */}
                  <div className="mt-4 border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                    {ach.unlocked ? (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Completed</span>
                        </div>
                        <span className="text-[11px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition">
                          View details →
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
                          <span>Progress</span>
                          <span>
                            {ach.progress} / {ach.target} ({progressPct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
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

        {/* 5. Detail Modal */}
        <Modal
          open={!!selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
          title="Achievement Details"
        >
          {selectedAchievement && (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    selectedAchievement.unlocked
                      ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  {selectedAchievement.unlocked ? (
                    (() => {
                      const Comp = getIcon(selectedAchievement.icon);
                      return <Comp className="h-6 w-6" />;
                    })()
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${TIER_BADGES[selectedAchievement.tier] || TIER_BADGES.Bronze}`}>
                      {selectedAchievement.tier} Tier
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      +{selectedAchievement.points} XP
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                    {selectedAchievement.title}
                  </h3>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Requirement
                </p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  {selectedAchievement.description}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-semibold">
                  <span>Status</span>
                  <span className={selectedAchievement.unlocked ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}>
                    {selectedAchievement.unlocked
                      ? "Completed (100%)"
                      : `${selectedAchievement.progress} / ${selectedAchievement.target} (${Math.min(100, Math.round((selectedAchievement.progress / selectedAchievement.target) * 100))}%)`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      selectedAchievement.unlocked ? "bg-emerald-500" : "bg-indigo-600 dark:bg-indigo-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((selectedAchievement.progress / selectedAchievement.target) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setSelectedAchievement(null)}>Close</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}

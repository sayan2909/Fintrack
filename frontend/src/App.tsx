import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Pages
import LandingPage from "./app/page";
import DashboardPage from "./app/dashboard/page";
import TransactionsPage from "./app/transactions/page";
import BudgetsPage from "./app/budgets/page";
import GoalsPage from "./app/goals/page";
import AnalyticsPage from "./app/analytics/page";
import AccountsPage from "./app/accounts/page";
import RecurringPage from "./app/recurring/page";
import CategoriesPage from "./app/categories/page";
import CalendarPage from "./app/calendar/page";
import ReportsPage from "./app/reports/page";
import InsightsPage from "./app/insights/page";
import AchievementsPage from "./app/achievements/page";
import NotificationsPage from "./app/notifications/page";
import SettingsPage from "./app/settings/page";
import ProfilePage from "./app/profile/page";
import LoginPage from "./app/login/page";
import RegisterPage from "./app/register/page";
import ForgotPasswordPage from "./app/forgot-password/page";
import ResetPasswordPage from "./app/reset-password/page";

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#eef2f6] dark:bg-[#0b0f19]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

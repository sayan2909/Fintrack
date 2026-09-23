"use client";

import Link from "next/link";
import { ArrowLeft, Scale, AlertTriangle, CheckCircle2, Wallet, UserCheck } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#0b0e11] dark:text-slate-100 transition-colors">
      {/* Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#15181d]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to FinTrack</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-bold">
              <Wallet className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
              FinTrack
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 border-b border-slate-200/80 pb-6 dark:border-white/[0.08]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            FinTrack Legal & Terms
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Terms of Service
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Effective Date: September 2026 · Standard User Agreement & Service Terms
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {/* Card 1: Permitted Usage */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15181d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              1. Acceptance of Terms & Permitted Usage
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              FinTrack provides personal financial management and expense tracking software. By creating an account or accessing the platform, you agree to comply with this User Agreement and all applicable regulations.
            </p>
          </div>

          {/* Card 2: Financial Disclaimer */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 dark:border-amber-500/20 dark:bg-amber-500/[0.03]">
            <h2 className="text-base font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              2. Financial Information & Non-Advisory Disclaimer
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              FinTrack provides organizational, analytical, and budgeting tools for informational purposes only. FinTrack is not a chartered financial institution, registered investment advisor, or tax consultancy. Calculations, projections, and reports do not constitute certified financial or accounting advice.
            </p>
          </div>

          {/* Card 3: Account Responsibilities */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15181d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              3. Account Security & User Credentials
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You are responsible for safeguarding your authentication credentials. FinTrack provides multi-device session management within Settings to monitor and revoke active sessions at your discretion.
            </p>
          </div>

          {/* Card 4: Content Ownership */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15181d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              4. Proprietary Data Rights & User Content Ownership
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You retain full and unconditional ownership of all financial transactions, records, and receipts uploaded to your profile. FinTrack claims no proprietary ownership over your personal financial data.
            </p>
          </div>

          {/* Card 5: Termination & Questions */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15181d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              5. Agreement Termination & Support Inquiries
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You may terminate your account and erase all associated records at any time via Settings. For questions regarding these Terms of Service or regulatory notices, contact our team at{" "}
              <a href="mailto:support@fintrack.app" className="font-bold text-emerald-500 hover:underline">
                support@fintrack.app
              </a>.
            </p>
          </div>
        </div>

        {/* Bottom Nav Links */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} FinTrack. All rights reserved.</p>
          <Link href="/privacy" className="font-semibold hover:text-slate-900 dark:hover:text-emerald-500 transition">
            View Privacy Policy →
          </Link>
        </div>
      </main>
    </div>
  );
}

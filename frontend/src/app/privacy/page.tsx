"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Lock, Wallet, Trash2, CheckCircle2 } from "lucide-react";

export default function PrivacyPolicyPage() {
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#bbf246] text-[#0b0e11] font-black">
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
            FinTrack Legal & Compliance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Effective Date: September 2026 · Standard Privacy Policy & Data Protection Disclosure
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {/* Card 1: Non-Sale Commitment */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15181d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-[#bbf246]" />
              1. Data Ownership & Non-Sale Commitment
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We do not sell, rent, license, or monetize your transactions, account balances, or financial history to advertising networks, data brokers, or credit bureaus. Your financial records exist solely for you to budget and plan your money.
            </p>
          </div>

          {/* Card 2: What We Collect */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15181d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-[#bbf246]" />
              2. Information Collected & Processing Grounds
            </h2>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-4">
              <li>
                <strong>Account Credentials:</strong> Your legal or preferred name and email address to authenticate access and deliver critical security alerts.
              </li>
              <li>
                <strong>Financial Records:</strong> Transaction logs, wallets, custom categories, and budget targets configured by your account.
              </li>
              <li>
                <strong>Authentication Security:</strong> Passwords securely hashed using one-way cryptographic encryption (bcrypt). Unhashed passwords are never stored or accessible.
              </li>
            </ul>
          </div>

          {/* Card 3: Scanned Receipts */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15181d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-[#bbf246]" />
              3. Client-Side Document Processing & Security
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              When scanning or uploading receipt documents, optical recognition processes locally on your client machine. Document imagery is not syndicated to external generative AI model trainers or third-party brokers.
            </p>
          </div>

          {/* Card 4: Data Control & Deletion */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15181d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Trash2 className="h-4 w-4 text-[#bbf246]" />
              4. User Rights, Data Portability & Erasure
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You retain full rights to request portable backups of your transaction data in standardized JSON format. Furthermore, you may exercise account erasure at any time via Settings to permanently purge all associated data records from the database.
            </p>
          </div>

          {/* Card 5: Contact */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15181d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              5. Regulatory Inquiries & Privacy Contact
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              For questions concerning this Privacy Policy, data governance practices, or to exercise statutory privacy rights, please direct inquiries to{" "}
              <a href="mailto:privacy@fintrack.app" className="font-bold text-[#bbf246] hover:underline">
                privacy@fintrack.app
              </a>.
            </p>
          </div>
        </div>

        {/* Bottom Nav Links */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} FinTrack. All rights reserved.</p>
          <Link href="/terms" className="font-semibold hover:text-slate-900 dark:hover:text-[#bbf246] transition">
            View Terms of Service →
          </Link>
        </div>
      </main>
    </div>
  );
}

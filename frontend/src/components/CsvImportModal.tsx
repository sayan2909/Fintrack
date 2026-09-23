"use client";

import { useState, useRef, useId } from "react";
import {
  FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Sparkles,
  ArrowRight, Landmark, RefreshCw, X, ChevronDown, Check,
} from "lucide-react";
import { Button, toast } from "@/components/ui";
import { predictCategory } from "@/lib/categorizer";
import { formatCurrency } from "@/lib/currency";

interface AccountOption {
  id: string;
  name: string;
  type: string;
  balance?: string;
}

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: AccountOption[];
  currency?: string;
}

interface ParsedRow {
  raw: Record<string, string>;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  isValid: boolean;
  error?: string;
}

export function CsvImportModal({
  open,
  onClose,
  onSuccess,
  accounts,
  currency = "USD",
}: CsvImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvRaw, setCsvRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form field unique IDs for accessibility & browser interaction
  const dateColId = useId();
  const descColId = useId();
  const amtColId = useId();
  const catColId = useId();
  const targetAccId = useId();

  // Column Mappings
  const [mapping, setMapping] = useState({
    dateCol: "",
    descCol: "",
    amountCol: "",
    categoryCol: "",
    selectedAccountId: accounts[0]?.id || "",
  });

  const [parsedPreview, setParsedPreview] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  // Simple, robust CSV parser supporting quoted values
  const parseCsvText = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      toast("CSV file must contain a header row and at least one data row.", "error");
      return;
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === "," && !inQuotes) {
          result.push(cur.trim().replace(/^"|"$/g, ""));
          cur = "";
        } else {
          cur += c;
        }
      }
      result.push(cur.trim().replace(/^"|"$/g, ""));
      return result;
    };

    const headerCols = parseLine(lines[0]);
    setHeaders(headerCols);

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length === 0 || (cols.length === 1 && cols[0] === "")) continue;
      const row: Record<string, string> = {};
      headerCols.forEach((h, idx) => {
        row[h] = cols[idx] || "";
      });
      rows.push(row);
    }

    setRawRows(rows);

    // Auto-detect column headers based on common bank statement terms
    const lower = headerCols.map((h) => h.toLowerCase());
    const findMatch = (candidates: string[]) => {
      const idx = lower.findIndex((l) => candidates.some((c) => l.includes(c)));
      return idx >= 0 ? headerCols[idx] : "";
    };

    const autoDate = findMatch(["date", "time", "posted", "trans date"]);
    const autoDesc = findMatch(["desc", "narrative", "merchant", "memo", "payee", "detail"]);
    const autoAmt = findMatch(["amount", "total", "sum", "value", "debit"]);
    const autoCat = findMatch(["category", "type", "tag", "classification"]);

    setMapping((prev) => ({
      ...prev,
      dateCol: autoDate || headerCols[0] || "",
      descCol: autoDesc || (headerCols.length > 1 ? headerCols[1] : ""),
      amountCol: autoAmt || (headerCols.length > 2 ? headerCols[2] : ""),
      categoryCol: autoCat,
      selectedAccountId: prev.selectedAccountId || accounts[0]?.id || "",
    }));

    setStep(2);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || "");
      setCsvRaw(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const loadSampleStatement = () => {
    const sample = `Date,Description,Amount,Category,Payment Method
2026-09-18,Starbucks Reserve,-6.75,Food & Dining,Card
2026-09-19,Uber Ride to Airport,-34.50,Transportation,UPI
2026-09-20,Acme Corp Monthly Salary,4250.00,Income,Bank Transfer
2026-09-21,Whole Foods Market,-89.20,Food & Dining,Debit Card
2026-09-22,Netflix Subscription,-15.99,Entertainment,Credit Card
2026-09-23,Apple Store Electronics,-199.00,Shopping,Credit Card`;

    setFileName("sample_bank_statement.csv");
    setCsvRaw(sample);
    parseCsvText(sample);
  };

  const processMappingAndPreview = () => {
    if (!mapping.dateCol || !mapping.descCol || !mapping.amountCol) {
      toast("Please select Date, Description, and Amount columns.", "error");
      return;
    }

    const processed: ParsedRow[] = rawRows.map((r) => {
      const rawDate = r[mapping.dateCol] || "";
      const rawDesc = r[mapping.descCol] || "";
      const rawAmtStr = (r[mapping.amountCol] || "").replace(/[^0-9.-]/g, "");
      let amtNum = parseFloat(rawAmtStr);

      let isVal = true;
      let err: string | undefined;

      if (isNaN(amtNum)) {
        isVal = false;
        err = "Invalid amount";
        amtNum = 0;
      }

      // Check date
      let parsedDate = rawDate;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) {
        parsedDate = new Date().toISOString().slice(0, 10);
      } else {
        parsedDate = d.toISOString().slice(0, 10);
      }

      // Detect Income vs Expense
      let txType: "income" | "expense" = "expense";
      if (amtNum > 0 && (r[mapping.categoryCol]?.toLowerCase().includes("income") || r[mapping.descCol]?.toLowerCase().includes("salary") || r[mapping.descCol]?.toLowerCase().includes("deposit"))) {
        txType = "income";
      } else if (amtNum < 0) {
        txType = "expense";
        amtNum = Math.abs(amtNum);
      } else if (amtNum > 0) {
        // Standard expense vs positive income heuristic
        const prediction = predictCategory(rawDesc);
        txType = prediction.type;
      }

      // Predicted or mapped category
      let category = mapping.categoryCol && r[mapping.categoryCol] ? r[mapping.categoryCol].trim() : "";
      if (!category || category.toLowerCase() === "general") {
        category = predictCategory(rawDesc).category;
      }

      return {
        raw: r,
        date: parsedDate,
        description: rawDesc || "Transaction",
        amount: Math.abs(amtNum),
        type: txType,
        category,
        isValid: isVal,
        error: err,
      };
    });

    setParsedPreview(processed);
    setStep(3);
  };

  const handleExecuteImport = async () => {
    const validRows = parsedPreview.filter((r) => r.isValid && r.amount > 0);
    if (validRows.length === 0) {
      toast("No valid transactions found to import.", "error");
      return;
    }

    setImporting(true);
    try {
      const payload = {
        items: validRows.map((r) => ({
          date: r.date,
          description: r.description,
          amount: String(r.amount),
          type: r.type,
          categoryName: r.category,
          accountId: mapping.selectedAccountId || null,
          paymentMethod: "Bank Transfer",
          notes: `Imported via Statement: ${fileName || "CSV"}`,
        })),
      };

      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to import statement");

      toast(`Successfully imported ${json.data.importedCount} transactions! 🚀`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Error importing statement", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 ring-1 ring-indigo-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Import Bank Statement / CSV
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seamlessly upload Chase, HDFC, Barclays, or custom bank exports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center justify-center gap-3 border-b border-slate-200/50 bg-slate-50/50 px-6 py-3 dark:border-slate-800/60 dark:bg-slate-950/40 text-xs font-semibold">
          <span className={`flex items-center gap-1.5 ${step >= 1 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${step >= 1 ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>1</span>
            Upload File
          </span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className={`flex items-center gap-1.5 ${step >= 2 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${step >= 2 ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>2</span>
            Map Columns
          </span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className={`flex items-center gap-1.5 ${step >= 3 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${step >= 3 ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>3</span>
            Verify & Import
          </span>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center transition-all hover:border-indigo-500 hover:bg-indigo-50/20 dark:border-slate-700 dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/5 cursor-pointer"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm transition-transform group-hover:scale-110 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  Drop your CSV file here or <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Supports CSV bank statement exports with headers like Date, Merchant/Description, and Amount.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Want to test with sample bank data?
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Instantly load a demo statement with salary, coffee, Uber, and shopping entries.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={loadSampleStatement}
                  className="h-8 text-xs font-semibold cursor-pointer shrink-0"
                >
                  Load Sample Statement
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Detected {rawRows.length} rows from <span className="underline font-mono">{fileName || "Statement"}</span>
                </div>
                <p className="mt-1 text-[11px] text-indigo-700/80 dark:text-indigo-300/70">
                  Match each column from your CSV below. FinTrack has automatically pre-selected best matches.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date column */}
                <div>
                  <label htmlFor={dateColId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date Column <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id={dateColId}
                    value={mapping.dateCol}
                    onChange={(e) => setMapping({ ...mapping, dateCol: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select column...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Description column */}
                <div>
                  <label htmlFor={descColId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description / Merchant <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id={descColId}
                    value={mapping.descCol}
                    onChange={(e) => setMapping({ ...mapping, descCol: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select column...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Amount column */}
                <div>
                  <label htmlFor={amtColId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Amount Column <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id={amtColId}
                    value={mapping.amountCol}
                    onChange={(e) => setMapping({ ...mapping, amountCol: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select column...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Category column (optional) */}
                <div>
                  <label htmlFor={catColId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Category Column (Optional)</span>
                    <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Auto-categorize enabled
                    </span>
                  </label>
                  <select
                    id={catColId}
                    value={mapping.categoryCol}
                    onChange={(e) => setMapping({ ...mapping, categoryCol: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None (Auto-predict with AI rules)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Target Account */}
                <div className="sm:col-span-2">
                  <label htmlFor={targetAccId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Apply to Account
                  </label>
                  <select
                    id={targetAccId}
                    value={mapping.selectedAccountId}
                    onChange={(e) => setMapping({ ...mapping, selectedAccountId: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type}) — {formatCurrency(parseFloat(a.balance || "0"), currency)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Previewing First {Math.min(10, parsedPreview.length)} of {parsedPreview.length} Transactions
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Verify date parsing and auto-categorization before finalizing import.
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="h-3 w-3" /> {parsedPreview.filter((p) => p.isValid).length} Valid Entries
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {parsedPreview.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {row.date}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white max-w-[240px] truncate">
                          {row.description}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                            <Sparkles className="h-2.5 w-2.5" />
                            {row.category}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono font-bold ${row.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                          {row.type === "income" ? "+" : "-"}
                          {formatCurrency(row.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          {step > 1 ? (
            <Button
              variant="secondary"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              disabled={importing}
              className="h-9 px-4 text-xs font-semibold cursor-pointer"
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={importing}
              className="h-9 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>

            {step === 2 && (
              <Button
                variant="primary"
                onClick={processMappingAndPreview}
                className="h-9 px-5 text-xs font-semibold cursor-pointer"
              >
                Continue to Preview <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}

            {step === 3 && (
              <Button
                variant="primary"
                onClick={handleExecuteImport}
                loading={importing}
                className="h-9 px-6 text-xs font-semibold cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20"
              >
                Import {parsedPreview.filter((p) => p.isValid).length} Transactions
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

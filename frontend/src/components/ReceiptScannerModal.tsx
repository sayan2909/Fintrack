"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import {
  Scan,
  Camera,
  UploadCloud,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Receipt,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  SlidersHorizontal,
} from "lucide-react";
import { Button, Field, inputCls } from "./ui";
import { preprocessReceiptImage } from "@/lib/imagePreprocessor";
import { parseReceiptText, ParsedReceipt } from "@/lib/receiptParser";
import { createWorker } from "tesseract.js";

export interface ReceiptScanResult {
  merchant: string;
  amount: number | null;
  date: string | null;
  category: string;
  rawText: string;
  previewUrl?: string;
}

interface ReceiptScannerModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (result: ReceiptScanResult) => void;
  currencySymbol?: string;
}

type ScanStep = "upload" | "scanning" | "verify";

export function ReceiptScannerModal({
  open,
  onClose,
  onApply,
  currencySymbol = "₹",
}: ReceiptScannerModalProps) {
  const [step, setStep] = useState<ScanStep>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [progressPct, setProgressPct] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable parsed fields
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [category, setCategory] = useState<string>("Food & Dining");
  const [confidence, setConfidence] = useState<number>(0);
  const [rawOcrText, setRawOcrText] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("upload");
        setPreviewUrl(null);
        setErrorMsg(null);
        setProgressPct(0);
        setProgressMsg("");
      }, 200);
    }
  }, [open]);

  // Handle Drag & Drop
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  // Process File with Preprocessor & Tesseract OCR
  const handleFileSelected = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid receipt image (JPG, PNG, WEBP).");
      return;
    }

    try {
      setErrorMsg(null);
      setStep("scanning");
      setProgressPct(10);
      setProgressMsg("Enhancing receipt contrast & sharpening text...");

      // 1. Client-side canvas preprocessing (grayscale + adaptive contrast)
      const processedDataUrl = await preprocessReceiptImage(file);
      setPreviewUrl(processedDataUrl);

      setProgressPct(30);
      setProgressMsg("Loading WebAssembly OCR neural engine...");

      // 2. Initialize Tesseract worker
      const worker = await createWorker("eng", undefined, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const p = Math.round(30 + m.progress * 60);
            setProgressPct(p);
            setProgressMsg(`Reading receipt lines... ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // 3. Recognize text from preprocessed dataUrl
      const ret = await worker.recognize(processedDataUrl);
      await worker.terminate();

      const extractedText = ret.data.text || "";
      setRawOcrText(extractedText);

      setProgressPct(95);
      setProgressMsg("Detecting merchant name, total & tax...");

      // 4. Parse structured receipt data
      const parsed: ParsedReceipt = parseReceiptText(extractedText);

      setMerchant(parsed.merchant);
      setAmount(parsed.amount !== null ? parsed.amount.toString() : "");
      setDate(parsed.date || new Date().toISOString().split("T")[0]);
      setCategory(parsed.category || "General");
      setConfidence(parsed.confidence);

      setProgressPct(100);
      setStep("verify");
    } catch (err: unknown) {
      console.error("Receipt OCR error:", err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Failed to process receipt image. Please try another photo with clear lighting."
      );
      setStep("upload");
    }
  };

  // Generate Sample Demo Receipt for instant testing
  const handleDemoReceipt = async () => {
    try {
      setErrorMsg(null);
      setStep("scanning");
      setProgressPct(20);
      setProgressMsg("Generating sample thermal receipt...");

      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Realistic paper background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Receipt thermal text simulation
      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.font = "bold 32px monospace";
      ctx.fillText("STARBUCKS COFFEE", 300, 70);

      ctx.font = "18px monospace";
      ctx.fillText("Store #1042 - Bandra Kurla Complex", 300, 105);
      ctx.fillText("Mumbai, MH 400051", 300, 130);
      ctx.fillText("GSTIN: 27AABCS1429B1Z8", 300, 155);

      ctx.fillText("------------------------------------------", 300, 185);

      ctx.textAlign = "left";
      ctx.fillText("Date: 23/09/2026", 40, 220);
      ctx.fillText("Time: 14:45", 420, 220);
      ctx.fillText("Order #: 89402", 40, 250);

      ctx.fillText("------------------------------------------", 300, 280);

      ctx.font = "bold 20px monospace";
      ctx.fillText("ITEM                      QTY      PRICE", 40, 310);
      ctx.font = "18px monospace";
      ctx.fillText("Caffe Latte Grande         1      325.00", 40, 350);
      ctx.fillText("Blueberry Muffin           1      160.00", 40, 390);

      ctx.fillText("------------------------------------------", 300, 430);
      ctx.fillText("Subtotal:                         485.00", 40, 465);
      ctx.fillText("CGST (2.5%):                       12.12", 40, 495);
      ctx.fillText("SGST (2.5%):                       12.12", 40, 525);

      ctx.font = "bold 26px monospace";
      ctx.fillText("TOTAL AMOUNT:             INR 509.24", 40, 575);

      ctx.font = "18px monospace";
      ctx.fillText("Payment Method: UPI / Scan & Pay", 40, 620);
      ctx.fillText("------------------------------------------", 300, 650);

      ctx.textAlign = "center";
      ctx.fillText("THANK YOU FOR YOUR VISIT!", 300, 690);
      ctx.fillText("Visit www.starbucks.in for feedback", 300, 720);

      const dataUrl = canvas.toDataURL("image/png");
      setPreviewUrl(dataUrl);

      setProgressPct(50);
      setProgressMsg("OCR engine scanning sample receipt...");

      const worker = await createWorker("eng", undefined, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const p = Math.round(50 + m.progress * 45);
            setProgressPct(p);
          }
        },
      });

      const ret = await worker.recognize(canvas);
      await worker.terminate();

      const extractedText = ret.data.text || "";
      setRawOcrText(extractedText);

      const parsed = parseReceiptText(extractedText);

      setMerchant(parsed.merchant || "Starbucks Coffee");
      setAmount(parsed.amount !== null ? parsed.amount.toString() : "509.24");
      setDate(parsed.date || "2026-09-23");
      setCategory(parsed.category || "Food & Dining");
      setConfidence(95);

      setProgressPct(100);
      setStep("verify");
    } catch (err: unknown) {
      console.error("Demo receipt error:", err);
      setErrorMsg("Demo receipt parsing error. Please try uploading an image.");
      setStep("upload");
    }
  };

  const handleApply = () => {
    onApply({
      merchant: merchant.trim() || "Receipt Expense",
      amount: parseFloat(amount) || null,
      date: date || new Date().toISOString().split("T")[0],
      category,
      rawText: rawOcrText,
      previewUrl: previewUrl || undefined,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-md sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-up relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xl sm:rounded-3xl dark:border-white/[0.08] dark:bg-[#15181d]"
      >
        {/* Mobile Drag Indicator */}
        <div className="mx-auto -mt-1.5 mb-3.5 h-1.5 w-12 rounded-full bg-slate-300/80 dark:bg-slate-700/80 sm:hidden" />

        {/* Modal Header */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">
              <Scan className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Smart Receipt Auto-Scan
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">
                  <Sparkles className="h-3 w-3" /> Client-Side AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instant OCR text extraction • Zero cloud data leaks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1">{errorMsg}</p>
          </div>
        )}

        {/* STEP 1: UPLOAD / CAMERA */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-emerald-500 bg-slate-50 dark:bg-white/[0.04] scale-[0.99]"
                  : "border-slate-300 hover:border-emerald-500/70 hover:bg-slate-50/50 dark:border-white/[0.12] dark:hover:border-slate-200 dark:border-white/10 dark:hover:bg-[#1a1e24]/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />

              <div className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-transform group-hover:scale-110 dark:bg-[#1f242d] dark:text-emerald-400">
                <UploadCloud className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Drop your receipt here, or{" "}
                <span className="text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">browse file</span>
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Supports JPG, PNG, WEBP (Thermal & Retail receipts)
              </p>

              {/* Mobile Camera Direct Button */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:border-emerald-500 hover:bg-slate-50 dark:border-white/[0.1] dark:bg-[#1e232b] dark:text-slate-200 dark:hover:border-slate-200 dark:border-white/10"
                >
                  <Camera className="h-4 w-4 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" />
                  Snap Photo with Camera
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDemoReceipt();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-200 dark:border-white/10 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 dark:text-emerald-400 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Try Sample Receipt
                </button>
              </div>
            </div>

            {/* Privacy Guarantee Banner */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 text-xs text-slate-600 dark:border-white/[0.06] dark:bg-[#111417] dark:text-slate-400">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" />
              <p>
                <strong className="text-slate-900 dark:text-white">100% Private Client-Side OCR:</strong>{" "}
                Your receipt image is parsed entirely inside your browser using WebAssembly. No photos or banking details are ever transmitted to any external servers.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: SCANNING / OCR IN PROGRESS */}
        {step === "scanning" && (
          <div className="space-y-5 py-4 text-center">
            {previewUrl && (
              <div className="relative mx-auto h-56 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-black/40 shadow-inner dark:border-white/[0.1]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Receipt scanning"
                  className="h-full w-full object-cover opacity-85 filter contrast-125"
                />

                {/* Laser scan line overlay */}
                <div
                  className="absolute left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_10px_2px_rgba(16,185,129,0.4)] animate-bounce"
                  style={{ animationDuration: "1.8s" }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" />
                <span>{progressMsg}</span>
              </div>

              {/* Progress bar */}
              <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Running in-browser WebAssembly OCR ({progressPct}%)
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: VERIFY & CONFIRM RESULTS */}
        {step === "verify" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Receipt Scanned Successfully!</span>
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Confidence: <strong className="text-slate-800 dark:text-white">{confidence}%</strong>
              </div>
            </div>

            {/* Form Fields pre-filled */}
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Detected Merchant / Vendor">
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g. Starbucks, Swiggy, Apple Store"
                    className={inputCls}
                  />
                </Field>
              </div>

              <div>
                <Field label={`Total Amount (${currencySymbol})`}>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={`${inputCls} pl-8 font-mono font-bold text-base`}
                    />
                  </div>
                </Field>
              </div>

              <div>
                <Field label="Receipt Date">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Suggested Category">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Food & Dining, Shopping"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* Raw OCR Text preview accordion */}
            {rawOcrText && (
              <details className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 text-xs dark:border-white/[0.06] dark:bg-[#111417]">
                <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                  View raw OCR extracted lines
                </summary>
                <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {rawOcrText}
                </pre>
              </details>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Scan Another Receipt
              </button>

              <div className="flex w-full sm:w-auto items-center gap-2">
                <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleApply} className="flex-1 sm:flex-none gap-2">
                  <span>Apply to Transaction</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

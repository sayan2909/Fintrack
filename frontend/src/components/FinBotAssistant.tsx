"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, X, Send, Bot, User, ArrowRight,
  RefreshCw, ChevronDown, CheckCircle2, AlertTriangle, Lightbulb
} from "lucide-react";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  actions?: Array<{ label: string; href: string }>;
  timestamp: string;
}

const INITIAL_SUGGESTIONS = [
  "How much did I spend this month?",
  "Do I have any bills due soon?",
  "Am I over budget on anything?",
  "Analyze my finances & savings rate",
];

export default function FinBotAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Hi! I'm **FinBot**, your autonomous financial copilot. I analyze your live accounts, expenses, budgets, and bills in real-time. Ask me anything about your money!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: query }),
      });
      const json = await res.json();

      if (json.success && json.data?.reply) {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: json.data.reply,
          actions: json.data.actions,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(json.message || "Failed to get AI response");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "bot",
          text: "I couldn't reach your financial database right now. Please make sure the backend server is active.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: "Chat cleared! Ask me anything about your accounts, expenses, budgets, or upcoming bills.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-20 right-4 z-40 sm:bottom-6 sm:right-6">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex h-13 w-13 items-center justify-center rounded-2xl bg-[#bbf246] text-[#0b0e11] shadow-lg shadow-[#bbf246]/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            title="Ask FinBot Financial AI Copilot"
            aria-label="Open AI Assistant"
          >
            <Sparkles className="h-6 w-6 stroke-[2.5] transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0b0e11] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0b0e11] ring-2 ring-[#bbf246]" />
            </span>
          </button>
        )}
      </div>

      {/* Floating Chat Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex flex-col h-[520px] max-h-[85vh] sm:w-[400px] rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#15181d]/95 dark:shadow-black/70 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#121519]/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#bbf246] text-[#0b0e11] shadow-xs font-black">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">FinBot Copilot</h3>
                  <span className="rounded-full bg-[#bbf246]/15 px-1.5 py-0.2 text-[9px] font-bold text-[#0b0e11] dark:text-[#bbf246] border border-[#bbf246]/30">
                    AI AGENT
                  </span>
                </div>
                <p className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-[#bbf246] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#bbf246] animate-pulse" />
                  Live Context Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                title="Reset conversation"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                title="Minimize FinBot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#bbf246] text-[#0b0e11] mt-0.5 font-black shadow-xs">
                      <Sparkles className="h-3.5 w-3.5 stroke-[2.5]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                      isUser
                        ? "bg-slate-900 text-white dark:bg-[#bbf246] dark:text-[#0b0e11] rounded-br-xs font-medium"
                        : "bg-slate-100/90 text-slate-800 dark:bg-slate-800/90 dark:text-slate-200 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {m.text.split("\n").map((line, idx) => {
                        // Bold parsing
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
                            {parts.map((p, pIdx) => {
                              if (p.startsWith("**") && p.endsWith("**")) {
                                return (
                                  <strong key={pIdx} className="font-bold">
                                    {p.slice(2, -2)}
                                  </strong>
                                );
                              }
                              return p;
                            })}
                          </p>
                        );
                      })}
                    </div>

                    {/* Action buttons if provided */}
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        {m.actions.map((act) => (
                          <button
                            key={act.href}
                            onClick={() => handleActionClick(act.href)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#bbf246]/15 px-2 py-1 text-[11px] font-bold text-slate-900 dark:text-[#bbf246] border border-[#bbf246]/30 hover:bg-[#bbf246]/25 transition cursor-pointer"
                          >
                            <span>{act.label}</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        ))}
                      </div>
                    )}

                    <span
                      className={`block text-[9px] mt-1 ${
                        isUser ? "text-slate-400 dark:text-[#0b0e11]/70 text-right" : "text-slate-400"
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {isUser && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#bbf246] text-[#0b0e11] font-black">
                  <Sparkles className="h-3 w-3 animate-spin stroke-[2.5]" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-3.5 py-2 dark:bg-slate-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#bbf246] animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#bbf246] animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#bbf246] animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-2 dark:border-white/[0.08] dark:bg-[#121519]/60">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {INITIAL_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  onClick={() => sendMessage(sug)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-slate-200/90 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:border-[#bbf246] hover:text-[#0b0e11] dark:border-white/[0.08] dark:bg-[#181c22] dark:text-slate-300 dark:hover:text-[#bbf246] dark:hover:border-[#bbf246]/40 transition cursor-pointer disabled:opacity-50"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-slate-200/80 p-2.5 dark:border-white/[0.08] bg-white dark:bg-[#121519]"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask FinBot about your finances..."
              disabled={loading}
              className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-500 outline-none dark:text-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#bbf246] text-[#0b0e11] shadow-xs hover:bg-[#a8e030] disabled:opacity-40 transition cursor-pointer font-black"
              title="Send prompt"
            >
              <Send className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

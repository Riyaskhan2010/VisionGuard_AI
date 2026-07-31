import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Minimize2, Maximize2, Sparkles } from "lucide-react";
import { enterpriseAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const SUGGESTIONS = [
  "How many inspections today?",
  "Show critical defects",
  "Worker performance",
  "Show pending reviews",
  "Platform summary",
  "Recurring defects",
  "Quality score",
];

function parseMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hello ${user?.name?.split(" ")[0] || "there"}! I'm your **VisionGuard AI Assistant**. Ask me anything about inspections, defects, workers, or quality metrics.`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, minimized, messages]);

  const send = async (text) => {
    const q = (text || query).trim();
    if (!q) return;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await enterpriseAPI.assistant(q);
      const d = res.data.data;
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: d.response,
        data: d.data,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: "Sorry, I couldn't process that request. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600
                     rounded-full shadow-2xl shadow-blue-900/50 flex items-center justify-center
                     hover:scale-110 transition-all duration-200 group"
          aria-label="Open AI Assistant"
        >
          <Bot className="w-6 h-6 text-white" />
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full
                          border-2 border-slate-900 animate-pulse" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-slate-900 border border-slate-700
                      rounded-2xl shadow-2xl shadow-black/50 transition-all duration-300
                      ${minimized ? "h-14 w-72" : "h-[500px] w-80 sm:w-96"}`}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-700 flex-shrink-0
                          bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-t-2xl">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full
                              flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400
                              rounded-full border border-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">AI Quality Assistant</p>
              {!minimized && <p className="text-slate-400 text-xs">Powered by VisionGuard AI</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(!minimized)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600
                                      rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                                  ${msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-br-sm"
                                    : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700"}`}
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                    />
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600
                                    rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 150, 300].map((d) => (
                          <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggestions */}
              {messages.length <= 1 && (
                <div className="px-3 pb-2">
                  <p className="text-slate-500 text-[10px] mb-1.5 uppercase tracking-wider">Quick questions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.slice(0, 4).map((s) => (
                      <button key={s} onClick={() => send(s)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white
                                   px-2.5 py-1 rounded-full transition-colors border border-slate-600">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="px-3 pb-3 flex-shrink-0">
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Ask anything…"
                    className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm outline-none"
                    disabled={loading}
                  />
                  <button onClick={() => send()} disabled={!query.trim() || loading}
                    className="w-7 h-7 bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                               rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

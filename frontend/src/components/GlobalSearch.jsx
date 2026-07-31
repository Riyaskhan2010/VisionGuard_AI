import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Package, ClipboardList, Users, Loader } from "lucide-react";
import { enterpriseAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearch() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounced = useDebounce(query, 300);

  // keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // search
  useEffect(() => {
    if (!debounced || debounced.length < 2) { setResults(null); return; }
    setLoading(true);
    enterpriseAPI.search(debounced)
      .then((r) => setResults(r.data.data))
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debounced]);

  const handleSelect = (path) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    navigate(path);
  };

  const hasResults = results && (
    results.products?.length || results.inspections?.length || results.workers?.length
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700
                   rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:block">Search…</span>
        <kbd className="hidden md:flex items-center gap-0.5 text-[10px] bg-slate-700 px-1.5 py-0.5 rounded font-mono">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-slate-800 border border-slate-700
                        rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-b border-slate-700">
            {loading ? <Loader className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                     : <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, defects, workers…"
              className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm outline-none"
            />
            {query && (
              <button onClick={() => { setQuery(""); setResults(null); }} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {!query && (
              <p className="text-center text-slate-500 text-sm py-8">Type to search…</p>
            )}
            {query && !loading && !hasResults && (
              <p className="text-center text-slate-500 text-sm py-8">No results for "{query}"</p>
            )}

            {results?.products?.length > 0 && (
              <Section label="Products" icon={Package}>
                {results.products.map((p) => (
                  <ResultItem key={p.id} icon={Package}
                    title={p.product_name} subtitle={p.product_id}
                    onClick={() => handleSelect(`/admin/traceability?product=${p.product_id}`)} />
                ))}
              </Section>
            )}
            {results?.inspections?.length > 0 && (
              <Section label="Inspections" icon={ClipboardList}>
                {results.inspections.map((i) => (
                  <ResultItem key={i.id} icon={ClipboardList}
                    title={`Inspection #${i.id}`}
                    subtitle={`${i.defect || "none"} — ${i.status}`}
                    onClick={() => handleSelect(isAdmin ? "/admin/inspections" : "/worker/history")} />
                ))}
              </Section>
            )}
            {isAdmin && results?.workers?.length > 0 && (
              <Section label="Workers" icon={Users}>
                {results.workers.map((w) => (
                  <ResultItem key={w.id} icon={Users}
                    title={w.name} subtitle={w.email}
                    onClick={() => handleSelect("/admin/workers")} />
                ))}
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, icon: Icon, children }) {
  return (
    <div className="border-b border-slate-700/50 last:border-0">
      <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider
                    flex items-center gap-1 bg-slate-800/50">
        <Icon className="w-3 h-3" /> {label}
      </p>
      {children}
    </div>
  );
}

function ResultItem({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50
                 transition-colors text-left">
      <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-white text-sm font-medium truncate">{title}</p>
        <p className="text-slate-500 text-xs truncate">{subtitle}</p>
      </div>
    </button>
  );
}

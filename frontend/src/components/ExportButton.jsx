import React, { useState } from "react";
import { Download, FileText, Table, ChevronDown } from "lucide-react";
import { adminAPI, enterpriseAPI } from "../services/api";
import { useToast } from "../hooks/useToast";

export default function ExportButton({ inspectionId, period = "all", variant = "dropdown" }) {
  const { toast } = useToast?.() || { toast: { success: () => {}, error: () => {} } };
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const downloadFile = async (url, filename) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vg_token");
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handlePDF = () => {
    if (!inspectionId) return;
    downloadFile(`/api/admin/report/${inspectionId}`, `VisionGuard_Report_${inspectionId}.pdf`);
  };

  const handleCSV = () => {
    const url = `/api/enterprise/reports/export-csv?period=${period}`;
    const token = localStorage.getItem("vg_token");
    // append token as param since we're doing direct download
    downloadFile(`${url}&_t=${token}`, `VisionGuard_Export_${period}.csv`);
  };

  if (variant === "pdf" && inspectionId) {
    return (
      <button onClick={handlePDF} disabled={loading}
        className="btn-secondary !px-3 !py-2 text-sm gap-2">
        {loading
          ? <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
          : <FileText className="w-4 h-4" />}
        PDF
      </button>
    );
  }

  if (variant === "csv") {
    return (
      <button onClick={handleCSV} disabled={loading}
        className="btn-secondary !px-3 !py-2 text-sm gap-2">
        {loading
          ? <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
          : <Table className="w-4 h-4" />}
        Export CSV
      </button>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} disabled={loading}
        className="btn-secondary !px-3 !py-2 text-sm gap-2">
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-slate-800 border border-slate-700
                        rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in">
          <button onClick={handleCSV}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300
                       hover:bg-slate-700 hover:text-white transition-colors text-left">
            <Table className="w-4 h-4 text-emerald-400" /> Export as CSV
          </button>
          {inspectionId && (
            <button onClick={handlePDF}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300
                         hover:bg-slate-700 hover:text-white transition-colors text-left">
              <FileText className="w-4 h-4 text-red-400" /> Download PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}

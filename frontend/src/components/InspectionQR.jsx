import React, { useState } from "react";
import { QrCode, Download, Printer, X, ExternalLink } from "lucide-react";

function buildQRUrl(inspectionId, size = 200) {
  const traceUrl = `${window.location.origin}/admin/inspections?id=${inspectionId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(traceUrl)}&bgcolor=1e293b&color=93c5fd&format=svg`;
}

export default function InspectionQR({ inspectionId, status }) {
  const [open, setOpen] = useState(false);
  if (status !== "Approved") return null;

  const qrUrl = buildQRUrl(inspectionId, 240);
  const downloadUrl = buildQRUrl(inspectionId, 600);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `QR_Inspection_${inspectionId}.svg`;
    a.click();
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>QR Code - Inspection #${inspectionId}</title>
      <style>
        body { background: #0f172a; color: white; font-family: sans-serif;
               display: flex; flex-direction: column; align-items: center;
               justify-content: center; min-height: 100vh; gap: 16px; }
        img { border: 2px solid #334155; border-radius: 12px; }
        p { color: #94a3b8; font-size: 14px; }
      </style></head>
      <body>
        <img src="${buildQRUrl(inspectionId, 400)}" width="400" height="400" />
        <p>Inspection #${inspectionId} — VisionGuard AI</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg
                   bg-blue-900/30 text-blue-400 border border-blue-800/50
                   hover:bg-blue-900/50 transition-colors"
        title="View QR Code"
      >
        <QrCode className="w-3.5 h-3.5" /> QR
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6
                          shadow-2xl animate-fade-in flex flex-col items-center gap-4 w-72">
            <div className="flex items-center justify-between w-full">
              <p className="font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-400" /> Inspection QR
              </p>
              <button onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR image */}
            <div className="bg-slate-700/40 border border-slate-600 rounded-xl p-4">
              <img
                src={qrUrl}
                alt={`QR Inspection #${inspectionId}`}
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>

            <p className="text-slate-400 text-xs text-center">
              Scan to open Inspection #{inspectionId}
            </p>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 w-full">
              <button onClick={handleDownload}
                className="flex flex-col items-center gap-1 p-2.5 bg-slate-700 hover:bg-slate-600
                           rounded-xl transition-colors text-slate-300 hover:text-white">
                <Download className="w-4 h-4" />
                <span className="text-[10px]">Download</span>
              </button>
              <button onClick={handlePrint}
                className="flex flex-col items-center gap-1 p-2.5 bg-slate-700 hover:bg-slate-600
                           rounded-xl transition-colors text-slate-300 hover:text-white">
                <Printer className="w-4 h-4" />
                <span className="text-[10px]">Print</span>
              </button>
              <a
                href={`/admin/traceability?product=${inspectionId}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-1 p-2.5 bg-slate-700 hover:bg-slate-600
                           rounded-xl transition-colors text-slate-300 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-[10px]">Trace</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

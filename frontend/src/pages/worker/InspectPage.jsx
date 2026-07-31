import React, { useState, useEffect, useRef } from "react";
import { inspectionAPI, authAPI } from "../../services/api";
import { useToast } from "../../hooks/useToast";
import Toast from "../../components/Toast";
import LoadingSpinner from "../../components/LoadingSpinner";
import { SeverityBadge, StatusBadge } from "../../components/SeverityBadge";
import DefectBadge from "../../components/DefectBadge";
import QualityScoreMeter from "../../components/QualityScoreMeter";
import RecommendationPanel from "../../components/RecommendationPanel";
import {
  Upload, Image as ImageIcon, Cpu, CheckCircle, AlertTriangle,
  RefreshCw, X, ZoomIn, Camera, Timer,
} from "lucide-react";

const STEPS = ["Select Product", "Upload Image", "AI Detection", "Results"];

export default function InspectPage() {
  const { toasts, toast, removeToast } = useToast();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [step, setStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    authAPI.products()
      .then((r) => setProducts(r.data.data || []))
      .catch(() => toast.error("Failed to load products."))
      .finally(() => setLoadingProducts(false));
  }, []);

  // Clean up camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.product_id.toLowerCase().includes(productSearch.toLowerCase())
  );

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      toast.error("Camera access denied or not available.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setUploadedFilename(null);
      setResult(null);
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 16 * 1024 * 1024) { toast.error("Max file size is 16 MB."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUploadedFilename(null);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith("image/")) { toast.error("Only image files accepted."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUploadedFilename(null);
    setResult(null);
  };

  // ── Upload + detect ───────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await inspectionAPI.upload(fd);
      setUploadedFilename(res.data.data.filename);
      toast.success("Image uploaded successfully.");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDetect = async () => {
    if (!uploadedFilename || !selectedProduct) return;
    setDetecting(true);
    try {
      const res = await inspectionAPI.detect(uploadedFilename, selectedProduct.id);
      setResult(res.data.data);
      setStep(3);
      toast.success("Detection complete!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Detection failed.");
    } finally {
      setDetecting(false);
    }
  };

  const handleReset = () => {
    setStep(0); setFile(null); setPreview(null);
    setUploadedFilename(null); setResult(null);
    setSelectedProduct(null); setProductSearch("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="page-header">
        <h1 className="page-title">New Inspection</h1>
        <p className="page-subtitle">Upload or capture a product image for AI defect analysis</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 ${i <= step ? "text-blue-400" : "text-slate-500"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                              transition-all duration-300
                              ${i < step ? "bg-blue-600 text-white"
                                : i === step ? "bg-blue-600/20 border-2 border-blue-500 text-blue-400"
                                : "bg-slate-700 border-2 border-slate-600 text-slate-500"}`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full transition-colors duration-300
                              ${i < step ? "bg-blue-600" : "bg-slate-700"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 0: Select Product ── */}
      {step === 0 && (
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Select Product</h2>
          {loadingProducts ? (
            <div className="py-8 flex justify-center"><LoadingSpinner text="Loading products…" /></div>
          ) : (
            <>
              <input
                type="text" placeholder="Search products…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="input mb-4"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {filteredProducts.map((p) => (
                  <button key={p.id} onClick={() => setSelectedProduct(p)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-150
                                ${selectedProduct?.id === p.id
                                  ? "border-blue-500 bg-blue-900/20"
                                  : "border-slate-700 bg-slate-800/50 hover:border-slate-500"}`}>
                    <p className="font-medium text-white text-sm">{p.product_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{p.product_id}</p>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-slate-400 text-sm col-span-2 text-center py-4">No products found.</p>
                )}
              </div>
              <button onClick={() => { if (selectedProduct) setStep(1); }}
                disabled={!selectedProduct} className="btn-primary w-full mt-6">
                Continue →
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Step 1: Upload / Capture ── */}
      {step === 1 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Upload or Capture Image</h2>
            <span className="text-xs text-slate-400 bg-slate-700 px-2.5 py-1 rounded-lg">
              {selectedProduct?.product_name}
            </span>
          </div>

          {/* Camera view */}
          {cameraActive ? (
            <div className="mb-4">
              <video ref={videoRef} className="w-full rounded-xl border border-slate-600 bg-black" autoPlay playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-3 mt-3">
                <button onClick={stopCamera} className="btn-secondary flex-1">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button onClick={capturePhoto} className="btn-primary flex-1">
                  <Camera className="w-4 h-4" /> Capture
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                            transition-all duration-200 group mb-4
                            ${file ? "border-blue-600 bg-blue-900/10"
                              : "border-slate-600 hover:border-blue-600 hover:bg-slate-700/30"}`}>
                {preview ? (
                  <div className="relative inline-block">
                    <img src={preview} alt="preview" className="max-h-56 rounded-lg object-contain mx-auto" />
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4
                                    group-hover:bg-blue-900/30 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-400" />
                    </div>
                    <p className="text-slate-300 font-medium">Drop image here or <span className="text-blue-400">browse</span></p>
                    <p className="text-slate-500 text-sm mt-1">PNG, JPG, JPEG, WEBP — Max 16 MB</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*"
                  className="hidden" onChange={handleFileChange} />
              </div>

              {/* Camera button */}
              <button onClick={startCamera}
                className="w-full btn-secondary mb-4 justify-center">
                <Camera className="w-4 h-4" /> Use Camera
              </button>
            </>
          )}

          {file && (
            <div className="mb-4 p-3 bg-slate-700/40 rounded-lg flex items-center gap-2 text-sm text-slate-300">
              <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="truncate flex-1">{file.name}</span>
              <span className="text-slate-500 flex-shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="btn-secondary flex-1">← Back</button>
            <button onClick={handleUpload} disabled={!file || uploading} className="btn-primary flex-1">
              {uploading ? <><LoadingSpinner size="sm" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Detection ── */}
      {step === 2 && (
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Run AI Detection</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-700/40 rounded-xl border border-slate-600">
              <p className="text-xs text-slate-400 mb-1">Product</p>
              <p className="text-white font-medium">{selectedProduct?.product_name}</p>
              <p className="text-xs text-slate-400 font-mono">{selectedProduct?.product_id}</p>
            </div>
            <div className="p-4 bg-slate-700/40 rounded-xl border border-slate-600">
              <p className="text-xs text-slate-400 mb-2">Image Preview</p>
              {preview && <img src={preview} alt="preview" className="h-16 rounded-lg object-cover" />}
            </div>
          </div>

          <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-xl mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <p className="text-blue-300 font-semibold text-sm">YOLOv8 Detection Engine</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-blue-400/80">
              {["Crack", "Scratch", "Dent", "Missing Component", "Surface Damage", "Burn Mark"].map((d) => (
                <span key={d} className="bg-blue-900/30 rounded px-2 py-1 text-center">{d}</span>
              ))}
            </div>
          </div>

          {detecting ? (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-900 rounded-full" />
                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <Cpu className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
              </div>
              <p className="text-blue-400 font-medium">Analyzing with YOLOv8…</p>
              <p className="text-slate-500 text-sm">This may take a few seconds</p>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
              <button onClick={handleDetect} className="btn-primary flex-1">
                <Cpu className="w-4 h-4" /> Run Detection
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Results ── */}
      {step === 3 && result && (
        <div className="space-y-4 animate-fade-in">
          {result.is_recurring && (
            <div className="flex items-start gap-3 p-4 bg-orange-900/20 border border-orange-800 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-300 font-semibold text-sm">⚠ Recurring Defect Detected</p>
                <p className="text-orange-400/80 text-xs mt-0.5">
                  This defect has been seen on this product before ({result.recurrence_count}× total).
                  Escalation recommended.
                </p>
              </div>
            </div>
          )}

          {/* Images */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4">Detection Results</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Original Image", key: "original_image" },
                { label: "Detected Image", key: "detected_image" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <p className="text-xs text-slate-400 mb-2 font-medium">{label}</p>
                  <div className="relative group cursor-pointer rounded-xl overflow-hidden border border-slate-600"
                       onClick={() => setZoomedImage(inspectionAPI.imageUrl(result[key]))}>
                    <img src={inspectionAPI.imageUrl(result[key])} alt={label}
                      className="w-full h-44 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                    transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details + Quality Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 card">
              <h3 className="font-semibold text-white mb-4">Analysis Details</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Defect Type",  value: <DefectBadge defect={result.defect} /> },
                  { label: "Confidence",   value: result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : "N/A" },
                  { label: "Severity",     value: <SeverityBadge severity={result.severity} /> },
                  { label: "Status",       value: <StatusBadge status={result.status} /> },
                  { label: "Detection Time", value: result.detection_time_ms ? (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Timer className="w-3.5 h-3.5 text-slate-400" />
                      {result.detection_time_ms} ms
                    </span>) : "N/A" },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-slate-700/40 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <div className="text-white text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-slate-700/40 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Recommendation</p>
                <p className="text-white font-medium">{result.recommendation || "No Action Required"}</p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <QualityScoreMeter score={result.quality_score} label={result.quality_label} size="lg" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleReset} className="btn-secondary flex-1">
              <RefreshCw className="w-4 h-4" /> New Inspection
            </button>
          </div>

          {/* AI Recommendation Panel */}
          {result?.id && (
            <RecommendationPanel
              inspectionId={result.id}
              defect={result.defect}
              autoLoad={result.defect && result.defect !== "none"}
            />
          )}
        </div>
      )}

      {/* Zoom modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="zoomed" className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-4 right-4 p-2 bg-slate-800 rounded-lg text-white"
            onClick={() => setZoomedImage(null)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

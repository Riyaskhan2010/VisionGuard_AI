import axios from "axios";

// In production (Render), use the backend URL from env variable
// In development, use Vite proxy (/api → localhost:5000)
const BASE_URL = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : "/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vg_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("vg_token");
      localStorage.removeItem("vg_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password, role) => api.post("/auth/login", { email, password, role }),
  me: () => api.get("/auth/me"),
  products: () => api.get("/auth/products"),
  createProduct: (data) => api.post("/auth/products", data),
  users: () => api.get("/auth/users"),
};

// ── Inspection ────────────────────────────────────────────────────────────────
export const inspectionAPI = {
  upload: (formData) =>
    api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    }),
  detect: (filename, productId) =>
    api.post("/detect", { filename, product_id: productId }),
  history: (params = {}) => api.get("/history", { params }),
  getOne: (id) => api.get(`/inspection/${id}`),
  workerSummary: () => api.get("/worker/summary"),
  imageUrl: (filename) => `${BASE_URL}/uploads/${filename}`,
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  dashboard: () => api.get("/admin/dashboard"),
  analytics: (days = 14) => api.get("/admin/analytics", { params: { days } }),
  inspections: (params = {}) => api.get("/admin/inspections", { params }),
  approve: (id, adminDecision) =>
    api.post(`/admin/approve/${id}`, { admin_decision: adminDecision }),
  reject: (id, rejectReason) =>
    api.post(`/admin/reject/${id}`, { reject_reason: rejectReason }),
  alerts: () => api.get("/admin/alerts"),
  markAlertsRead: () => api.post("/admin/alerts/mark-read"),
  timeline: (productId) => api.get(`/admin/timeline/${productId}`),
  rejectReasons: () => api.get("/admin/reject-reasons"),
  // Workers
  workers: () => api.get("/admin/workers"),
  createWorker: (data) => api.post("/admin/workers", data),
  updateWorker: (id, data) => api.put(`/admin/workers/${id}`, data),
  deactivateWorker: (id) => api.delete(`/admin/workers/${id}`),
  workerPerformance: () => api.get("/admin/worker-performance"),
  // Recommendations
  recommendations: () => api.get("/admin/recommendations"),
  updateRecommendation: (id, data) => api.put(`/admin/recommendations/${id}`, data),
  // Pattern alerts
  patternAlerts: () => api.get("/admin/pattern-alerts"),
  resolvePattern: (id) => api.post(`/admin/pattern-alerts/${id}/resolve`),
  // AI accuracy
  aiAccuracy: () => api.get("/admin/ai-accuracy"),
  // Report
  reportUrl: (id) => `${BASE_URL}/admin/report/${id}`,
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationAPI = {
  list: (params = {}) => api.get("/notifications/", { params }),
  unreadCount: () => api.get("/notifications/unread-count"),
  markAllRead: () => api.post("/notifications/mark-read"),
  markOneRead: (id) => api.post(`/notifications/${id}/read`),
};

// ── Enterprise ────────────────────────────────────────────────────────────────
export const enterpriseAPI = {
  recommendation: (inspectionId) => api.get(`/enterprise/recommendation/${inspectionId}`),
  factoryZones: () => api.get("/enterprise/factory-zones"),
  zoneDetail: (id) => api.get(`/enterprise/factory-zones/${id}/detail`),
  traceability: (productId) => api.get(`/enterprise/traceability/${productId}`),
  factoryHealth: () => api.get("/enterprise/factory-health"),
  predictive: () => api.get("/enterprise/predictive"),
  assistant: (query) => api.post("/enterprise/assistant", { query }),
  reportSummary: (period) => api.get("/enterprise/reports/summary", { params: { period } }),
  exportCsvUrl: (period) => `${BASE_URL}/enterprise/reports/export-csv?period=${period}`,
  search: (q) => api.get("/enterprise/search", { params: { q } }),
};

// ── Analysis ──────────────────────────────────────────────────────────────────
export const analysisAPI = {
  explain:            (id)       => api.get(`/analysis/explain/${id}`),
  defectMemory:       (id)       => api.get(`/analysis/defect-memory/${id}`),
  machineHealth:      ()         => api.get("/analysis/machine-health"),
  workerPerformance:  (workerId) => api.get(`/analysis/worker-performance/${workerId}`),
};

export default api;

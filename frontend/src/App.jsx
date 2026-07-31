import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Auth
import LoginPage from "./pages/LoginPage";

// Worker pages
import WorkerDashboard from "./pages/worker/WorkerDashboard";
import InspectPage from "./pages/worker/InspectPage";
import WorkerHistory from "./pages/worker/WorkerHistory";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminInspections from "./pages/admin/AdminInspections";
import AdminWorkers from "./pages/admin/AdminWorkers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminAlerts from "./pages/admin/AdminAlerts";
import FactoryOverview from "./pages/admin/FactoryOverview";
import Traceability from "./pages/admin/Traceability";
import ReportCenter from "./pages/admin/ReportCenter";

function RootRedirect() {
  const token = localStorage.getItem("vg_token");
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("vg_user") || "null"); }
    catch { return null; }
  })();
  if (token && user) {
    return <Navigate to={user.role === "Admin" ? "/admin/dashboard" : "/worker/dashboard"} replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Worker */}
          <Route element={<ProtectedRoute requiredRole="Worker"><Layout /></ProtectedRoute>}>
            <Route path="/worker/dashboard" element={<WorkerDashboard />} />
            <Route path="/worker/inspect"   element={<InspectPage />} />
            <Route path="/worker/history"   element={<WorkerHistory />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute requiredRole="Admin"><Layout /></ProtectedRoute>}>
            <Route path="/admin/dashboard"   element={<AdminDashboard />} />
            <Route path="/admin/inspections" element={<AdminInspections />} />
            <Route path="/admin/workers"     element={<AdminWorkers />} />
            <Route path="/admin/analytics"   element={<AdminAnalytics />} />
            <Route path="/admin/alerts"      element={<AdminAlerts />} />
            <Route path="/admin/factory"     element={<FactoryOverview />} />
            <Route path="/admin/traceability" element={<Traceability />} />
            <Route path="/admin/reports"     element={<ReportCenter />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

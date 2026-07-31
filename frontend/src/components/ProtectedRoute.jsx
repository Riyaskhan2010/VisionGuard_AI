import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "./LoadingSpinner";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader text="Authenticating…" />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    const fallback = user.role === "Admin" ? "/admin/dashboard" : "/worker/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children;
}

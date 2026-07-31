import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import AIAssistant from "./AIAssistant";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../services/api";

export default function Layout() {
  const { isAdmin } = useAuth();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchAlerts = async () => {
      try {
        const res = await adminAPI.alerts();
        const unread = res.data.data?.filter((a) => !a.is_read).length || 0;
        setAlertCount(unread);
      } catch { /* silent */ }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar alertCount={alertCount} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <AIAssistant />
    </div>
  );
}

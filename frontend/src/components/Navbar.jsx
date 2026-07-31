import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";
import {
  Shield, LayoutDashboard, Upload, History, BarChart3,
  Bell, LogOut, Menu, X, Users, Factory, QrCode, FileText,
} from "lucide-react";

const adminLinks = [
  { to: "/admin/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { to: "/admin/inspections",  label: "Inspections",  icon: History },
  { to: "/admin/factory",      label: "Factory",      icon: Factory },
  { to: "/admin/traceability", label: "Traceability", icon: QrCode },
  { to: "/admin/workers",      label: "Workers",      icon: Users },
  { to: "/admin/analytics",    label: "Analytics",    icon: BarChart3 },
  { to: "/admin/reports",      label: "Reports",      icon: FileText },
  { to: "/admin/alerts",       label: "Alerts",       icon: Bell },
];

const workerLinks = [
  { to: "/worker/dashboard",   label: "Dashboard",    icon: LayoutDashboard },
  { to: "/worker/inspect",     label: "New Inspection", icon: Upload },
  { to: "/worker/history",     label: "History",      icon: History },
];

export default function Navbar({ alertCount = 0 }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = isAdmin ? adminLinks : workerLinks;
  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center
                            group-hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/30">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-white text-sm">VisionGuard</span>
              <span className="text-blue-400 font-bold text-sm"> AI</span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                            transition-colors duration-150
                            ${isActive(to)
                              ? "bg-blue-600/20 text-blue-400"
                              : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {label === "Alerts" && alertCount > 0 && (
                  <span className="ml-0.5 bg-red-500 text-white text-[10px] font-bold
                                   rounded-full w-4 h-4 flex items-center justify-center">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            <GlobalSearch />
            {/* Notification bell — workers only (admins use the Alerts page) */}
            {!isAdmin && <NotificationBell />}

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                              flex items-center justify-center text-xs font-bold text-white">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-sm text-slate-300 max-w-[100px] truncate">{user?.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                              ${isAdmin
                                ? "bg-purple-900/50 text-purple-400"
                                : "bg-blue-900/50 text-blue-400"}`}>
                {user?.role}
              </span>
            </div>

            <button onClick={handleLogout} className="btn-secondary !px-3 !py-2 text-sm">
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:block">Logout</span>
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-700 bg-slate-900 px-4 py-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
                          ${isActive(to)
                            ? "bg-blue-600/20 text-blue-400"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <div className="border-t border-slate-700 pt-2 mt-2 flex items-center justify-between">
            {!isAdmin && <NotificationBell />}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

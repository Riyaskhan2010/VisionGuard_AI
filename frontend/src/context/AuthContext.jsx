import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("vg_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem("vg_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI
      .me()
      .then((res) => {
        const u = res.data.data;
        setUser(u);
        localStorage.setItem("vg_user", JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem("vg_token");
        localStorage.removeItem("vg_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password, role) => {
    const res = await authAPI.login(email, password, role);
    const { token, user: u } = res.data.data;
    localStorage.setItem("vg_token", token);
    localStorage.setItem("vg_user", JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("vg_token");
    localStorage.removeItem("vg_user");
    setUser(null);
  }, []);

  const isAdmin = user?.role === "Admin";
  const isWorker = user?.role === "Worker";

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isWorker }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

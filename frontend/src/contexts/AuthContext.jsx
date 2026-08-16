import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = anon
  const [notifCount, setNotifCount] = useState(0);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("dl_token");
    if (!token) { setUser(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem("dl_token");
      setUser(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const refreshNotif = useCallback(async () => {
    if (!localStorage.getItem("dl_token")) return;
    try {
      const { data } = await api.get("/notifications");
      setNotifCount(data.unread);
    } catch {}
  }, []);

  useEffect(() => {
    if (user && user.id) {
      refreshNotif();
      const iv = setInterval(refreshNotif, 15000);
      return () => clearInterval(iv);
    }
  }, [user, refreshNotif]);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("dl_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("dl_token");
    setUser(false);
    setNotifCount(0);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, fetchMe, notifCount, refreshNotif, setNotifCount }}>
      {children}
    </AuthContext.Provider>
  );
}

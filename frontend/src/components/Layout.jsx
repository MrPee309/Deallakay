import React from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import BetaAnnouncementBar from "./BetaAnnouncementBar";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function Layout({ hideFooter }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <BetaAnnouncementBar />
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

export function FullLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export function ProtectedRoute({ children, adminOnly }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === null) return <FullLoader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

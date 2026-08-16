import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";

export default function MobileNav() {
  const { t } = useApp();
  const { user } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const active = (p) => loc.pathname === p;

  const items = [
    { to: "/", icon: Home, label: t("home") },
    { to: "/browse", icon: Search, label: t("search") },
    { to: "/messages", icon: MessageCircle, label: t("messages") },
    { to: user && user.id ? "/profile" : "/login", icon: User, label: t("profile") },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border pb-safe" data-testid="mobile-nav">
      <div className="grid grid-cols-5 items-end h-16 px-1 relative">
        <NavItem {...items[0]} active={active(items[0].to)} />
        <NavItem {...items[1]} active={active(items[1].to)} />
        <button onClick={() => nav("/sell")} data-testid="mobile-sell-btn" className="flex flex-col items-center justify-end pb-2">
          <span className="w-12 h-12 -mt-6 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform border-4 border-background">
            <Plus className="w-6 h-6" />
          </span>
          <span className="text-[10px] font-semibold mt-0.5">{t("sell")}</span>
        </button>
        <NavItem {...items[2]} active={active(items[2].to)} />
        <NavItem {...items[3]} active={active(items[3].to)} />
      </div>
    </nav>
  );
}

function NavItem({ to, icon: Icon, label, active }) {
  return (
    <Link to={to} className={`flex flex-col items-center justify-end pb-2 gap-0.5 ${active ? "text-primary" : "text-muted-foreground"}`}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

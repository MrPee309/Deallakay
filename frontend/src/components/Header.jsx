import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MessageCircle, Bell, Menu, Plus, ChevronDown, LogOut, LayoutDashboard, Heart, User, Shield } from "lucide-react";
import * as Icons from "lucide-react";
import Logo from "./Logo";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCatName } from "@/i18n";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";

export default function Header() {
  const { t, categories, lang, changeLang } = useApp();
  const { user, logout, notifCount } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const submitSearch = (e) => {
    e.preventDefault();
    nav(`/browse?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-4 h-16">
          <Logo />

          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-testid="header-search-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full h-10 pl-10 pr-4 rounded-full border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </form>

          <div className="flex items-center gap-1.5 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="lang-switch" className="text-xs font-semibold px-2 py-1 rounded-md hover:bg-muted uppercase">{lang}</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => changeLang("ht")}>Kreyòl</DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLang("fr")}>Français</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/sell" className="hidden sm:block">
              <Button data-testid="header-sell-btn" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full h-9 px-4 active:scale-95 transition-transform">
                <Plus className="w-4 h-4 mr-1" /> {t("sell")}
              </Button>
            </Link>

            {user && user.id ? (
              <>
                <Link to="/messages" data-testid="header-messages-btn" className="relative p-2 rounded-full hover:bg-muted">
                  <MessageCircle className="w-5 h-5" />
                </Link>
                <Link to="/notifications" data-testid="header-notif-btn" className="relative p-2 rounded-full hover:bg-muted">
                  <Bell className="w-5 h-5" />
                  {notifCount > 0 && <span className="absolute top-1 right-1 bg-destructive text-white text-[9px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{notifCount}</span>}
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button data-testid="user-menu-trigger" className="flex items-center gap-1 p-1 rounded-full hover:bg-muted">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                        {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.username?.[0]?.toUpperCase()}
                      </div>
                      <ChevronDown className="w-3 h-3 hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm font-semibold">@{user.username}</div>
                    <DropdownMenuSeparator />
                    {user.is_seller && (
                      <DropdownMenuItem onClick={() => nav("/dashboard")} data-testid="menu-dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />{t("dashboard")}</DropdownMenuItem>
                    )}
                    {user.is_technician && (
                      <DropdownMenuItem onClick={() => nav("/technician-dashboard")} data-testid="menu-tech-dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Tablo Teknisyen</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => nav("/favorites")} data-testid="menu-favorites"><Heart className="w-4 h-4 mr-2" />{t("favorites")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav("/alerts")} data-testid="menu-alerts"><Bell className="w-4 h-4 mr-2" />Alèt Mwen</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav("/profile")} data-testid="menu-profile"><User className="w-4 h-4 mr-2" />{t("myAccount")}</DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem onClick={() => nav("/admin")} data-testid="menu-admin"><Shield className="w-4 h-4 mr-2" />{t("admin")}</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} data-testid="menu-logout"><LogOut className="w-4 h-4 mr-2" />{t("logout")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden md:block"><Button variant="ghost" className="h-9 rounded-full" data-testid="header-login-btn">{t("login")}</Button></Link>
                <Link to="/register" className="hidden sm:block"><Button className="h-9 rounded-full bg-primary" data-testid="header-register-btn">{t("register")}</Button></Link>
              </>
            )}

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button data-testid="mobile-menu-trigger" className="md:hidden w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center shrink-0">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 overflow-y-auto flex flex-col">
                <div className="flex flex-col gap-1 mt-8">
                  <Link to="/browse" onClick={() => setMenuOpen(false)} data-testid="mobile-nav-all" className="text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-muted flex items-center gap-2">
                    <Menu className="w-4 h-4" /> {t("all")}
                  </Link>
                  {categories.map((c) => {
                    const Ico = Icons[c.icon?.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase())] || Icons.Tag;
                    return (
                      <Link key={c.id} to={`/browse?category=${c.type}`} onClick={() => setMenuOpen(false)} data-testid={`mobile-nav-cat-${c.type}`} className="text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-muted flex items-center gap-2 text-muted-foreground">
                        <Ico className="w-4 h-4" /> {getCatName(c, lang)}
                      </Link>
                    );
                  })}
                  <Link to="/technicians" onClick={() => setMenuOpen(false)} data-testid="mobile-nav-technicians" className="text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-muted flex items-center gap-2 text-muted-foreground">
                    <Icons.Wrench className="w-4 h-4" /> Teknisyen
                  </Link>
                  <Link to="/requests" onClick={() => setMenuOpen(false)} data-testid="mobile-nav-requests" className="text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-muted flex items-center gap-2 text-muted-foreground">
                    <Icons.MessageSquareText className="w-4 h-4" /> Demann
                  </Link>
                </div>
                {!(user && user.id) && (
                  <div className="mt-auto pt-4 border-t border-border flex flex-col gap-2">
                    <Link to="/login" onClick={() => setMenuOpen(false)}><Button variant="outline" className="w-full h-11" data-testid="mobile-login-btn">{t("login")}</Button></Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)}><Button className="w-full h-11 bg-primary" data-testid="mobile-register-btn">{t("register")}</Button></Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Category strip */}
        <div className="hidden md:flex items-center gap-1 h-11 -mt-px overflow-x-auto no-scrollbar">
          <Link to="/browse" className="text-sm font-medium px-3 py-1.5 rounded-full hover:bg-muted whitespace-nowrap flex items-center gap-1.5">
            <Menu className="w-4 h-4" /> {t("all")}
          </Link>
          {categories.map((c) => {
            const Ico = Icons[c.icon?.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase())] || Icons.Tag;
            return (
              <Link key={c.id} to={`/browse?category=${c.type}`} data-testid={`nav-cat-${c.type}`} className="text-sm font-medium px-3 py-1.5 rounded-full hover:bg-muted whitespace-nowrap flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Ico className="w-4 h-4" /> {getCatName(c, lang)}
              </Link>
            );
          })}
          <Link to="/technicians" data-testid="nav-technicians" className="text-sm font-medium px-3 py-1.5 rounded-full hover:bg-muted whitespace-nowrap flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Icons.Wrench className="w-4 h-4" /> Teknisyen
          </Link>
          <Link to="/requests" data-testid="nav-requests" className="text-sm font-medium px-3 py-1.5 rounded-full hover:bg-muted whitespace-nowrap flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Icons.MessageSquareText className="w-4 h-4" /> Demann
          </Link>
        </div>
      </div>
    </header>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useApp } from "@/contexts/AppContext";
import { getCatName } from "@/i18n";

export default function Footer() {
  const { categories, lang, branding } = useApp();
  return (
    <footer className="border-t border-border bg-white mt-16 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="text-sm text-muted-foreground mt-3 max-w-xs">{branding.siteTagline}</p>
          <p className="text-xs text-muted-foreground mt-3">Marketplace teknoloji #1 ann Ayiti.</p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">Kategori</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {categories.map((c) => (
              <li key={c.id}><Link to={`/browse?category=${c.type}`} className="hover:text-primary">{getCatName(c, lang)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">DealLakay</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/how-it-works" className="hover:text-primary">Kijan li mache</Link></li>
            <li><Link to="/safety" className="hover:text-primary">Sekirite</Link></li>
            <li><Link to="/sell" className="hover:text-primary">Vann yon pwodwi</Link></li>
            <li><Link to="/register" className="hover:text-primary">Enskri</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">Kontak</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Port-au-Prince, Ayiti</li>
            <li>support@deallakay.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {branding.siteName}. {branding.siteTagline}
      </div>
    </footer>
  );
}

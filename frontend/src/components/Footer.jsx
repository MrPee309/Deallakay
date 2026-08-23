import React from "react";
import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";
import Logo from "./Logo";
import { useApp } from "@/contexts/AppContext";
import { getCatName } from "@/i18n";

// TODO: this URL is tied to one specific EAS build — replace it whenever a
// new Android build is produced (`eas build --platform android`), since
// each build gets its own build page. Linking to the build PAGE (not the raw
// "artifacts" URL) — that direct link intermittently serves a .json
// metadata file instead of the .apk depending on how the browser requests
// it; the build page's own "Download" button is reliable.
const ANDROID_APK_URL = "https://expo.dev/accounts/pittcode/projects/frontend/builds/d11adaa2-776f-4e6c-880b-f4b53f8bf4e6";

export default function Footer() {
  const { categories, lang, branding } = useApp();
  return (
    <footer className="border-t border-border bg-white mt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-8">
        <a
          href={ANDROID_APK_URL}
          data-testid="footer-apk-download"
          className="flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl p-5"
        >
          <Smartphone className="w-8 h-8 shrink-0" />
          <div className="flex-1">
            <p className="font-display font-semibold">Aplikasyon Mobil DealLakay Alert (Android)</p>
            <p className="text-sm opacity-90">Tape la a, epi tape bouton "Download" ki parèt la — pou moun k ap ede nou teste.</p>
          </div>
        </a>
      </div>
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

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { Search, ArrowRight, ShieldCheck, MessageSquare, Tag, CheckCircle2, UserPlus, Store, Package, HandshakeIcon } from "lucide-react";
import api from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { getCatName } from "@/i18n";
import ProductCard from "@/components/ProductCard";
import HeroSlider from "@/components/HeroSlider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { t, categories, lang, safetyMessages } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [data, setData] = useState({ recent: [], phones: [], laptops: [], parts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [recent, phones, laptops, parts] = await Promise.all([
          api.get("/products?sort=newest&limit=10"),
          api.get("/products?category=phone&limit=5"),
          api.get("/products?category=laptop&limit=5"),
          api.get("/products?category=parts&limit=5"),
        ]);
        setData({
          recent: recent.data.products,
          phones: phones.data.products,
          laptops: laptops.data.products,
          parts: parts.data.products,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submit = (e) => { e.preventDefault(); nav(`/browse?q=${encodeURIComponent(q)}`); };

  return (
    <div>
      {/* Hero */}
      <section className="relative hero-grid border-b border-border overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8 items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-5">
                <Tag className="w-3.5 h-3.5" /> Marketplace teknoloji ann Ayiti
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-800 tracking-tight leading-[1.05]" style={{ fontWeight: 800 }}>
                Jwenn sa w bezwen.<br /><span className="text-primary">Vann sa w pa bezwen.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mt-5 max-w-xl">{t("heroSubtitle")}</p>

              <form onSubmit={submit} className="mt-8 flex flex-col sm:flex-row gap-2 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    data-testid="hero-search-input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="w-full h-14 pl-12 pr-4 rounded-xl border border-border bg-white shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <Button data-testid="hero-search-btn" type="submit" className="h-14 px-8 rounded-xl bg-primary text-base font-semibold active:scale-95 transition-transform">
                  {t("search")}
                </Button>
                <Button data-testid="hero-sell-btn" type="button" onClick={() => nav("/sell")} className="h-14 px-6 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold active:scale-95 transition-transform">
                  {t("sellProduct")}
                </Button>
              </form>
            </div>

            <HeroSlider />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Categories */}
        <section className="py-10">
          <h2 className="font-display text-2xl font-bold mb-5">{t("browseCategories")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categories.map((c) => {
              const pn = c.icon?.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());
              const Ico = Icons[pn] || Icons.Tag;
              return (
                <Link key={c.id} to={`/browse?category=${c.type}`} data-testid={`home-cat-${c.type}`}
                  className="group bg-card border border-border rounded-xl p-5 flex flex-col items-start gap-3 hover:-translate-y-1 hover:shadow-md hover:border-primary/40 transition-all">
                  <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Ico className="w-5 h-5" />
                  </span>
                  <span className="font-semibold text-sm">{getCatName(c, lang)}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <ProductSection title={t("recentlyAdded")} products={data.recent} loading={loading} link="/browse" />
        <ProductSection title={t("phonesNearYou")} products={data.phones} loading={loading} link="/browse?category=phone" />
        <ProductSection title={t("laptopsNearYou")} products={data.laptops} loading={loading} link="/browse?category=laptop" />
        <ProductSection title={t("partsAccessories")} products={data.parts} loading={loading} link="/browse?category=parts" />

        {/* How it works */}
        <section className="py-12">
          <h2 className="font-display text-2xl font-bold mb-6">{t("howItWorks")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: UserPlus, t: "Kreye kont", d: "Enskri gratis nan kèk segond." },
              { icon: Store, t: "Devni vandè", d: "Aksepte règ yo epi aktive kont vandè w." },
              { icon: Package, t: "Mete pwodwi w", d: "Ajoute foto, pri ak detay." },
              { icon: MessageSquare, t: "Kominike & Vann", d: "Achtè kontakte w, ou fè bon deal la." },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 relative">
                <span className="absolute top-4 right-4 font-display text-3xl font-800 text-muted/40" style={{ fontWeight: 800 }}>{i + 1}</span>
                <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3"><s.icon className="w-5 h-5" /></span>
                <h3 className="font-semibold">{s.t}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Safety tips */}
        <section className="pb-12">
          <div className="bg-primary rounded-2xl p-6 md:p-8 text-white">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-6 h-6" />
              <h2 className="font-display text-xl font-bold">{t("safetyTips")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
              {safetyMessages.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-white/90">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-secondary" /> {m}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProductSection({ title, products, loading, link }) {
  if (!loading && (!products || products.length === 0)) return null;
  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <Link to={link} className="text-sm font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
          Wè Tout <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)
          : products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
      </div>
    </section>
  );
}

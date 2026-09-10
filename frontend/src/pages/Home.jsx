import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { Search, ArrowRight, ShieldCheck, MessageSquare, Tag, CheckCircle2, UserPlus, Store, Package, HandshakeIcon } from "lucide-react";
import api from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { getCatName } from "@/i18n";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Real product photos (cropped from the DealLakay reference design) for the
// categories that have a matching real backend category type — "tools" has
// no good photo match in the reference, so it keeps its lucide icon instead
// of forcing a mismatched image onto it.
const CATEGORY_PHOTOS = {
  phone: "/images/home/cat-phone.jpg",
  laptop: "/images/home/cat-laptop.jpg",
  parts: "/images/home/cat-parts.jpg",
  accessories: "/images/home/cat-accessories.jpg",
};

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
        {/* Image is a sibling of the padded text container, absolutely
            positioned against the SECTION itself — so it spans the full
            height of the blue hero area edge-to-edge (top and bottom),
            unaffected by the text column's own vertical padding. */}
        <div className="hidden xl:block absolute inset-y-0 right-0 w-[78%]">
          {/* SVG wave-shaped mask: fades the image smoothly into the hero's
              light-blue background along a curved boundary (not a straight
              line, not a vignette on all sides) — the woman and phone stay
              fully visible; only the sky/mountain area on the left blends
              away. The gradient's fully-transparent zone extends past
              where the curve itself wobbles, so no hard edge is ever
              visible along the curve. */}
          <svg width="0" height="0" aria-hidden="true">
            <defs>
              <mask id="heroWaveMask" maskContentUnits="objectBoundingBox">
                <linearGradient id="heroWaveGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="black" />
                  <stop offset="24%" stopColor="black" />
                  <stop offset="42%" stopColor="white" />
                </linearGradient>
                <path
                  d="M -0.1,-0.1 C 0.1,0.08 0.05,0.22 0.14,0.35 C 0.22,0.48 0.09,0.62 0.16,0.78 C 0.21,0.88 0.14,0.98 0.18,1.1 L 1.1,1.1 L 1.1,-0.1 Z"
                  fill="url(#heroWaveGrad)"
                />
              </mask>
            </defs>
          </svg>
          <img
            src="/images/home/hero-visual.jpg"
            alt="Jwenn sèvis ak pwodwi toupre w ann Ayiti"
            data-testid="home-hero-visual"
            className="absolute inset-0 w-full h-full object-cover object-right"
            style={{ WebkitMaskImage: "url(#heroWaveMask)", maskImage: "url(#heroWaveMask)" }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14 md:py-20 relative">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-8 items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary px-3 py-1 rounded-full mb-5">
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

            {/* Empty spacer column on large screens — reserves the grid slot
                so the text column stays the same width as before; the real
                image renders full-height above, outside this padded flow.
                On mobile/tablet (no room for a side-by-side image), fall
                back to a normal inline image instead of hiding it. */}
            <div className="relative xl:hidden w-full min-h-[280px]">
              <img
                src="/images/home/hero-visual.jpg"
                alt="Jwenn sèvis ak pwodwi toupre w ann Ayiti"
                className="absolute inset-0 w-full h-full object-cover object-right rounded-2xl"
              />
            </div>
            <div className="hidden xl:block" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <section className="py-10">
          <h2 className="font-display text-2xl font-bold mb-5">{t("browseCategories")}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {categories.map((c) => {
              const pn = c.icon?.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());
              const Ico = Icons[pn] || Icons.Tag;
              const photo = CATEGORY_PHOTOS[c.type];
              return (
                <Link key={c.id} to={`/browse?category=${c.type}`} data-testid={`home-cat-${c.type}`}
                  className="group bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-3 aspect-square text-center hover:-translate-y-1 hover:shadow-md hover:border-primary/40 transition-all">
                  {photo ? (
                    <img src={photo} alt={getCatName(c, lang)} className="w-full h-16 sm:h-20 object-contain" />
                  ) : (
                    <span className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <Ico className="w-7 h-7" />
                    </span>
                  )}
                  <span className="font-semibold text-xs sm:text-sm leading-tight">{getCatName(c, lang)}</span>
                </Link>
              );
            })}
            <Link to="/browse" data-testid="home-cat-more"
              className="group bg-primary/5 border border-dashed border-primary/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 aspect-square text-center hover:bg-primary/10 transition-all">
              <span className="w-14 h-14 rounded-xl bg-primary text-white flex items-center justify-center">
                <Icons.Plus className="w-7 h-7" />
              </span>
              <span className="font-semibold text-xs sm:text-sm">Plis</span>
            </Link>
          </div>
        </section>

        {/* Biznis Lokal + Location discovery */}
        <section className="pb-10 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-gradient-to-br from-primary to-blue-800 rounded-2xl overflow-hidden relative text-white">
            <div className="relative z-10 p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div>
                <h2 className="font-display text-2xl font-bold leading-tight">
                  Biznis lokal tou sou <span className="text-secondary">DealLakay</span>!
                </h2>
                <p className="text-sm text-white/85 mt-3">
                  Restoran, otèl, studio, salon bòte, sant sèvis, ak tout lòt biznis nan vil ou yo. Kreye pwofil ou, atire kliyan, epi fè biznis ou grandi.
                </p>
                <a
                  href="mailto:support@deallakay.com?subject=Enterese%20nan%20Biznis%20Lokal%20DealLakay"
                  data-testid="home-biznis-lokal-cta"
                  className="inline-flex items-center gap-2 mt-5 bg-secondary text-secondary-foreground font-semibold text-sm px-5 py-2.5 rounded-full hover:brightness-95 transition"
                >
                  Enskri Biznis Ou <ArrowRight className="w-4 h-4" />
                </a>
                <div className="flex flex-wrap gap-4 mt-6">
                  {[
                    { icon: Icons.Building2, label: "Otèl" },
                    { icon: Icons.UtensilsCrossed, label: "Restoran" },
                    { icon: Icons.Camera, label: "Studio" },
                    { icon: Icons.Scissors, label: "Salon Bòte" },
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"><s.icon className="w-4 h-4" /></span>
                      <span className="text-xs text-white/80">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden sm:block relative">
                <img src="/images/home/biznis-lokal.jpg" alt="Biznis lokal ann Ayiti" className="w-full h-48 object-cover rounded-xl" />
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ background: "radial-gradient(ellipse 55% 55% at center, transparent 40%, #1E3A8A 95%)" }}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-blue-50 rounded-2xl p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
            <div>
              <h2 className="font-display text-xl font-bold text-primary leading-tight">Jwenn sa w bezwen nan vil ou!</h2>
              <p className="text-sm text-muted-foreground mt-3">Chwazi zòn ou pou wè tout sèvis ak biznis ki disponib toupre w.</p>
              <div className="space-y-1.5 mt-4">
                {["Restoran", "Otèl", "Studio", "Mekanik", "Ak plis ankò..."].map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {c}
                  </div>
                ))}
              </div>
              <Link
                to="/browse"
                data-testid="home-location-discovery-cta"
                className="inline-flex items-center gap-2 mt-5 border border-primary text-primary font-semibold text-sm px-4 py-2 rounded-full hover:bg-primary hover:text-white transition"
              >
                <Tag className="w-4 h-4" /> Gade Tout
              </Link>
            </div>
            <div className="hidden sm:block relative">
              <img src="/images/home/location-discovery.jpg" alt="Jwenn sèvis nan vil ou" className="w-full rounded-xl" />
              <div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 60% at center, transparent 45%, #EFF6FF 95%)" }}
              />
            </div>
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

        {/* Trust strip */}
        <section className="py-8 border-t border-border flex flex-wrap items-center justify-between gap-4">
          {[
            { icon: ShieldCheck, title: "Sekirite & Konfyans", sub: "Kont verifye, evalyasyon itilizatè." },
            { icon: Icons.Truck, title: "Livrezon nan tout Ayiti", sub: "Lokal ak entènasyonal." },
            { icon: Icons.Smartphone, title: "Aksè fasil sou App la", sub: "Android & iOS." },
            { icon: Icons.Headphones, title: "Sipò 24/7", sub: "Nou la pou ou." },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 flex-1 min-w-[180px]" data-testid={`home-trust-${i}`}>
              <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.sub}</p>
              </div>
            </div>
          ))}
          <p className="slogan-script -rotate-12 inline-block text-2xl text-foreground flex-1 min-w-[220px] text-right" data-testid="home-community-slogan">
            DealLakay, plis pase yon sit, se yon kominote! <span aria-hidden="true">💙</span>
          </p>
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

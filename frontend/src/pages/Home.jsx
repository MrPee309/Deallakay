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
      {/* min-h grows at larger breakpoints — FIXED: without this, section
          height was driven purely by the (roughly fixed-height) text
          column, so on very wide monitors (2560px, 3840px...) the image
          container's width kept growing while its height stayed the same,
          producing an extreme letterbox crop that cut off the woman's
          head. Taller min-heights at xl/2xl give the image proportionally
          more vertical room to work with on those screens. */}
      <section className="relative hero-grid border-b border-border overflow-hidden xl:min-h-[600px] 2xl:min-h-[720px]">
        <div className="max-w-7xl 2xl:max-w-[2100px] [@media(min-width:2560px)]:max-w-[2800px] mx-auto px-4 lg:px-6 py-14 md:py-20 relative h-full">
          {/* FIXED: the image div used to be a sibling of this max-w-7xl
              container, positioned absolute right-0 against the full-width
              <section> itself. On screens wider than ~1280px+padding, this
              container centers with growing side margins while the image
              stayed glued to the true viewport edge — the two drifted out
              of alignment the wider the screen got. Moving the image
              inside this same constrained, centered container keeps both
              anchored to the same right edge at every width. */}
          <div className="hidden md:block absolute inset-y-0 right-0 w-[78%]">
            <img
              src="/images/home/hero-visual-wide.jpg"
              alt="Jwenn sèvis ak pwodwi toupre w ann Ayiti"
              data-testid="home-hero-visual-wide"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div
              className="absolute inset-y-0 left-0 w-1/5 pointer-events-none"
              style={{ background: "linear-gradient(to right, #F3F7FF, transparent)" }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 items-center">
            {/* FIXED: max-w-3xl scales with the grid column's own share of
                an increasingly wide container — at 2400px that column
                could grow enough to push text into the image's territory
                (which occupies a fixed 78% from the right regardless of
                container width). A fixed cap in px means the text block
                never grows past a safe, readable width no matter how wide
                the outer container gets. */}
            {/* FIXED: capped at a flat 520px regardless of breakpoint, but
                the headline's font-size keeps growing up to text-8xl at
                2560px+ — at that size a single word like "bezwen." can be
                wider than 520px itself, so it was overflowing (and now
                getting clipped by the new html/body overflow-x:hidden
                safety net) instead of wrapping cleanly. The container now
                grows at the SAME breakpoints the font-size does. */}
            {/* FIXED: the previous fixed max-w (520→560px) was much too
                narrow once combined with the larger responsive font sizes
                — it wasn't clipping text, it was forcing it to wrap after
                nearly every word, stacking into a tall narrow column that
                LOOKED cut off. Removing the fixed cap and letting the text
                simply fill its own grid column (matching the reference
                mockup, where the headline comfortably fits on one line)
                fixes this properly instead of just tuning the wrong knob
                again. */}
            <div className="w-full">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary px-3 py-1 rounded-full mb-5">
                <Tag className="w-3.5 h-3.5" /> Marketplace teknoloji ann Ayiti
              </span>
              {/* FIXED: text size capped out at lg:text-6xl (≈60px) for
                  EVERYTHING 1024px and up — including a 1920px TV screen
                  or a 4K display, both viewed from much farther away than
                  a desktop monitor, where that size reads as small.
                  Progressive sizing continues past lg so text keeps
                  growing on genuinely large/far-viewed screens instead of
                  plateauing. */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl 2xl:leading-[1.15] [@media(min-width:2560px)]:text-8xl [@media(min-width:2560px)]:leading-[1.15] font-800 tracking-tight leading-[1.15] break-words" style={{ fontWeight: 800 }}>
                Jwenn sa w bezwen.<br /><span className="text-primary">Vann sa w pa bezwen.</span>
              </h1>
              <p className="text-base md:text-lg 2xl:text-xl [@media(min-width:2560px)]:text-2xl text-muted-foreground mt-5 max-w-xl [@media(min-width:2560px)]:max-w-3xl">{t("heroSubtitle")}</p>

              {/* New — was only in the reference mockup, never actually
                  built. Compact icon row summarizing the categories named
                  in the subtitle above, giving the left column more
                  visual weight/fill instead of jumping straight to the
                  search bar. */}
              <div className="flex flex-wrap gap-x-5 gap-y-3 mt-6">
                {[
                  { Icon: Icons.Smartphone, label: "Telefòn" },
                  { Icon: Icons.Laptop, label: "Laptop" },
                  { Icon: Icons.Cog, label: "Pyès" },
                  { Icon: Icons.Headphones, label: "Aksèswa" },
                  { Icon: Icons.Wrench, label: "Teknisyen" },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 w-14">
                    <div className="w-11 h-11 rounded-full bg-white border border-border shadow-sm flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={submit} className="mt-8 flex flex-col sm:flex-row gap-2 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    data-testid="hero-search-input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="w-full h-11 pl-12 pr-4 rounded-xl border border-border bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <Button data-testid="hero-search-btn" type="submit" className="h-11 px-6 rounded-xl bg-primary text-sm font-semibold active:scale-95 transition-transform">
                  {t("search")}
                </Button>
                <Button data-testid="hero-sell-btn" type="button" onClick={() => nav("/sell")} className="h-11 px-5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-sm font-semibold active:scale-95 transition-transform">
                  {t("sellProduct")}
                </Button>
              </form>
            </div>

            {/* Empty spacer column on large screens — reserves the grid slot
                so the text column stays the same width as before; the real
                image renders full-height above, outside this padded flow.
                On mobile/tablet (no room for a side-by-side image), fall
                back to a normal inline image instead of hiding it. */}
            {/* FIXED: a single fixed min-h-[280px] applied uniformly across
                the entire <1024px range produced very different crops on a
                320px phone vs. a 768px tablet portrait (same height, very
                different width-to-height ratio) — an aspect-ratio scales
                proportionally with width instead, giving a consistent crop
                across small phones through tablet portrait. */}
            <div className="relative md:hidden w-full aspect-[4/3] sm:aspect-[16/10]">
              <img
                src="/images/home/hero-visual.jpg"
                alt="Jwenn sèvis ak pwodwi toupre w ann Ayiti"
                className="absolute inset-0 w-full h-full object-cover object-[50%_28%] rounded-2xl"
              />
            </div>
            <div className="hidden md:block" />
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

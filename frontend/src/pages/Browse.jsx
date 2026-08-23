import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { SlidersHorizontal, X, Search, ShieldCheck, MapPin } from "lucide-react";
import api from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCatName } from "@/i18n";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Used", "For Parts / Repair"];

export default function Browse() {
  const { t, categories, locations, lang } = useApp();
  const { user } = useAuth();
  // Suppliers are a B2B directory meant for sellers/technicians sourcing
  // inventory, not general shoppers — kept out of search results for
  // everyone else, logged in or not.
  const canSeeSuppliers = !!(user && (user.is_seller || user.is_technician));
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ products: [], total: 0, pages: 1 });
  const [technicians, setTechnicians] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  // Local text-box state, separate from the URL param — lets the user type
  // freely before submitting, and stays in sync if `q` changes from
  // elsewhere (e.g. the header search, or the browser Back/Forward buttons).
  const [qText, setQText] = useState("");
  const [loading, setLoading] = useState(true);

  const get = (k) => params.get(k) || "";
  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    p.set("page", "1");
    setParams(p);
  };

  const category = get("category");
  const cat = categories.find((c) => c.type === category);
  const dep = locations.find((d) => d.name === get("department"));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      ["q", "category", "subcategory", "department", "city", "condition", "min_price", "max_price", "verified_seller", "sort", "page"].forEach((k) => {
        const v = params.get(k);
        if (v) qs.set(k, v);
      });
      qs.set("limit", "20");
      const { data } = await api.get(`/products?${qs.toString()}`);
      setData(data);

      // Product search only covers marketplace listings — a keyword like
      // "technicien" has no matching product but should still surface
      // relevant technicians, so a free-text search also checks the
      // existing technician directory (GET /technicians?q=...).
      const qVal = params.get("q");
      if (qVal) {
        // A generic category word ("teknisyen", "founisè"...) won't literally
        // appear inside that entity's own name/bio/description text, so a
        // plain substring match against it finds nothing even though matches
        // clearly exist — treat those words as "show the whole directory"
        // instead of a keyword filter.
        const GENERIC_TECHNICIAN_WORDS = ["teknisyen", "technicien", "technician", "teknisyèn"];
        const GENERIC_SUPPLIER_WORDS = ["founisè", "founise", "fournisseur", "supplier"];
        const qLower = qVal.trim().toLowerCase();
        const techQs = GENERIC_TECHNICIAN_WORDS.includes(qLower) ? "" : `q=${encodeURIComponent(qVal)}&`;
        const supQs = GENERIC_SUPPLIER_WORDS.includes(qLower) ? "" : `q=${encodeURIComponent(qVal)}&`;

        // Search is global — everything on the site that could match, not
        // just products. Only the per-request limit exists (pagination),
        // not an artificial cap on WHAT is searched.
        const [techRes, supRes] = await Promise.all([
          api.get(`/technicians?${techQs}limit=24`).catch(() => ({ data: { technicians: [] } })),
          canSeeSuppliers
            ? api.get(`/suppliers?${supQs}limit=24`).catch(() => ({ data: { suppliers: [] } }))
            : Promise.resolve({ data: { suppliers: [] } }),
        ]);
        setTechnicians(techRes.data.technicians || []);
        setSuppliers(supRes.data.suppliers || []);
      } else {
        setTechnicians([]);
        setSuppliers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [params, canSeeSuppliers]);

  useEffect(() => { load(); }, [load]);

  // Keep the on-page search box showing whatever the current URL's `q` is —
  // covers the header search bringing us here, and Back/Forward navigation.
  useEffect(() => { setQText(params.get("q") || ""); }, [params]);

  const submitSearch = (e) => {
    e.preventDefault();
    setParam("q", qText.trim());
  };

  const activeFilters = ["category", "subcategory", "department", "city", "condition", "verified_seller", "min_price", "max_price"].filter((k) => params.get(k));

  const FilterPanel = () => (
    <div className="space-y-5" data-testid="filter-panel">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase">{t("categories")}</label>
        <Select value={category || "all"} onValueChange={(v) => { setParam("category", v === "all" ? "" : v); setParam("subcategory", ""); }}>
          <SelectTrigger className="mt-1.5" data-testid="filter-category"><SelectValue placeholder={t("all")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.type}>{getCatName(c, lang)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {cat && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase">{cat.type === "phone" ? t("brand") : "Sou-kategori"}</label>
          <Select value={get("subcategory") || "all"} onValueChange={(v) => setParam("subcategory", v === "all" ? "" : v)}>
            <SelectTrigger className="mt-1.5" data-testid="filter-subcategory"><SelectValue placeholder={t("all")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {cat.subcategories.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase">{t("department")}</label>
        <Select value={get("department") || "all"} onValueChange={(v) => { setParam("department", v === "all" ? "" : v); setParam("city", ""); }}>
          <SelectTrigger className="mt-1.5" data-testid="filter-department"><SelectValue placeholder={t("all")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {locations.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {dep && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase">{t("city")}</label>
          <Select value={get("city") || "all"} onValueChange={(v) => setParam("city", v === "all" ? "" : v)}>
            <SelectTrigger className="mt-1.5" data-testid="filter-city"><SelectValue placeholder={t("all")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {dep.cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase">{t("condition")}</label>
        <Select value={get("condition") || "all"} onValueChange={(v) => setParam("condition", v === "all" ? "" : v)}>
          <SelectTrigger className="mt-1.5" data-testid="filter-condition"><SelectValue placeholder={t("all")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase">{t("price")} (HTG)</label>
        <div className="flex gap-2 mt-1.5">
          <Input type="number" placeholder="Min" defaultValue={get("min_price")} onBlur={(e) => setParam("min_price", e.target.value)} data-testid="filter-min-price" />
          <Input type="number" placeholder="Max" defaultValue={get("max_price")} onBlur={(e) => setParam("max_price", e.target.value)} data-testid="filter-max-price" />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={get("verified_seller") === "true"} onCheckedChange={(v) => setParam("verified_seller", v ? "true" : "")} data-testid="filter-verified" />
        <span className="text-sm">Vandè Verifye sèlman</span>
      </label>

      {activeFilters.length > 0 && (
        <Button variant="outline" className="w-full" onClick={() => setParams(new URLSearchParams())} data-testid="clear-filters-btn">
          <X className="w-4 h-4 mr-1" /> {t("clearFilters")}
        </Button>
      )}
    </div>
  );

  const page = parseInt(get("page") || "1");

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <form onSubmit={submitSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            data-testid="browse-search-input"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full h-11 pl-10 pr-20 rounded-full border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 rounded-full px-4" data-testid="browse-search-submit">
            {t("search")}
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold">{cat ? getCatName(cat, lang) : t("search")}</h1>
          <p className="text-sm text-muted-foreground">
            {data.total} {t("results")}
            {technicians.length > 0 && ` · ${technicians.length} teknisyen`}
            {suppliers.length > 0 && ` · ${suppliers.length} founisè`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={get("sort") || "newest"} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="w-[150px] h-10" data-testid="sort-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("newest")}</SelectItem>
              <SelectItem value="oldest">{t("oldest")}</SelectItem>
              <SelectItem value="price_low">{t("priceLow")}</SelectItem>
              <SelectItem value="price_high">{t("priceHigh")}</SelectItem>
              <SelectItem value="most_viewed">{t("mostViewed")}</SelectItem>
              <SelectItem value="most_popular">{t("mostPopular")}</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="outline" className="h-10" data-testid="mobile-filter-btn"><SlidersHorizontal className="w-4 h-4 mr-1" />{t("filters")}</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
              <SheetHeader><SheetTitle>{t("filters")}</SheetTitle></SheetHeader>
              <div className="mt-5"><FilterPanel /></div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-32 bg-card border border-border rounded-xl p-5">
            <FilterPanel />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
            </div>
          ) : (
            <>
              {technicians.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Teknisyen ki matche</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {technicians.map((tech) => (
                      <Link key={tech.username} to={`/technician/${tech.username}`} data-testid={`browse-technician-${tech.username}`}
                        className="bg-card border border-border rounded-xl p-4 hover:border-primary hover:shadow-md transition-all flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center text-base font-bold overflow-hidden shrink-0">
                          {tech.avatar ? <img src={tech.avatar} alt="" className="w-full h-full object-cover" /> : tech.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <h3 className="font-semibold truncate text-sm">{tech.full_name}</h3>
                            {tech.technician_verified && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{tech.city}, {tech.department}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {suppliers.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Founisè ki matche</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suppliers.map((s) => (
                      <Link key={s.id} to={`/suppliers/${s.id}`} data-testid={`browse-supplier-${s.id}`}
                        className="bg-card border border-border rounded-xl p-4 hover:border-primary hover:shadow-md transition-all flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center text-base font-bold overflow-hidden shrink-0">
                          {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover" /> : s.company_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate text-sm">{s.company_name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{s.country}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {data.products.length === 0 && technicians.length === 0 && suppliers.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground" data-testid="no-results">{t("noProducts")}</div>
              ) : data.products.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {data.products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                  </div>
                  {data.pages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <Button variant="outline" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))} data-testid="prev-page">‹</Button>
                      <span className="text-sm px-3">{page} / {data.pages}</span>
                      <Button variant="outline" disabled={page >= data.pages} onClick={() => setParam("page", String(page + 1))} data-testid="next-page">›</Button>
                    </div>
                  )}
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

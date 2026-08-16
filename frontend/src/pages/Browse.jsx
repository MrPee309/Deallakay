import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import api from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
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
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ products: [], total: 0, pages: 1 });
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
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

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
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold">{cat ? getCatName(cat, lang) : t("search")}</h1>
          <p className="text-sm text-muted-foreground">{data.total} {t("results")}</p>
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
          ) : data.products.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground" data-testid="no-results">{t("noProducts")}</div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

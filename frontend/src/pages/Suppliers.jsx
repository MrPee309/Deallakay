import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Search, ShieldCheck, MapPin, Star, Building2, ChevronLeft, ChevronRight, Plus, Truck } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUPPLIER_TYPES = [
  "Manufacturer", "Distributor", "Wholesaler", "Parts Supplier", "Electronics Supplier",
  "Mobile Phone Parts Supplier", "Laptop Parts Supplier", "Accessories Supplier",
  "Repair Equipment Supplier", "Tools Supplier", "International Supplier", "Shipping/Logistics Provider",
];

const CATEGORIES = [
  { value: "phone", label: "Telefòn" }, { value: "laptop", label: "Laptop & Òdinatè" },
  { value: "parts", label: "Pyès & Components" }, { value: "accessories", label: "Akseswa" },
  { value: "tools", label: "Ekipman Teknoloji" },
];

const SORT_OPTIONS = [
  { value: "recommended", label: "Rekòmande" },
  { value: "verified", label: "Verifye Dabò" },
  { value: "name", label: "Non (A-Z)" },
  { value: "recent", label: "Pi Resan" },
];

export default function Suppliers() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ suppliers: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState(params.get("q") || "");

  const get = (k) => params.get(k) || "";
  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    p.delete("page");
    setParams(p);
  };
  const setPage = (n) => { const p = new URLSearchParams(params); p.set("page", n); setParams(p); };
  const submitSearch = (e) => { e.preventDefault(); setParam("q", qInput.trim()); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      ["q", "country", "supplier_type", "category", "ships_to_haiti", "verified", "sort", "page"].forEach((k) => { const v = params.get(k); if (v) qs.set(k, v); });
      const { data } = await api.get(`/suppliers?${qs.toString()}`);
      setData(data);
    } finally { setLoading(false); }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" />Founisè Entènasyonal</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.total} founisè jwenn — pou vandè ak teknisyen ki bezwen achte an gwo</p>
        </div>
        {user && <Link to="/become-supplier"><Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" data-testid="become-supplier-cta"><Plus className="w-4 h-4 mr-1" />Ajoute Founisè</Button></Link>}
      </div>

      {!user && (
        <div className="bg-muted/50 border border-border rounded-xl p-4 mb-6 text-sm text-muted-foreground">
          Konekte pou wè plis detay ak kontakte founisè verifye yo.
        </div>
      )}

      <form onSubmit={submitSearch} className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={qInput} onChange={(e) => setQInput(e.target.value)} data-testid="supplier-search-input"
          placeholder="Chèche pa non konpayi, mak, peyi..." className="pl-10 h-11" />
      </form>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        <Select value={get("supplier_type") || "all"} onValueChange={(v) => setParam("supplier_type", v === "all" ? "" : v)}>
          <SelectTrigger className="sm:w-52" data-testid="filter-supplier-type"><SelectValue placeholder="Tip Founisè" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tout tip</SelectItem>{SUPPLIER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={get("category") || "all"} onValueChange={(v) => setParam("category", v === "all" ? "" : v)}>
          <SelectTrigger className="sm:w-44" data-testid="filter-supplier-category"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tout kategori</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={get("country")} onChange={(e) => setParam("country", e.target.value)} placeholder="Peyi (egzanp USA)" className="sm:w-40 h-11" data-testid="filter-country" />
        <Select value={get("sort") || "recommended"} onValueChange={(v) => setParam("sort", v)}>
          <SelectTrigger className="sm:w-44" data-testid="filter-supplier-sort"><SelectValue /></SelectTrigger>
          <SelectContent>{SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm px-1 cursor-pointer">
          <input type="checkbox" checked={get("ships_to_haiti") === "true"} onChange={(e) => setParam("ships_to_haiti", e.target.checked ? "true" : "")} data-testid="filter-ships-haiti" className="w-4 h-4" />
          Livre nan Ayiti
        </label>
        <label className="flex items-center gap-2 text-sm px-1 cursor-pointer">
          <input type="checkbox" checked={get("verified") === "true"} onChange={(e) => setParam("verified", e.target.checked ? "true" : "")} data-testid="filter-supplier-verified" className="w-4 h-4" />
          Verifye sèlman
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : data.suppliers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground" data-testid="no-suppliers">Pa gen founisè ki matche ak filtè yo.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.suppliers.map((s) => (
              <Link key={s.id} to={`/suppliers/${s.id}`} data-testid={`supplier-card-${s.id}`}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center text-lg font-bold overflow-hidden shrink-0">
                    {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover" /> : s.company_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold truncate">{s.company_name}</h3>
                      {s.verified && <ShieldCheck className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{s.city ? `${s.city}, ` : ""}{s.country}</p>
                  </div>
                  {s.featured && <span className="text-[10px] font-semibold bg-secondary/20 text-secondary-foreground px-2 py-1 rounded-full shrink-0">Featured</span>}
                </div>
                {s.short_description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.short_description}</p>}
                <div className="flex flex-wrap gap-1 mt-3">
                  {s.supplier_types?.slice(0, 2).map((t) => <span key={t} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{t}</span>)}
                </div>
                {s.ships_to_haiti && <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1"><Truck className="w-3 h-3" />Livre nan Ayiti</p>}
              </Link>
            ))}
          </div>
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} data-testid="supplier-prev-page"><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm text-muted-foreground">Paj {data.page} sou {data.pages}</span>
              <Button variant="outline" size="sm" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)} data-testid="supplier-next-page"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

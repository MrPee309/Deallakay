import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Star, ShieldCheck, MapPin, Wrench, Search, ChevronLeft, ChevronRight, Clock, Briefcase } from "lucide-react";
import api from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AVAILABILITY_LABELS = {
  available: { label: "Disponib", color: "bg-emerald-100 text-emerald-700" },
  busy: { label: "Okipe", color: "bg-amber-100 text-amber-700" },
  offline: { label: "Offline", color: "bg-muted text-muted-foreground" },
  by_appointment: { label: "Sou Randevou", color: "bg-blue-100 text-blue-700" },
};

const SORT_OPTIONS = [
  { value: "recommended", label: "Rekòmande" },
  { value: "verified", label: "Verifye Dabò" },
  { value: "rating", label: "Pi Byen Note" },
  { value: "experience", label: "Plis Eksperyans" },
  { value: "recent", label: "Pi Resan" },
];

export default function Technicians() {
  const { locations } = useApp();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [specialties, setSpecialties] = useState([]);
  const [data, setData] = useState({ technicians: [], total: 0, page: 1, pages: 1 });
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState(params.get("q") || "");

  const get = (k) => params.get(k) || "";
  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    p.delete("page"); // any filter change resets to page 1
    setParams(p);
  };
  const setPage = (n) => { const p = new URLSearchParams(params); p.set("page", n); setParams(p); };

  useEffect(() => {
    api.get("/technician-specialties").then(({ data }) => setSpecialties(data)).catch(() => {});
    api.get("/technicians/work-feed").then(({ data }) => setFeed(data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      ["q", "specialty", "department", "city", "availability", "verified", "sort", "page"].forEach((k) => { const v = params.get(k); if (v) qs.set(k, v); });
      const { data } = await api.get(`/technicians?${qs.toString()}`);
      setData(data);
    } finally { setLoading(false); }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const dep = locations.find((d) => d.name === get("department"));
  const submitSearch = (e) => { e.preventDefault(); setParam("q", qInput.trim()); };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Wrench className="w-6 h-6 text-primary" />Jwenn yon Teknisyen</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.total} teknisyen jwenn</p>
        </div>
        {user && !user.is_technician && (
          <Link to="/become-technician"><Button className="bg-primary font-semibold" data-testid="become-technician-cta">Vin Teknisyen</Button></Link>
        )}
      </div>

      {feed.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-bold mb-3">Katalòg Travay Teknisyen yo</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {feed.map((w) => (
              <Link key={w.id} to={`/technician/${w.technician_username}`} data-testid={`catalog-photo-${w.id}`}
                className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={w.image} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-white text-[10px] font-semibold truncate">@{w.technician_username}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submitSearch} className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={qInput} onChange={(e) => setQInput(e.target.value)} data-testid="technician-search-input"
          placeholder="Chèche pa non, espesyalite (egzanp 'iPhone', 'BIOS')..." className="pl-10 h-11" />
      </form>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        <Select value={get("specialty") || "all"} onValueChange={(v) => setParam("specialty", v === "all" ? "" : v)}>
          <SelectTrigger className="sm:w-48" data-testid="filter-specialty"><SelectValue placeholder="Espesyalite" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout espesyalite</SelectItem>
            {specialties.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={get("department") || "all"} onValueChange={(v) => { setParam("department", v === "all" ? "" : v); setParam("city", ""); }}>
          <SelectTrigger className="sm:w-44" data-testid="filter-tech-department"><SelectValue placeholder="Depatman" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout depatman</SelectItem>
            {locations.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={get("city") || "all"} onValueChange={(v) => setParam("city", v === "all" ? "" : v)} disabled={!dep}>
          <SelectTrigger className="sm:w-40" data-testid="filter-tech-city"><SelectValue placeholder="Vil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout vil</SelectItem>
            {dep?.cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={get("availability") || "all"} onValueChange={(v) => setParam("availability", v === "all" ? "" : v)}>
          <SelectTrigger className="sm:w-40" data-testid="filter-availability"><SelectValue placeholder="Disponiblite" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Nenpòt</SelectItem>
            {Object.entries(AVAILABILITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={get("sort") || "recommended"} onValueChange={(v) => setParam("sort", v)}>
          <SelectTrigger className="sm:w-44" data-testid="filter-sort"><SelectValue /></SelectTrigger>
          <SelectContent>{SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm px-1 cursor-pointer">
          <input type="checkbox" checked={get("verified") === "true"} onChange={(e) => setParam("verified", e.target.checked ? "true" : "")} data-testid="filter-verified-only" className="w-4 h-4" />
          Verifye sèlman
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : data.technicians.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground" data-testid="no-technicians">Pa gen teknisyen ki matche ak filtè yo.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.technicians.map((t) => {
              const av = AVAILABILITY_LABELS[t.availability];
              return (
                <Link key={t.username} to={`/technician/${t.username}`} data-testid={`technician-card-${t.username}`}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center text-lg font-bold overflow-hidden shrink-0">
                      {t.avatar ? <img src={t.avatar} alt="" className="w-full h-full object-cover" /> : t.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h3 className="font-semibold truncate">{t.full_name}</h3>
                        {t.technician_verified && <ShieldCheck className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{t.city}, {t.department}</p>
                    </div>
                    {av && <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${av.color}`}>{av.label}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {t.specialties.slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-sm">
                    {t.review_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-secondary text-secondary" />
                        <span className="font-semibold">{t.rating}</span>
                        <span className="text-muted-foreground text-xs">({t.review_count})</span>
                      </div>
                    )}
                    {t.years_experience != null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Briefcase className="w-3 h-3" />{t.years_experience} ane</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} data-testid="tech-prev-page">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Paj {data.page} sou {data.pages}</span>
              <Button variant="outline" size="sm" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)} data-testid="tech-next-page">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

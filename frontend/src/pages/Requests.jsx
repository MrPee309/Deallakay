import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, MapPin, MessageSquareText, Clock } from "lucide-react";
import api from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { timeAgo } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Requests() {
  const { categories, locations, lang } = useApp();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ requests: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const get = (k) => params.get(k) || "";
  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      ["category", "department"].forEach((k) => { const v = params.get(k); if (v) qs.set(k, v); });
      const { data } = await api.get(`/requests?${qs.toString()}`);
      setData(data);
    } finally { setLoading(false); }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Demann Pyès & Sèvis</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.total} demann louvri</p>
        </div>
        <Link to="/post-request"><Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" data-testid="post-request-cta"><Plus className="w-4 h-4 mr-1" />Mande yon Pyès</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Select value={get("category") || "all"} onValueChange={(v) => setParam("category", v === "all" ? "" : v)}>
          <SelectTrigger className="sm:w-56" data-testid="filter-request-category"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout kategori</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.type}>{c.name_ht}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={get("department") || "all"} onValueChange={(v) => setParam("department", v === "all" ? "" : v)}>
          <SelectTrigger className="sm:w-56" data-testid="filter-request-department"><SelectValue placeholder="Depatman" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout depatman</SelectItem>
            {locations.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : data.requests.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground" data-testid="no-requests">Pa gen demann ki matche ak filtè yo.</div>
      ) : (
        <div className="space-y-3">
          {data.requests.map((r) => (
            <Link key={r.id} to={`/requests/${r.id}`} data-testid={`request-card-${r.id}`}
              className="flex gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary hover:shadow-md transition-all">
              {r.images?.[0] && <img src={r.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{r.title}</h3>
                {r.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{r.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}, {r.department}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(r.created_at, lang)}</span>
                  {r.offer_count > 0 && <span className="flex items-center gap-1 text-primary font-medium"><MessageSquareText className="w-3 h-3" />{r.offer_count} òf</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Users, Store, Package, DollarSign, Flag, ShieldCheck, Loader2, Search, Ban, RotateCcw, Trash2, Check, X, Plus, Eye } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { getCatName } from "@/i18n";
import { formatPrice, timeAgo } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {}); }, []);
  if (!stats) return <FullLoader />;

  const CARDS = [
    { label: "Itilizatè", value: stats.total_users, icon: Users, c: "text-primary bg-primary/10" },
    { label: "Vandè", value: stats.total_sellers, icon: Store, c: "text-violet-600 bg-violet-50" },
    { label: "Listings Aktif", value: stats.active_listings, icon: Package, c: "text-emerald-600 bg-emerald-50" },
    { label: "Vann", value: stats.sold_products, icon: DollarSign, c: "text-teal-600 bg-teal-50" },
    { label: "An Atant", value: stats.pending_listings, icon: Eye, c: "text-amber-600 bg-amber-50" },
    { label: "Rapò", value: stats.reported_listings, icon: Flag, c: "text-rose-600 bg-rose-50" },
    { label: "Vandè Verifye", value: stats.verified_sellers, icon: ShieldCheck, c: "text-blue-600 bg-blue-50" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <h1 className="font-display text-2xl font-bold mb-5 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" />Admin Panel</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {CARDS.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.c}`}><s.icon className="w-4 h-4" /></span>
            <div className="font-display text-2xl font-800 mt-2" style={{ fontWeight: 800 }}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="products">
        <TabsList className="mb-5 flex-wrap h-auto">
          <TabsTrigger value="products" data-testid="admin-tab-products">Moderasyon</TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Itilizatè</TabsTrigger>
          <TabsTrigger value="reports" data-testid="admin-tab-reports">Rapò</TabsTrigger>
          <TabsTrigger value="verifications" data-testid="admin-tab-verif">Verifikasyon</TabsTrigger>
          <TabsTrigger value="categories" data-testid="admin-tab-cats">Kategori</TabsTrigger>
          <TabsTrigger value="settings" data-testid="admin-tab-settings">Paramèt</TabsTrigger>
        </TabsList>
        <TabsContent value="products"><AdminProducts /></TabsContent>
        <TabsContent value="users"><AdminUsers /></TabsContent>
        <TabsContent value="reports"><AdminReports /></TabsContent>
        <TabsContent value="verifications"><AdminVerifications /></TabsContent>
        <TabsContent value="categories"><AdminCategories /></TabsContent>
        <TabsContent value="settings"><AdminSettings /></TabsContent>
      </Tabs>
    </div>
  );
}

function AdminProducts() {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const load = useCallback(async () => {
    const { data } = await api.get(`/admin/products${status !== "all" ? `?status=${status}` : ""}`);
    setItems(data);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const act = async (id, decision) => {
    try { await api.put(`/admin/products/${id}/moderate/${decision}`); toast.success("Fèt"); load(); } catch (e) { toast.error(apiError(e)); }
  };
  const viewImei = async (id) => {
    try { const { data } = await api.get(`/admin/products/${id}/imei`); toast.info(data.imei ? `IMEI: ${data.imei}` : "Pa gen IMEI"); } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-48 mb-4" data-testid="admin-product-status"><SelectValue /></SelectTrigger>
        <SelectContent>
          {["pending", "active", "sold", "rejected", "all"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="space-y-2">
        {items.length === 0 && <div className="text-center py-10 text-muted-foreground">Pa gen anyen.</div>}
        {items.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`admin-product-${p.id}`}>
            <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">{p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{p.title}</div>
              <div className="text-xs text-muted-foreground">@{p.seller_username} · {formatPrice(p.price)} · {p.status}</div>
            </div>
            {p.category === "phone" && <Button size="sm" variant="outline" onClick={() => viewImei(p.id)} data-testid={`imei-${p.id}`}>IMEI</Button>}
            {p.status === "pending" && <>
              <Button size="sm" className="bg-emerald-500" onClick={() => act(p.id, "approve")} data-testid={`approve-${p.id}`}><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(p.id, "reject")} data-testid={`reject-${p.id}`}><X className="w-4 h-4" /></Button>
            </>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminUsers() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const load = useCallback(async () => { const { data } = await api.get(`/admin/users${q ? `?q=${q}` : ""}`); setUsers(data); }, [q]);
  useEffect(() => { load(); }, [load]);
  const act = async (id, action) => { try { await api.put(`/admin/users/${id}/${action}`); toast.success("Fèt"); load(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div>
      <div className="relative mb-4 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chèche itilizatè..." className="pl-9" data-testid="admin-user-search" /></div>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`admin-user-${u.id}`}>
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">{u.username[0]?.toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">@{u.username} {u.role === "admin" && <span className="text-xs text-primary">(admin)</span>}</div>
              <div className="text-xs text-muted-foreground truncate">{u.email} · {u.status} {u.is_seller && "· vandè"}</div>
            </div>
            {u.role !== "admin" && <>
              {u.status === "active" ? <>
                <Button size="sm" variant="outline" onClick={() => act(u.id, "suspend")} data-testid={`suspend-${u.id}`}>Sispann</Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(u.id, "ban")} data-testid={`ban-${u.id}`}><Ban className="w-4 h-4" /></Button>
              </> : <Button size="sm" variant="outline" onClick={() => act(u.id, "restore")} data-testid={`restore-${u.id}`}><RotateCcw className="w-4 h-4" /></Button>}
            </>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminReports() {
  const [items, setItems] = useState([]);
  const load = async () => { const { data } = await api.get("/admin/reports"); setItems(data); };
  useEffect(() => { load(); }, []);
  const resolve = async (id) => { await api.put(`/admin/reports/${id}/resolve`); toast.success("Rezoud"); load(); };
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-center py-10 text-muted-foreground">Pa gen rapò.</div>}
      {items.map((r) => (
        <div key={r.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`report-${r.id}`}>
          <Flag className="w-5 h-5 text-rose-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{r.reason} <span className="text-xs text-muted-foreground">({r.target_type})</span></div>
            <div className="text-xs text-muted-foreground truncate">De @{r.reporter_username} · {r.description || "—"} · {timeAgo(r.created_at)}</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "open" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{r.status}</span>
          {r.status === "open" && <Button size="sm" variant="outline" onClick={() => resolve(r.id)} data-testid={`resolve-${r.id}`}><Check className="w-4 h-4" /></Button>}
        </div>
      ))}
    </div>
  );
}

function AdminVerifications() {
  const [items, setItems] = useState([]);
  const load = async () => { const { data } = await api.get("/admin/verifications"); setItems(data); };
  useEffect(() => { load(); }, []);
  const act = async (id, decision) => { await api.put(`/admin/verifications/${id}/${decision}`); toast.success("Fèt"); load(); };
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-center py-10 text-muted-foreground">Pa gen demann.</div>}
      {items.map((v) => (
        <div key={v.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`verif-${v.id}`}>
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1"><div className="font-semibold text-sm">@{v.username}</div><div className="text-xs text-muted-foreground">{v.status} · {timeAgo(v.created_at)}</div></div>
          {v.status === "pending" && <>
            <Button size="sm" className="bg-emerald-500" onClick={() => act(v.id, "approve")} data-testid={`verif-approve-${v.id}`}><Check className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(v.id, "reject")} data-testid={`verif-reject-${v.id}`}><X className="w-4 h-4" /></Button>
          </>}
        </div>
      ))}
    </div>
  );
}

function AdminCategories() {
  const { categories, reloadMeta, lang } = useApp();
  const [name, setName] = useState("");
  const [subInputs, setSubInputs] = useState({});

  const addCat = async () => { if (!name) return; try { await api.post("/admin/categories", { name_ht: name, name_en: name }); setName(""); reloadMeta(); toast.success("Ajoute"); } catch (e) { toast.error(apiError(e)); } };
  const delCat = async (id) => { await api.delete(`/admin/categories/${id}`); reloadMeta(); toast.success("Efase"); };
  const addSub = async (cid) => { const n = subInputs[cid]; if (!n) return; await api.post(`/admin/categories/${cid}/subcategories`, { name: n }); setSubInputs((s) => ({ ...s, [cid]: "" })); reloadMeta(); };
  const delSub = async (cid, sid) => { await api.delete(`/admin/categories/${cid}/subcategories/${sid}`); reloadMeta(); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 max-w-md"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvo kategori" data-testid="new-cat-input" /><Button onClick={addCat} data-testid="add-cat-btn"><Plus className="w-4 h-4" /></Button></div>
      {categories.map((c) => (
        <div key={c.id} className="bg-card border border-border rounded-xl p-4" data-testid={`admin-cat-${c.id}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{getCatName(c, lang)} <span className="text-xs text-muted-foreground">({c.type})</span></span>
            {!c.id.startsWith("cat-") && <Button size="sm" variant="outline" className="text-destructive" onClick={() => delCat(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {c.subcategories.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">{s.name}<button onClick={() => delSub(c.id, s.id)} className="text-destructive"><X className="w-3 h-3" /></button></span>
            ))}
          </div>
          <div className="flex gap-2 max-w-xs"><Input value={subInputs[c.id] || ""} onChange={(e) => setSubInputs((s) => ({ ...s, [c.id]: e.target.value }))} placeholder="Sou-kategori" className="h-9" /><Button size="sm" onClick={() => addSub(c.id)}><Plus className="w-4 h-4" /></Button></div>
        </div>
      ))}
    </div>
  );
}

function AdminSettings() {
  const { reloadMeta } = useApp();
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/settings").then((r) => setS(r.data)); }, []);
  if (!s) return <Loader2 className="w-6 h-6 animate-spin text-primary" />;
  const setBrand = (k, v) => setS((p) => ({ ...p, site_branding: { ...p.site_branding, [k]: v } }));

  const save = async () => {
    try { await api.put("/admin/settings", { site_branding: s.site_branding, listing_mode: s.listing_mode, safety_messages: s.safety_messages }); toast.success("Anrejistre!"); reloadMeta(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="max-w-lg bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="font-display font-bold">Branding (SITE_CONFIG)</h3>
      <div><Label>Non Sit</Label><Input value={s.site_branding.siteName} onChange={(e) => setBrand("siteName", e.target.value)} data-testid="setting-site-name" className="mt-1.5 h-11" /></div>
      <div><Label>Tagline</Label><Input value={s.site_branding.siteTagline} onChange={(e) => setBrand("siteTagline", e.target.value)} data-testid="setting-tagline" className="mt-1.5 h-11" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Koulè Prensipal</Label><Input type="color" value={s.site_branding.primaryColor} onChange={(e) => setBrand("primaryColor", e.target.value)} className="mt-1.5 h-11" /></div>
        <div><Label>Koulè Segondè</Label><Input type="color" value={s.site_branding.secondaryColor} onChange={(e) => setBrand("secondaryColor", e.target.value)} className="mt-1.5 h-11" /></div>
      </div>
      <div>
        <Label>Mòd Listing</Label>
        <Select value={s.listing_mode} onValueChange={(v) => setS((p) => ({ ...p, listing_mode: v }))}>
          <SelectTrigger className="mt-1.5 h-11" data-testid="setting-listing-mode"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="auto">Auto Publish</SelectItem><SelectItem value="approval">Admin Approval</SelectItem></SelectContent>
        </Select>
      </div>
      <Button onClick={save} className="bg-primary" data-testid="save-admin-settings">Anrejistre</Button>
    </div>
  );
}

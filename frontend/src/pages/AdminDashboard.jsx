import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Users, Store, Package, DollarSign, Flag, ShieldCheck, Loader2, Search, Ban, RotateCcw, Trash2, Check, X, Plus, Eye, Building2, UserCog, Smartphone, Bike, MapPin } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCatName } from "@/i18n";
import { formatPrice, timeAgo } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  const { user } = useAuth();
  const isFullAdmin = user?.role === "admin";
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {}).finally(() => setStatsLoading(false));
  }, []);
  // Stats are Full-Admin-only (get_admin) — Staff members can't load them,
  // so don't block the whole page behind a loader that never resolves for
  // them; just skip the stat cards and go straight to the tabs they can use.
  if (statsLoading) return <FullLoader />;

  const ENGAGEMENT_CARDS = stats ? [
    { label: "Telechajman APK", value: stats.apk_downloads, icon: Smartphone, c: "text-indigo-600 bg-indigo-50" },
    { label: "Itilizatè Aktif — Jodi a", value: stats.active_users_today, icon: Users, c: "text-emerald-600 bg-emerald-50" },
    { label: "Itilizatè Aktif — 7 Jou", value: stats.active_users_7d, icon: Users, c: "text-emerald-600 bg-emerald-50" },
    { label: "Itilizatè Aktif — 30 Jou", value: stats.active_users_30d, icon: Users, c: "text-emerald-600 bg-emerald-50" },
  ] : [];

  const CARDS = stats ? [
    { label: "Itilizatè", value: stats.total_users, icon: Users, c: "text-primary bg-primary/10" },
    { label: "Vandè", value: stats.total_sellers, icon: Store, c: "text-violet-600 bg-violet-50" },
    { label: "Listings Aktif", value: stats.active_listings, icon: Package, c: "text-emerald-600 bg-emerald-50" },
    { label: "Vann", value: stats.sold_products, icon: DollarSign, c: "text-teal-600 bg-teal-50" },
    { label: "An Atant", value: stats.pending_listings, icon: Eye, c: "text-amber-600 bg-amber-50" },
    { label: "Rapò", value: stats.reported_listings, icon: Flag, c: "text-rose-600 bg-rose-50" },
    { label: "Vandè Verifye", value: stats.verified_sellers, icon: ShieldCheck, c: "text-blue-600 bg-blue-50" },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <h1 className="font-display text-2xl font-bold mb-5 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" />Admin Panel</h1>

      {ENGAGEMENT_CARDS.length > 0 && (
        <div className="mb-6" data-testid="admin-engagement-section">
          <h2 className="font-display text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Aktivite Sit & App</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ENGAGEMENT_CARDS.map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4" data-testid={`admin-engagement-${s.label}`}>
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.c}`}><s.icon className="w-4 h-4" /></span>
                <div className="font-display text-2xl font-800 mt-2" style={{ fontWeight: 800 }}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Estatistik Mache a</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {CARDS.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.c}`}><s.icon className="w-4 h-4" /></span>
            <div className="font-display text-2xl font-800 mt-2" style={{ fontWeight: 800 }}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {(() => {
        const perms = user?.permissions || [];
        const can = (p) => isFullAdmin || perms.includes(p);
        const TABS = [
          { value: "products", label: "Moderasyon", show: can("moderate_products"), content: <AdminProducts /> },
          { value: "users", label: "Itilizatè", show: isFullAdmin, content: <AdminUsers /> },
          { value: "reports", label: "Rapò", show: can("handle_reports"), content: <AdminReports /> },
          { value: "seller-applications", label: "Aplikasyon Vandè", show: can("approve_sellers"), content: <AdminSellerApplications /> },
          { value: "technician-applications", label: "Aplikasyon Teknisyen", show: can("approve_technicians"), content: <AdminTechnicianApplications /> },
          { value: "verifications", label: "Verifikasyon Vandè", show: isFullAdmin, content: <AdminVerifications /> },
          { value: "tech-verifications", label: "Verifikasyon Teknisyen", show: isFullAdmin, content: <AdminTechnicianVerifications /> },
          { value: "supplier-approvals", label: "Founisè An Atant", show: can("approve_suppliers"), content: <AdminSupplierApprovals /> },
          { value: "supplier-verifications", label: "Verifikasyon Founisè", show: isFullAdmin, content: <AdminSupplierVerifications /> },
          { value: "transport-drivers", label: "Chofè Transpò", show: can("approve_drivers"), content: <AdminTransportDrivers /> },
          { value: "transport-stations", label: "Stasyon", show: can("manage_stations"), content: <AdminTransportStations /> },
          { value: "categories", label: "Kategori", show: isFullAdmin, content: <AdminCategories /> },
          { value: "settings", label: "Paramèt", show: isFullAdmin, content: <AdminSettings /> },
          { value: "staff", label: "Anplwaye", show: isFullAdmin, content: <AdminStaff /> },
        ].filter((t) => t.show);
        return (
          <Tabs defaultValue={TABS[0]?.value}>
            <TabsList className="mb-5 flex-wrap h-auto">
              {TABS.map((t) => <TabsTrigger key={t.value} value={t.value} data-testid={`admin-tab-${t.value}`}>{t.label}</TabsTrigger>)}
            </TabsList>
            {TABS.map((t) => <TabsContent key={t.value} value={t.value}>{t.content}</TabsContent>)}
          </Tabs>
        );
      })()}
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

function AdminSellerApplications() {
  const [items, setItems] = useState([]);
  const load = async () => { const { data } = await api.get("/admin/seller-applications"); setItems(data.filter((s) => s.status === "pending")); };
  useEffect(() => { load(); }, []);
  const act = async (uid, action) => { await api.put(`/admin/seller-applications/${uid}/${action}`); toast.success("Fèt"); load(); };
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-center py-10 text-muted-foreground">Pa gen aplikasyon Vandè an atant.</div>}
      {items.map((s) => (
        <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`seller-app-${s.user_id}`}>
          <Store className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1"><div className="font-semibold text-sm">User ID: {s.user_id}</div><div className="text-xs text-muted-foreground">{timeAgo(s.date_joined)}</div></div>
          <Button size="sm" className="bg-emerald-500" onClick={() => act(s.user_id, "approve")} data-testid={`seller-app-approve-${s.user_id}`}><Check className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(s.user_id, "reject")} data-testid={`seller-app-reject-${s.user_id}`}><X className="w-4 h-4" /></Button>
        </div>
      ))}
    </div>
  );
}

function AdminTechnicianApplications() {
  const [items, setItems] = useState([]);
  const load = async () => { const { data } = await api.get("/admin/technician-applications"); setItems(data.filter((t) => t.status === "pending")); };
  useEffect(() => { load(); }, []);
  const act = async (uid, action) => { await api.put(`/admin/technician-applications/${uid}/${action}`); toast.success("Fèt"); load(); };
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-center py-10 text-muted-foreground">Pa gen aplikasyon Teknisyen an atant.</div>}
      {items.map((t) => (
        <div key={t.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`tech-app-${t.user_id}`}>
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-sm">User ID: {t.user_id}</div>
            <div className="text-xs text-muted-foreground">{(t.specialties || []).join(", ")} · {timeAgo(t.date_joined)}</div>
          </div>
          <Button size="sm" className="bg-emerald-500" onClick={() => act(t.user_id, "approve")} data-testid={`tech-app-approve-${t.user_id}`}><Check className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(t.user_id, "reject")} data-testid={`tech-app-reject-${t.user_id}`}><X className="w-4 h-4" /></Button>
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

function AdminTechnicianVerifications() {
  const [items, setItems] = useState([]);
  const load = async () => { const { data } = await api.get("/admin/technician-verifications"); setItems(data); };
  useEffect(() => { load(); }, []);
  const act = async (id, decision) => { await api.put(`/admin/technician-verifications/${id}/${decision}`); toast.success("Fèt"); load(); };
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-center py-10 text-muted-foreground">Pa gen demann.</div>}
      {items.map((v) => (
        <div key={v.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`tech-verif-${v.id}`}>
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1"><div className="font-semibold text-sm">@{v.username}</div><div className="text-xs text-muted-foreground">{v.status} · {timeAgo(v.created_at)}</div></div>
          {v.status === "pending" && <>
            <Button size="sm" className="bg-emerald-500" onClick={() => act(v.id, "approve")} data-testid={`tech-verif-approve-${v.id}`}><Check className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(v.id, "reject")} data-testid={`tech-verif-reject-${v.id}`}><X className="w-4 h-4" /></Button>
          </>}
        </div>
      ))}
    </div>
  );
}

function AdminSupplierVerifications() {
  const [items, setItems] = useState([]);
  const load = async () => { const { data } = await api.get("/admin/supplier-verifications"); setItems(data); };
  useEffect(() => { load(); }, []);
  const act = async (id, decision) => { await api.put(`/admin/supplier-verifications/${id}/${decision}`); toast.success("Fèt"); load(); };
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-center py-10 text-muted-foreground">Pa gen demann.</div>}
      {items.map((v) => (
        <div key={v.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`supplier-verif-${v.id}`}>
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1"><div className="font-semibold text-sm">{v.company_name}</div><div className="text-xs text-muted-foreground">{v.status} · {timeAgo(v.created_at)}</div></div>
          {v.status === "pending" && <>
            <Button size="sm" className="bg-emerald-500" onClick={() => act(v.id, "approve")} data-testid={`supplier-verif-approve-${v.id}`}><Check className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(v.id, "reject")} data-testid={`supplier-verif-reject-${v.id}`}><X className="w-4 h-4" /></Button>
          </>}
        </div>
      ))}
    </div>
  );
}

function AdminSupplierApprovals() {
  const [items, setItems] = useState([]);
  const load = async () => { const { data } = await api.get("/admin/suppliers"); setItems(data.filter((s) => s.status === "pending")); };
  useEffect(() => { load(); }, []);
  const act = async (id, action) => { await api.put(`/admin/suppliers/${id}/${action}`); toast.success("Fèt"); load(); };
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-center py-10 text-muted-foreground">Pa gen demann founisè an atant.</div>}
      {items.map((s) => (
        <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`supplier-approval-${s.id}`}>
          <Building2 className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-sm">{s.company_name}</div>
            <div className="text-xs text-muted-foreground">{s.country} · {s.contact_phone} · {timeAgo(s.created_at)}</div>
          </div>
          <Button size="sm" className="bg-emerald-500" onClick={() => act(s.id, "approve")} data-testid={`supplier-approve-${s.id}`}><Check className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(s.id, "reject")} data-testid={`supplier-reject-${s.id}`}><X className="w-4 h-4" /></Button>
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

const PERMISSION_LABELS = {
  moderate_products: "Moderasyon Pwodwi",
  approve_sellers: "Apwouve Vandè",
  approve_technicians: "Apwouve Teknisyen",
  approve_suppliers: "Apwouve Founisè",
  handle_reports: "Jere Rapò",
};

function AdminStaff() {
  const [available, setAvailable] = useState([]);
  const [staff, setStaff] = useState([]);
  const [username, setUsername] = useState("");
  const [newPerms, setNewPerms] = useState([]);
  const [saving, setSaving] = useState(false);

  // New-account creation form (admin sets everything, including password)
  const [nf, setNf] = useState({ full_name: "", username: "", email: "", phone: "", password: "" });
  const [nfPerms, setNfPerms] = useState([]);
  const [creating, setCreating] = useState(false);
  const setN = (k, v) => setNf((s) => ({ ...s, [k]: v }));

  const load = async () => {
    const [permsRes, staffRes] = await Promise.all([api.get("/admin/staff-permissions"), api.get("/admin/staff")]);
    setAvailable(permsRes.data);
    setStaff(staffRes.data);
  };
  useEffect(() => { load(); }, []);

  const togglePerm = (p) => setNewPerms((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  const toggleNfPerm = (p) => setNfPerms((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  const createAccount = async () => {
    if (!nf.full_name.trim() || !nf.username.trim() || !nf.email.trim() || !nf.password) {
      return toast.error("Ranpli non konplè, non itilizatè, email, ak modpas.");
    }
    if (nf.password.length < 8) return toast.error("Modpas la dwe gen omwen 8 karaktè.");
    setCreating(true);
    try {
      const { data } = await api.post("/admin/staff/create-account", { ...nf, permissions: nfPerms });
      toast.success(`Kont kreye pou @${data.username} — ba yo non itilizatè a ak modpas la.`);
      setNf({ full_name: "", username: "", email: "", phone: "", password: "" });
      setNfPerms([]);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setCreating(false); }
  };

  const addStaff = async () => {
    if (!username.trim()) return toast.error("Antre non itilizatè a.");
    setSaving(true);
    try {
      await api.post("/admin/staff", { username: username.trim(), permissions: newPerms });
      toast.success("Anplwaye ajoute.");
      setUsername(""); setNewPerms([]); load();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  const togglePermExisting = async (member, p) => {
    const next = (member.permissions || []).includes(p) ? member.permissions.filter((x) => x !== p) : [...(member.permissions || []), p];
    await api.put(`/admin/staff/${member.id}`, { username: member.username, permissions: next });
    load();
  };

  const removeStaff = async (id) => {
    await api.delete(`/admin/staff/${id}`);
    toast.success("Anplwaye retire.");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><UserCog className="w-4 h-4 text-primary" /> Kreye Nouvo Kont Anplwaye</h3>
        <p className="text-xs text-muted-foreground">Pou yon moun ki PA gen kont DealLakay ankò — ou kreye kont lan pou yo, ba yo non itilizatè ak modpas ou chwazi.</p>
        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Sa a se SÈLMAN pou Anplwaye ekip DealLakay — pa pou Kliyan, Vandè, Teknisyen, oswa Founisè. Kont sa a pa janm ka jwenn kapasite Vandè/Teknisyen, menm si moun nan eseye.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Non Konplè</Label><Input value={nf.full_name} onChange={(e) => setN("full_name", e.target.value)} className="mt-1.5" data-testid="staff-create-fullname" /></div>
          <div><Label>Non Itilizatè</Label><Input value={nf.username} onChange={(e) => setN("username", e.target.value)} className="mt-1.5" data-testid="staff-create-username" /></div>
          <div><Label>Email</Label><Input type="email" value={nf.email} onChange={(e) => setN("email", e.target.value)} className="mt-1.5" data-testid="staff-create-email" /></div>
          <div><Label>Telefòn (opsyonèl)</Label><Input value={nf.phone} onChange={(e) => setN("phone", e.target.value)} className="mt-1.5" data-testid="staff-create-phone" /></div>
          <div className="sm:col-span-2"><Label>Modpas (omwen 8 karaktè)</Label><Input type="text" value={nf.password} onChange={(e) => setN("password", e.target.value)} className="mt-1.5" data-testid="staff-create-password" /></div>
        </div>
        <div>
          <Label>Otorizasyon</Label>
          <div className="flex flex-wrap gap-3 mt-2">
            {available.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox checked={nfPerms.includes(p)} onCheckedChange={() => toggleNfPerm(p)} data-testid={`staff-create-perm-${p}`} />
                {PERMISSION_LABELS[p] || p}
              </label>
            ))}
          </div>
        </div>
        <Button onClick={createAccount} disabled={creating} data-testid="staff-create-btn">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kreye Kont"}</Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><UserCog className="w-4 h-4 text-primary" /> Pwomouvwa yon Kont ki Deja Egziste</h3>
        <p className="text-xs text-muted-foreground">Si moun nan gen DEJA yon kont DealLakay, itilize sa a olye.</p>
        <div>
          <Label>Non Itilizatè</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="egzanp: jean_p" className="mt-1.5" data-testid="staff-username" />
        </div>
        <div>
          <Label>Otorizasyon</Label>
          <div className="flex flex-wrap gap-3 mt-2">
            {available.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox checked={newPerms.includes(p)} onCheckedChange={() => togglePerm(p)} data-testid={`staff-new-perm-${p}`} />
                {PERMISSION_LABELS[p] || p}
              </label>
            ))}
          </div>
        </div>
        <Button onClick={addStaff} disabled={saving} data-testid="staff-add-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajoute Anplwaye"}</Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Anplwaye Aktyèl</h3>
        {staff.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">Pa gen anplwaye ankò.</div>}
        {staff.map((m) => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-3" data-testid={`staff-member-${m.id}`}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">@{m.username}</div>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeStaff(m.id)} data-testid={`staff-remove-${m.id}`}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {available.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={(m.permissions || []).includes(p)} onCheckedChange={() => togglePermExisting(m, p)} data-testid={`staff-perm-${m.id}-${p}`} />
                  {PERMISSION_LABELS[p] || p}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminTransportDrivers() {
  const [items, setItems] = useState([]);
  const [activity, setActivity] = useState(null);
  const load = async () => { const { data } = await api.get("/admin/transport/drivers"); setItems(data); };
  const loadActivity = async () => { const { data } = await api.get("/transport/admin/live-activity"); setActivity(data); };
  useEffect(() => { load(); loadActivity(); }, []);
  const act = async (uid, action) => { await api.put(`/admin/transport/drivers/${uid}/${action}`); toast.success("Fèt"); load(); loadActivity(); };
  const pending = items.filter((d) => d.verification_status === "pending");
  const others = items.filter((d) => d.verification_status !== "pending");
  return (
    <div className="space-y-6">
      {activity && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-xl font-bold">{activity.active_trips}</div><div className="text-xs text-muted-foreground">Kous Aktif</div></div>
          <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-xl font-bold text-emerald-600">{activity.available_drivers}</div><div className="text-xs text-muted-foreground">Chofè Disponib</div></div>
          <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-xl font-bold text-amber-600">{activity.busy_drivers}</div><div className="text-xs text-muted-foreground">Chofè Okipe</div></div>
          <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-xl font-bold">{activity.requests_today}</div><div className="text-xs text-muted-foreground">Demann Jodi a</div></div>
          <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-xl font-bold text-rose-600">{activity.no_driver_found_today}</div><div className="text-xs text-muted-foreground">San Chofè Jodi a</div></div>
        </div>
      )}
      <div>
        <h3 className="font-semibold text-sm mb-2">An Atant ({pending.length})</h3>
        {pending.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">Pa gen demann Chofè an atant.</div>}
        {pending.map((d) => (
          <div key={d.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 mb-2" data-testid={`transport-driver-${d.user_id}`}>
            <Bike className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm">User ID: {d.user_id}</div>
              <div className="text-xs text-muted-foreground">
                {d.motorcycle?.brand} {d.motorcycle?.model} · {d.city}{d.area ? `, ${d.area}` : ""} · {timeAgo(d.created_at)}
              </div>
            </div>
            <Button size="sm" className="bg-emerald-500" onClick={() => act(d.user_id, "approve")} data-testid={`transport-driver-approve-${d.user_id}`}><Check className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(d.user_id, "reject")} data-testid={`transport-driver-reject-${d.user_id}`}><X className="w-4 h-4" /></Button>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-2">Tout Lòt Chofè</h3>
        {others.map((d) => (
          <div key={d.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 mb-2" data-testid={`transport-driver-other-${d.user_id}`}>
            <Bike className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm">User ID: {d.user_id}</div>
              <div className="text-xs text-muted-foreground">{d.verification_status} · {d.status} · {d.city}</div>
            </div>
            {d.verification_status === "verified" && (
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(d.user_id, "suspend")} data-testid={`transport-driver-suspend-${d.user_id}`}>Sispann</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminTransportStations() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => { const { data } = await api.get("/admin/transport/stations"); setItems(data); };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim() || !city.trim()) return toast.error("Antre non ak vil stasyon an.");
    setSaving(true);
    try {
      await api.post("/admin/transport/stations", { name: name.trim(), city: city.trim(), area: area.trim() });
      toast.success("Stasyon kreye.");
      setName(""); setCity(""); setArea(""); load();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  const toggle = async (s) => {
    await api.put(`/admin/transport/stations/${s.id}/${s.status === "active" ? "deactivate" : "activate"}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Kreye yon Stasyon</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label>Non Stasyon</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" data-testid="station-name" /></div>
          <div><Label>Vil</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5" data-testid="station-city" /></div>
          <div><Label>Zòn (opsyonèl)</Label><Input value={area} onChange={(e) => setArea(e.target.value)} className="mt-1.5" data-testid="station-area" /></div>
        </div>
        <Button onClick={create} disabled={saving} data-testid="station-create-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kreye Stasyon"}</Button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">Pa gen stasyon ankò.</div>}
        {items.map((s) => (
          <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`station-${s.id}`}>
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.city}{s.area ? `, ${s.area}` : ""} · {s.status}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => toggle(s)} data-testid={`station-toggle-${s.id}`}>
              {s.status === "active" ? "Dezaktive" : "Aktive"}
            </Button>
          </div>
        ))}
      </div>
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

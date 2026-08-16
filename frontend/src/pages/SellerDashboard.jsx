import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Package, DollarSign, FileText, Eye, Heart, MessageSquare, Plus, Pencil, Trash2, CheckCircle, RotateCcw, ShieldCheck, Loader2, Star } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SellerDashboard() {
  const { user, fetchMe } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const [dash, setDash] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([api.get("/seller/dashboard"), api.get("/my-products")]);
      setDash(d.data);
      setProducts(p.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !dash) return <FullLoader />;
  const st = dash.stats;

  const setTab = (t) => { const p = new URLSearchParams(params); p.set("tab", t); setParams(p); };

  const productAction = async (fn, msg) => {
    try { await fn(); toast.success(msg); load(); } catch (e) { toast.error(apiError(e)); }
  };

  const STATS = [
    { label: "Active Listings", value: st.active, icon: Package, color: "text-primary bg-primary/10" },
    { label: "Vann", value: st.sold, icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { label: "Drafts", value: st.drafts, icon: FileText, color: "text-amber-600 bg-amber-50" },
    { label: "Views", value: st.views, icon: Eye, color: "text-violet-600 bg-violet-50" },
    { label: "Favorites", value: st.favorites, icon: Heart, color: "text-rose-600 bg-rose-50" },
    { label: "Mesaj", value: st.messages, icon: MessageSquare, color: "text-blue-600 bg-blue-50" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">Tablo Vandè {dash.profile?.seller_verified && <ShieldCheck className="w-5 h-5 text-primary" />}</h1>
          <p className="text-sm text-muted-foreground">Byenveni @{user?.username}</p>
        </div>
        <Button onClick={() => nav("/sell")} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" data-testid="dash-add-product"><Plus className="w-4 h-4 mr-1" />Vann yon pwodwi</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">Pwodwi mwen</TabsTrigger>
          <TabsTrigger value="verification" data-testid="tab-verification">Verifikasyon</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Paramèt</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></span>
                <div className="font-display text-2xl font-800 mt-2" style={{ fontWeight: 800 }} data-testid={`stat-${s.label}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          {dash.profile?.review_count > 0 && (
            <div className="mt-4 bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Star className="w-5 h-5 fill-secondary text-secondary" />
              <span className="font-semibold">{dash.profile.rating}</span>
              <span className="text-sm text-muted-foreground">nan {dash.profile.review_count} avi</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products">
          <ProductsTab products={products} nav={nav} action={productAction} />
        </TabsContent>

        <TabsContent value="verification">
          <VerificationTab profile={dash.profile} user={user} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab profile={dash.profile} user={user} onSaved={() => { load(); fetchMe(); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsTab({ products, nav, action }) {
  if (products.length === 0)
    return <div className="text-center py-16 text-muted-foreground">Ou poko gen pwodwi. <Link to="/sell" className="text-primary font-semibold">Vann premye w la</Link>.</div>;
  const badge = { active: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", draft: "bg-slate-100 text-slate-600", sold: "bg-rose-100 text-rose-700", rejected: "bg-red-100 text-red-700" };
  return (
    <div className="space-y-3">
      {products.map((p) => (
        <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`my-product-${p.id}`}>
          <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
            {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link to={`/product/${p.slug}`} className="font-semibold truncate hover:text-primary">{p.title}</Link>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge[p.status]}`}>{p.status}</span>
            </div>
            <div className="text-sm text-primary font-bold">{formatPrice(p.price, p.currency)}</div>
            <div className="text-xs text-muted-foreground flex gap-3 mt-0.5"><span><Eye className="w-3 h-3 inline" /> {p.views}</span><span><Heart className="w-3 h-3 inline" /> {p.favorites_count}</span></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
            {p.status !== "sold" && <Button size="sm" variant="outline" onClick={() => nav(`/edit-product/${p.id}`)} data-testid={`edit-${p.id}`}><Pencil className="w-3.5 h-3.5" /></Button>}
            {p.status === "active" && <Button size="sm" variant="outline" onClick={() => action(() => api.post(`/products/${p.id}/mark-sold`), "Make kòm vann")} data-testid={`sold-${p.id}`}><CheckCircle className="w-3.5 h-3.5" /></Button>}
            {p.status === "sold" && <Button size="sm" variant="outline" onClick={() => action(() => api.post(`/products/${p.id}/restore`), "Restore")} data-testid={`restore-${p.id}`}><RotateCcw className="w-3.5 h-3.5" /></Button>}
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-destructive" data-testid={`delete-${p.id}`}><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Efase pwodwi sa?</AlertDialogTitle><AlertDialogDescription>Aksyon sa pa ka defèt.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Anile</AlertDialogCancel><AlertDialogAction onClick={() => action(() => api.delete(`/products/${p.id}`), "Efase")} className="bg-destructive">Efase</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}

function VerificationTab({ profile, user }) {
  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const { fetchMe } = useAuth();

  const request = async () => {
    setLoading(true);
    try { const { data } = await api.post("/seller/verify-request"); toast.success(data.message); } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };
  const verifyPhone = async () => {
    setPhoneLoading(true);
    try { await api.post("/auth/verify-phone"); await fetchMe(); toast.success("Telefòn verifye!"); } catch (e) { toast.error(apiError(e)); } finally { setPhoneLoading(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display font-bold mb-3">Badges ou</h3>
        <div className="space-y-2 text-sm">
          <BadgeRow ok={user?.email_verified} label="Email Verified" />
          <BadgeRow ok={user?.phone_verified} label="Phone Verified" action={!user?.phone_verified && <Button size="sm" onClick={verifyPhone} disabled={phoneLoading} data-testid="verify-phone-btn">{phoneLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verifye"}</Button>} />
          <BadgeRow ok={profile?.seller_verified} label="Seller Verified" />
        </div>
      </div>
      {!profile?.seller_verified && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-bold mb-1">Vandè Verifye</h3>
          <p className="text-sm text-muted-foreground mb-4">Mande verifikasyon pou jwenn badge "Vandè Verifye" la epi ogmante konfyans achtè yo.</p>
          <Button onClick={request} disabled={loading} data-testid="request-verification-btn" className="bg-primary">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mande verifikasyon"}</Button>
        </div>
      )}
    </div>
  );
}

function BadgeRow({ ok, label, action }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2"><ShieldCheck className={`w-4 h-4 ${ok ? "text-emerald-500" : "text-muted-foreground/40"}`} />{label}</span>
      {ok ? <span className="text-xs text-emerald-600 font-semibold">✓ Verifye</span> : action || <span className="text-xs text-muted-foreground">Poko</span>}
    </div>
  );
}

function SettingsTab({ profile, user, onSaved }) {
  const [f, setF] = useState({
    store_name: profile?.store_name || "", store_description: profile?.store_description || "", bio: profile?.bio || "",
    whatsapp_enabled: profile?.whatsapp_enabled ?? true, whatsapp_number: profile?.whatsapp_number || "",
    show_phone: profile?.show_phone ?? true, show_location: profile?.show_location ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try { await api.put("/seller/settings", f); toast.success("Anrejistre!"); onSaved && onSaved(); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg bg-card border border-border rounded-xl p-5 space-y-4">
      <div><Label>Non magazen (opsyonèl)</Label><Input value={f.store_name} onChange={(e) => set("store_name", e.target.value)} data-testid="setting-store-name" className="mt-1.5 h-11" placeholder="Peter Tech Store" /></div>
      <div><Label>Deskripsyon magazen</Label><Textarea value={f.store_description} onChange={(e) => set("store_description", e.target.value)} data-testid="setting-store-desc" className="mt-1.5" /></div>
      <div className="flex items-center justify-between"><Label>Aktive WhatsApp</Label><Switch checked={f.whatsapp_enabled} onCheckedChange={(v) => set("whatsapp_enabled", v)} data-testid="setting-whatsapp-toggle" /></div>
      {f.whatsapp_enabled && <div><Label>Nimewo WhatsApp</Label><Input value={f.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} data-testid="setting-whatsapp-number" className="mt-1.5 h-11" placeholder="+509..." /></div>}
      <div className="flex items-center justify-between"><Label>Montre telefòn piblikman</Label><Switch checked={f.show_phone} onCheckedChange={(v) => set("show_phone", v)} data-testid="setting-show-phone" /></div>
      <div className="flex items-center justify-between"><Label>Montre lokasyon</Label><Switch checked={f.show_location} onCheckedChange={(v) => set("show_location", v)} data-testid="setting-show-location" /></div>
      <Button onClick={save} disabled={saving} data-testid="save-settings-btn" className="bg-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Anrejistre"}</Button>
    </div>
  );
}

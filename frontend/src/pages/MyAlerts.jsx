import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Loader2 } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function MyAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/alerts"); setAlerts(data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id) => {
    try { await api.put(`/alerts/${id}/toggle`); load(); } catch (e) { toast.error(apiError(e)); }
  };
  const del = async (id) => {
    try { await api.delete(`/alerts/${id}`); toast.success("Alèt efase."); load(); } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6 text-primary" />Alèt Mwen</h1>
          <p className="text-sm text-muted-foreground mt-1">Resevwa notifikasyon lè yon pwodwi ki matche parèt.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" data-testid="new-alert-btn"><Plus className="w-4 h-4 mr-1" />Nouvo Alèt</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Kreye yon Alèt</DialogTitle></DialogHeader>
            <AlertForm onDone={() => { setOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Ou pa gen okenn alèt. Kreye youn pou pa rate pwodwi ou ap chèche a.</div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3" data-testid={`alert-${a.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  {a.keyword && <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">"{a.keyword}"</span>}
                  {a.category && <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">{a.category}</span>}
                  {a.department && <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">{a.city ? `${a.city}, ` : ""}{a.department}</span>}
                  {a.max_price && <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">≤ {formatPrice(a.max_price)}</span>}
                </div>
              </div>
              <Switch checked={a.active} onCheckedChange={() => toggle(a.id)} data-testid={`alert-toggle-${a.id}`} />
              <button onClick={() => del(a.id)} className="text-muted-foreground hover:text-destructive p-1" data-testid={`alert-delete-${a.id}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertForm({ onDone }) {
  const { categories, locations } = useApp();
  const [f, setF] = useState({ keyword: "", category: "", subcategory: "", department: "", city: "", max_price: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const dep = locations.find((d) => d.name === f.department);
  const cat = categories.find((c) => c.type === f.category);

  const submit = async () => {
    if (!f.keyword.trim() && !f.category && !f.department && !f.max_price) {
      return toast.error("Mete omwen yon kritè.");
    }
    setSaving(true);
    try {
      await api.post("/alerts", {
        keyword: f.keyword || null, category: f.category || null, subcategory: f.subcategory || null,
        department: f.department || null, city: f.city || null,
        max_price: f.max_price ? Number(f.max_price) : null,
      });
      toast.success("Alèt kreye!"); onDone();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div><Label>Mo kle (opsyonèl)</Label><Input value={f.keyword} onChange={(e) => set("keyword", e.target.value)} data-testid="alert-keyword" className="mt-1.5 h-11" placeholder="iPhone 13" /></div>
      <div>
        <Label>Kategori (opsyonèl)</Label>
        <Select value={f.category} onValueChange={(v) => { set("category", v); set("subcategory", ""); }}>
          <SelectTrigger className="mt-1.5 h-11" data-testid="alert-category"><SelectValue placeholder="Nenpòt" /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.type}>{c.name_ht}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {cat?.subcategories?.length > 0 && (
        <div>
          <Label>Sou-kategori (opsyonèl)</Label>
          <Select value={f.subcategory} onValueChange={(v) => set("subcategory", v)}>
            <SelectTrigger className="mt-1.5 h-11" data-testid="alert-subcategory"><SelectValue placeholder="Nenpòt" /></SelectTrigger>
            <SelectContent>{cat.subcategories.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Depatman (opsyonèl)</Label>
          <Select value={f.department} onValueChange={(v) => { set("department", v); set("city", ""); }}>
            <SelectTrigger className="mt-1.5 h-11" data-testid="alert-department"><SelectValue placeholder="Nenpòt" /></SelectTrigger>
            <SelectContent>{locations.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Vil (opsyonèl)</Label>
          <Select value={f.city} onValueChange={(v) => set("city", v)} disabled={!dep}>
            <SelectTrigger className="mt-1.5 h-11" data-testid="alert-city"><SelectValue placeholder="Nenpòt" /></SelectTrigger>
            <SelectContent>{dep?.cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Pri maksimòm (opsyonèl)</Label><Input type="number" value={f.max_price} onChange={(e) => set("max_price", e.target.value)} data-testid="alert-max-price" className="mt-1.5 h-11" placeholder="25000" /></div>
      <Button onClick={submit} disabled={saving} data-testid="save-alert-btn" className="w-full bg-primary font-semibold">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kreye Alèt la"}
      </Button>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Loader2, Upload, X, Star, ImagePlus } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCatName } from "@/i18n";
import { compressImage } from "@/lib/format";
import { getSpecSchema, CONDITIONS } from "@/lib/specSchemas";
import BecomeSeller from "@/components/BecomeSeller";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddProduct() {
  const { id } = useParams();
  const editing = !!id;
  const { categories, locations, lang } = useApp();
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(editing ? 2 : 1);
  const [cat, setCat] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(editing);
  const [f, setF] = useState({
    title: "", description: "", price: "", quantity: 1, condition: "Used",
    subcategory: "", department: user?.department || "", city: user?.city || "", neighborhood: "",
    imei: "", images: [], main_image_index: 0, specs: {},
  });

  useEffect(() => {
    if (editing) {
      (async () => {
        try {
          const { data } = await api.get(`/products/${id}`);
          const p = data.product;
          const c = categories.find((x) => x.type === p.category);
          setCat(c);
          setF({
            title: p.title, description: p.description, price: String(p.price), quantity: p.quantity,
            condition: p.condition, subcategory: p.subcategory || "", department: p.department, city: p.city,
            neighborhood: p.neighborhood || "", imei: p.imei || "", images: p.images || [],
            main_image_index: p.main_image_index || 0, specs: p.specs || {},
          });
        } catch (e) { toast.error(apiError(e)); nav("/dashboard"); } finally { setLoadingEdit(false); }
      })();
    }
  }, [editing, id, categories, nav]);

  if (user === null) return <FullLoader />;
  if (user && !user.is_seller) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <BecomeSeller onDone={() => nav("/sell")} />
      </div>
    );
  }
  if (loadingEdit) return <FullLoader />;

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setSpec = (k, v) => setF((s) => ({ ...s, specs: { ...s.specs, [k]: v } }));
  const dep = locations.find((d) => d.name === f.department);
  const schema = cat ? getSpecSchema(cat.type, f.subcategory) : [];

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    const room = 10 - f.images.length;
    if (files.length > room) toast.info(`Maksimòm 10 foto. ${room} espas rete.`);
    const toAdd = files.slice(0, room);
    try {
      const compressed = await Promise.all(toAdd.map((file) => compressImage(file)));
      set("images", [...f.images, ...compressed]);
    } catch { toast.error("Erè pandan chajman foto."); }
    e.target.value = "";
  };

  const removeImg = (i) => {
    const imgs = f.images.filter((_, idx) => idx !== i);
    set("images", imgs);
    if (f.main_image_index >= imgs.length) set("main_image_index", 0);
  };

  const save = async (status) => {
    if (!f.title.trim()) return toast.error("Antre yon tit.");
    if (!f.price || Number(f.price) <= 0) return toast.error("Antre yon pri valab.");
    if (!f.department || !f.city) return toast.error("Chwazi lokasyon.");
    if ((cat.type === "phone" || cat.type === "laptop") && !f.subcategory) return toast.error("Chwazi mak aparèy la.");
    setSaving(true);
    const payload = {
      category: cat.type, subcategory: f.subcategory || null, title: f.title, description: f.description,
      price: Number(f.price), quantity: Number(f.quantity) || 1, condition: f.condition,
      department: f.department, city: f.city, neighborhood: f.neighborhood, specs: f.specs,
      images: f.images, main_image_index: f.main_image_index, imei: f.imei, status,
    };
    try {
      if (editing) {
        await api.put(`/products/${id}`, payload);
        toast.success("Pwodwi modifye!");
      } else {
        await api.post("/products", payload);
        toast.success(status === "draft" ? "Draft anrejistre!" : "Pwodwi pibliye!");
      }
      nav("/dashboard?tab=products");
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  // Step 1: category select
  if (step === 1) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold mb-1">Vann yon pwodwi</h1>
        <p className="text-muted-foreground mb-8">Chwazi yon kategori pou kòmanse.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((c) => {
            const pn = c.icon?.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());
            const Ico = Icons[pn] || Icons.Tag;
            return (
              <button key={c.id} onClick={() => { setCat(c); setStep(2); }} data-testid={`sell-cat-${c.type}`}
                className="group flex items-center gap-4 bg-card border border-border rounded-xl p-5 text-left hover:border-primary hover:shadow-md transition-all">
                <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors"><Ico className="w-6 h-6" /></span>
                <div>
                  <div className="font-semibold">{getCatName(c, lang)}</div>
                  <div className="text-xs text-muted-foreground">{c.subcategories.length} sou-kategori</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{editing ? "Modifye pwodwi" : `Vann — ${getCatName(cat, lang)}`}</h1>
          {!editing && <button onClick={() => setStep(1)} className="text-sm text-primary hover:underline">Chanje kategori</button>}
        </div>
      </div>

      <div className="space-y-6">
        {/* Images */}
        <Section title="Foto (jiska 10)">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {f.images.map((im, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                <img src={im} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImg(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center" data-testid={`remove-img-${i}`}><X className="w-3.5 h-3.5" /></button>
                <button onClick={() => set("main_image_index", i)} className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 ${f.main_image_index === i ? "bg-secondary text-black" : "bg-black/60 text-white"}`}>
                  <Star className="w-2.5 h-2.5" />{f.main_image_index === i ? "Prensipal" : "Set"}
                </button>
              </div>
            ))}
            {f.images.length < 10 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary text-muted-foreground" data-testid="upload-images">
                <ImagePlus className="w-6 h-6" />
                <span className="text-[10px] mt-1">Ajoute</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onFiles} />
              </label>
            )}
          </div>
        </Section>

        <Section title="Enfòmasyon Debaz">
          <div className="space-y-4">
            <div>
              <Label>Tit</Label>
              <Input value={f.title} onChange={(e) => set("title", e.target.value)} data-testid="product-title-input" className="mt-1.5 h-11" placeholder="iPhone 13 Pro Max 256GB" />
            </div>
            {cat.subcategories.length > 0 && cat.type !== "phone" && cat.type !== "laptop" && (
              <div>
                <Label>Sou-kategori</Label>
                <Select value={f.subcategory} onValueChange={(v) => set("subcategory", v)}>
                  <SelectTrigger className="mt-1.5 h-11" data-testid="product-subcategory"><SelectValue placeholder="Chwazi" /></SelectTrigger>
                  <SelectContent>{cat.subcategories.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pri (HTG)</Label>
                <Input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} data-testid="product-price-input" className="mt-1.5 h-11" placeholder="250000" />
              </div>
              <div>
                <Label>Kantite</Label>
                <Input type="number" min="1" value={f.quantity} onChange={(e) => set("quantity", e.target.value)} data-testid="product-quantity" className="mt-1.5 h-11" />
              </div>
            </div>
            <div>
              <Label>Kondisyon</Label>
              <Select value={f.condition} onValueChange={(v) => set("condition", v)}>
                <SelectTrigger className="mt-1.5 h-11" data-testid="product-condition"><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Deskripsyon</Label>
              <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} data-testid="product-description" className="mt-1.5" rows={4} placeholder="Dekri pwodwi a..." />
            </div>
          </div>
        </Section>

        {(cat.type === "phone" || cat.type === "laptop") && (
          <Section title="Mak">
            <div>
              <Label>Chwazi Mak {cat.type === "phone" ? "Telefòn" : "Laptop"} lan</Label>
              <Select value={f.subcategory} onValueChange={(v) => set("subcategory", v)}>
                <SelectTrigger className="mt-1.5 h-11" data-testid="product-subcategory"><SelectValue placeholder="Chwazi mak" /></SelectTrigger>
                <SelectContent>{cat.subcategories.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {!f.subcategory && <p className="text-xs text-muted-foreground mt-1.5">Chwazi yon mak pou wè rès chan yo.</p>}
            </div>
          </Section>
        )}

        {schema.length > 0 && (
          <Section title="Karakteristik">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {schema.map((fld) => (
                <div key={fld.key}>
                  <Label>{fld.label}</Label>
                  {fld.type === "select" ? (
                    <Select value={f.specs[fld.key] || ""} onValueChange={(v) => setSpec(fld.key, v)}>
                      <SelectTrigger className="mt-1.5 h-11" data-testid={`spec-${fld.key}`}><SelectValue placeholder="Chwazi" /></SelectTrigger>
                      <SelectContent>{fld.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={f.specs[fld.key] || ""} onChange={(e) => setSpec(fld.key, e.target.value)} placeholder={fld.placeholder} data-testid={`spec-${fld.key}`} className="mt-1.5 h-11" />
                  )}
                </div>
              ))}
            </div>
            {cat.type === "phone" && (
              <div className="mt-4">
                <Label>IMEI (prive — admin sèlman wè l)</Label>
                <Input value={f.imei} onChange={(e) => set("imei", e.target.value)} data-testid="product-imei" className="mt-1.5 h-11" placeholder="35xxxxxxxxxxxxx" />
                <p className="text-xs text-muted-foreground mt-1">IMEI pa janm montre piblikman.</p>
              </div>
            )}
          </Section>
        )}

        <Section title="Lokasyon">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Depatman</Label>
              <Select value={f.department} onValueChange={(v) => { set("department", v); set("city", ""); }}>
                <SelectTrigger className="mt-1.5 h-11" data-testid="product-department"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{locations.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vil / Komin</Label>
              <Select value={f.city} onValueChange={(v) => set("city", v)} disabled={!dep}>
                <SelectTrigger className="mt-1.5 h-11" data-testid="product-city"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{dep?.cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Katye</Label>
              <Input value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} data-testid="product-neighborhood" className="mt-1.5 h-11" />
            </div>
          </div>
        </Section>

        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <Button onClick={() => save("active")} disabled={saving} data-testid="publish-btn" className="flex-1 h-12 bg-primary font-semibold text-base">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Anrejistre chanjman" : "Pibliye pwodwi"}
          </Button>
          {!editing && (
            <Button onClick={() => save("draft")} disabled={saving} variant="outline" data-testid="draft-btn" className="h-12 font-semibold">Anrejistre kòm Draft</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
      <h2 className="font-display text-lg font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

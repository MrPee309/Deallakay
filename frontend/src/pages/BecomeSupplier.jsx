import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

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

export default function BecomeSupplier() {
  const nav = useNavigate();
  const [f, setF] = useState({
    company_name: "", short_description: "", full_description: "", country: "", state_province: "", city: "",
    website: "", supplier_types: [], categories: [], brands: "", years_in_business: "",
    wholesale_available: false, moq_info: "", ships_to_haiti: false, ships_internationally: false,
    contact_email: "", contact_phone: "", show_contact_publicly: false, accept_supplier_terms: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleType = (t) => setF((s) => ({ ...s, supplier_types: s.supplier_types.includes(t) ? s.supplier_types.filter((x) => x !== t) : [...s.supplier_types, t] }));
  const toggleCat = (c) => setF((s) => ({ ...s, categories: s.categories.includes(c) ? s.categories.filter((x) => x !== c) : [...s.categories, c] }));

  const submit = async () => {
    if (!f.company_name.trim()) return toast.error("Antre non konpayi a.");
    if (!f.country.trim()) return toast.error("Antre peyi a.");
    if (f.country.trim().toLowerCase() === "ayiti" || f.country.trim().toLowerCase() === "haiti") return toast.error("Founisè yo dwe lòtbò — pa Ayiti.");
    if (!f.contact_phone.trim()) return toast.error("Nimewo telefòn entènasyonal obligatwa.");
    if (!f.contact_phone.trim().startsWith("+")) return toast.error("Antre nimewo a ak kòd peyi a (egzanp +1...).");
    if (!f.accept_supplier_terms) return toast.error("Ou dwe aksepte Kondisyon Founisè yo.");
    setSaving(true);
    try {
      const { data } = await api.post("/suppliers", {
        ...f, brands: f.brands.split(",").map((b) => b.trim()).filter(Boolean),
        years_in_business: f.years_in_business ? Number(f.years_in_business) : null,
      });
      toast.success("Founisè ajoute!");
      nav(`/suppliers/${data.id}`);
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center mb-4"><Building2 className="w-7 h-7 text-primary" /></div>
      <h1 className="font-display text-2xl font-bold">Ajoute yon Founisè</h1>
      <p className="text-muted-foreground mt-1 mb-6">Kreye yon pwofil pou yon founisè entènasyonal — pou teknisyen ak vandè ka jwenn li e achte an gwo.</p>

      <div className="space-y-4">
        <div><Label>Non Konpayi<span className="text-red-500 ml-0.5">*</span></Label><Input value={f.company_name} onChange={(e) => set("company_name", e.target.value)} data-testid="supplier-name" className="mt-1.5 h-11" /></div>
        <div><Label>Ti Deskripsyon</Label><Input value={f.short_description} onChange={(e) => set("short_description", e.target.value)} data-testid="supplier-short-desc" className="mt-1.5 h-11" placeholder="Yon fraz kout" /></div>
        <div><Label>Deskripsyon Konplè</Label><Textarea value={f.full_description} onChange={(e) => set("full_description", e.target.value)} data-testid="supplier-full-desc" className="mt-1.5" rows={4} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Peyi<span className="text-red-500 ml-0.5">*</span></Label><Input value={f.country} onChange={(e) => set("country", e.target.value)} data-testid="supplier-country" className="mt-1.5 h-11" placeholder="USA" /></div>
          <div><Label>Vil</Label><Input value={f.city} onChange={(e) => set("city", e.target.value)} data-testid="supplier-city" className="mt-1.5 h-11" /></div>
        </div>
        <div><Label>Sit Wèb</Label><Input value={f.website} onChange={(e) => set("website", e.target.value)} data-testid="supplier-website" className="mt-1.5 h-11" placeholder="https://..." /></div>

        <div>
          <Label>Tip Founisè</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SUPPLIER_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => toggleType(t)} data-testid={`supplier-type-${t}`}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${f.supplier_types.includes(t) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>{t}</button>
            ))}
          </div>
        </div>

        <div>
          <Label>Kategori</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {CATEGORIES.map((c) => (
              <button key={c.value} type="button" onClick={() => toggleCat(c.value)} data-testid={`supplier-category-${c.value}`}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${f.categories.includes(c.value) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>{c.label}</button>
            ))}
          </div>
        </div>

        <div><Label>Mak (separe ak vigil)</Label><Input value={f.brands} onChange={(e) => set("brands", e.target.value)} data-testid="supplier-brands" className="mt-1.5 h-11" placeholder="Apple, Samsung, HP" /></div>
        <div><Label>Ane nan Biznis</Label><Input type="number" value={f.years_in_business} onChange={(e) => set("years_in_business", e.target.value)} data-testid="supplier-years" className="mt-1.5 h-11" /></div>
        <div><Label>Enfòmasyon MOQ (kantite minimòm)</Label><Input value={f.moq_info} onChange={(e) => set("moq_info", e.target.value)} data-testid="supplier-moq" className="mt-1.5 h-11" /></div>

        <div className="flex items-center justify-between"><Label>Vann an gwo (wholesale)</Label><Switch checked={f.wholesale_available} onCheckedChange={(v) => set("wholesale_available", v)} data-testid="supplier-wholesale" /></div>
        <div className="flex items-center justify-between"><Label>Livre nan Ayiti</Label><Switch checked={f.ships_to_haiti} onCheckedChange={(v) => set("ships_to_haiti", v)} data-testid="supplier-ships-haiti" /></div>
        <div className="flex items-center justify-between"><Label>Livre entènasyonalman</Label><Switch checked={f.ships_internationally} onCheckedChange={(v) => set("ships_internationally", v)} data-testid="supplier-ships-intl" /></div>

        <div className="border-t border-border pt-4">
          <div><Label>Email Kontak</Label><Input value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} data-testid="supplier-email" className="mt-1.5 h-11" /></div>
          <div className="mt-3"><Label>Telefòn Kontak (entènasyonal)<span className="text-red-500 ml-0.5">*</span></Label><Input value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} data-testid="supplier-phone" className="mt-1.5 h-11" placeholder="+1 305 555 0123" /></div>
          <div className="flex items-center justify-between mt-3">
            <Label>Montre kontak piblikman</Label>
            <Switch checked={f.show_contact_publicly} onCheckedChange={(v) => set("show_contact_publicly", v)} data-testid="supplier-show-contact" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Si dezaktive, moun ap dwe kontakte w atravè sistèm "Demann" DealLakay la.</p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={f.accept_supplier_terms} onCheckedChange={(v) => set("accept_supplier_terms", !!v)} data-testid="supplier-terms" className="mt-0.5" />
          <span className="text-sm">Mwen aksepte <b>Kondisyon Founisè</b> DealLakay yo.</span>
        </label>

        <Button onClick={submit} disabled={saving} data-testid="submit-supplier-btn" className="w-full h-11 bg-primary font-semibold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kreye Pwofil Founisè"}
        </Button>
      </div>
    </div>
  );
}

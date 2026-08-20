import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ImagePlus, X, Loader2, HelpCircle } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { compressImage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PostRequest() {
  const nav = useNavigate();
  const { categories, locations } = useApp();
  const [f, setF] = useState({ title: "", description: "", category: "", department: "", city: "", images: [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const dep = locations.find((d) => d.name === f.department);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    const room = 6 - f.images.length;
    if (files.length > room) toast.info(`Maksimòm 6 foto. ${room} espas rete.`);
    try {
      const compressed = await Promise.all(files.slice(0, room).map((file) => compressImage(file)));
      set("images", [...f.images, ...compressed]);
    } catch { toast.error("Erè pandan chajman foto."); }
    e.target.value = "";
  };
  const removeImg = (i) => set("images", f.images.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!f.title.trim()) return toast.error("Antre yon tit.");
    if (!f.department || !f.city) return toast.error("Chwazi lokasyon ou.");
    setSaving(true);
    try {
      const { data } = await api.post("/requests", f);
      toast.success("Demann ou poste!");
      nav(`/requests/${data.id}`);
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-4 flex gap-3 mb-6">
        <HelpCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">Pa jwenn pyès oswa aparèy ou bezwen an sou sit la? Dekri sa w bezwen an, epi vandè ak teknisyen yo ap ka voye w yon òf.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Tit<span className="text-red-500 ml-0.5">*</span></Label>
          <Input value={f.title} onChange={(e) => set("title", e.target.value)} data-testid="request-title" className="mt-1.5 h-11" placeholder="Ekran iPhone 12 Pro Max" />
        </div>
        <div>
          <Label>Deskripsyon</Label>
          <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} data-testid="request-description" className="mt-1.5" rows={4} placeholder="Bay plis detay: koulè, kondisyon, poukisa ou bezwen l..." />
        </div>
        <div>
          <Label>Kategori (opsyonèl)</Label>
          <Select value={f.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger className="mt-1.5 h-11" data-testid="request-category"><SelectValue placeholder="Chwazi" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.type}>{c.name_ht}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Depatman<span className="text-red-500 ml-0.5">*</span></Label>
            <Select value={f.department} onValueChange={(v) => { set("department", v); set("city", ""); }}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="request-department"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{locations.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vil<span className="text-red-500 ml-0.5">*</span></Label>
            <Select value={f.city} onValueChange={(v) => set("city", v)} disabled={!dep}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="request-city"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{dep?.cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Foto (opsyonèl)</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {f.images.map((im, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                <img src={im} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImg(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center" data-testid={`remove-request-img-${i}`}><X className="w-3 h-3" /></button>
              </div>
            ))}
            {f.images.length < 6 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary text-muted-foreground" data-testid="upload-request-images">
                <ImagePlus className="w-5 h-5" />
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onFiles} />
              </label>
            )}
          </div>
        </div>
        <Button onClick={submit} disabled={saving} data-testid="submit-request-btn" className="w-full h-11 bg-primary font-semibold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Poste Demann lan"}
        </Button>
      </div>
    </div>
  );
}

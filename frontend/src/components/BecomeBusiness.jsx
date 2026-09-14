import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Store, Loader2, CheckCircle2, ShieldCheck, Hotel, UtensilsCrossed, Wrench, Pill, Camera, Scissors, Building2, ShoppingBag, GraduationCap, MoreHorizontal, LocateFixed } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BUSINESS_TYPE_ICONS = {
  "Otèl": Hotel,
  "Restoran": UtensilsCrossed,
  "Garaj / Mekanisyen": Wrench,
  "Famasi": Pill,
  "Estidyo": Camera,
  "Salon Bòte": Scissors,
  "Sant Sèvis": Building2,
  "Magazen": ShoppingBag,
  "Lekòl": GraduationCap,
  "Lòt": MoreHorizontal,
};

const BUSINESS_RULES = [
  "Bay enfòmasyon egzat sou biznis ou (kote, sèvis, telefòn).",
  "Reponn kliyan yo ak respè, menm si w pa ka ede yo.",
  "Pa itilize biznis lokal la pou fè bagay ki kont règleman DealLakay.",
];

export default function BecomeBusiness({ onDone }) {
  const { user, fetchMe } = useAuth();
  const { locations } = useApp();
  const [businessTypes, setBusinessTypes] = useState([]);
  const [businessType, setBusinessType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Navigatè ou pa sipòte lokalizasyon.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); toast.success("Pozisyon jwenn!"); },
      () => { setLocating(false); toast.error("Nou pa t ka jwenn pozisyon ou. Otorize aksè lokalizasyon nan navigatè a."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    api.get("/business-types").then(({ data }) => setBusinessTypes(data)).catch(() => {});
  }, []);

  const citiesForDepartment = locations.find((d) => d.name === department)?.cities || [];

  const submit = async () => {
    if (!terms) return toast.error("Aksepte règ yo.");
    if (!businessType) return toast.error("Chwazi tip biznis la.");
    if (!businessName.trim()) return toast.error("Antre non biznis la.");
    if (!department || !city) return toast.error("Chwazi Depatman ak Vil.");
    setLoading(true);
    try {
      await api.post("/businesses/become", {
        accept_business_terms: terms,
        business_type: businessType,
        business_name: businessName.trim(),
        description,
        phone,
        department,
        city,
        area,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      await fetchMe();
      toast.success("Demann Biznis Lokal ou voye! Li an atant apwobasyon admin.");
      onDone && onDone();
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="w-14 h-14 rounded-2xl bg-secondary/20 text-secondary-foreground flex items-center justify-center mb-4">
          <Store className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Anrejistre Biznis Lokal Ou</h1>
        <p className="text-muted-foreground mt-1">Fè kliyan jwenn biznis ou sou DealLakay — Otèl, Restoran, Garaj, Famasi, e plis.</p>

        <div className="mt-5 space-y-2">
          <Req ok={user?.email_verified} label="Email verifye" />
        </div>

        <div className="mt-5">
          <Label>Ki tip biznis?</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {businessTypes.map((t) => {
              const Icon = BUSINESS_TYPE_ICONS[t] || Store;
              const active = businessType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBusinessType(t)}
                  data-testid={`business-type-${t}`}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-colors ${active ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}
                >
                  <Icon className="w-5 h-5" />
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <Label>Non Biznis la</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1.5 h-11" placeholder="egzanp: Otèl Bèl Vi" data-testid="business-name" />
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Depatman</Label>
            <Select value={department} onValueChange={(v) => { setDepartment(v); setCity(""); }}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="business-department"><SelectValue placeholder="Chwazi..." /></SelectTrigger>
              <SelectContent>{locations.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vil</Label>
            <Select value={city} onValueChange={setCity} disabled={!department}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="business-city"><SelectValue placeholder="Chwazi..." /></SelectTrigger>
              <SelectContent>{citiesForDepartment.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Zòn (opsyonèl)</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} className="mt-1.5 h-11" placeholder="egzanp: Bòkòl" data-testid="business-area" />
          </div>
        </div>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          data-testid="business-use-location"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50"
        >
          <LocateFixed className="w-4 h-4" />
          {locating ? "N ap chèche pozisyon w..." : coords ? "Pozisyon egzat jwenn ✓" : "Itilize pozisyon egzat mwen (GPS)"}
        </button>

        <div className="mt-5">
          <Label>Telefòn</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 h-11" placeholder="egzanp: 3712-3456" data-testid="business-phone" />
        </div>

        <div className="mt-5">
          <Label>Deskripsyon (opsyonèl)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={3} placeholder="Dekri biznis ou, sèvis ou ofri..." data-testid="business-description" />
        </div>

        <div className="mt-6 bg-muted/50 rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" />Règ Biznis Lokal</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            {BUSINESS_RULES.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        <label className="flex items-start gap-2 cursor-pointer mt-5">
          <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} data-testid="business-terms" className="mt-0.5" />
          <span className="text-sm">Mwen aksepte <b>Règ Biznis Lokal</b> yo.</span>
        </label>

        <Button onClick={submit} disabled={loading || !user?.email_verified} data-testid="become-business-submit" className="w-full h-11 mt-6 bg-primary font-semibold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Voye Demann Biznis Lokal"}
        </Button>
        {!user?.email_verified && <p className="text-xs text-destructive mt-2 text-center">Verifye email ou anvan.</p>}
      </div>
    </div>
  );
}

function Req({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className={`w-4 h-4 ${ok ? "text-emerald-500" : "text-muted-foreground/40"}`} />
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

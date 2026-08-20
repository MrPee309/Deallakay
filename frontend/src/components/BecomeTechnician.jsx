import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wrench, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Disponib" },
  { value: "busy", label: "Okipe" },
  { value: "offline", label: "Offline" },
  { value: "by_appointment", label: "Sou Randevou" },
];

const TECHNICIAN_RULES = [
  "Bay estimasyon reyalis pou pri ak dire reparasyon.",
  "Pa pran aparèy yon kliyan san yon antant klè.",
  "Repare ak menm pyès kalite ou pwomèt kliyan an.",
  "Reponn kliyan yo ak respè.",
];

export default function BecomeTechnician({ onDone }) {
  const { user, fetchMe } = useAuth();
  const { locations } = useApp();
  const [specialties, setSpecialties] = useState([]);
  const [allSpecialties, setAllSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [availability, setAvailability] = useState("available");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/technician-specialties").then(({ data }) => setAllSpecialties(data)).catch(() => {});
  }, []);

  const toggleSpecialty = (s) => setSpecialties((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  const toggleDepartment = (d) => setDepartments((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);

  const submit = async () => {
    if (!terms) return toast.error("Aksepte règ yo.");
    if (specialties.length === 0) return toast.error("Chwazi omwen yon espesyalite.");
    if (departments.length === 0) return toast.error("Chwazi omwen yon depatman kote ou sèvi.");
    setLoading(true);
    try {
      await api.post("/technician/become", {
        accept_technician_terms: terms, specialties, service_departments: departments, bio,
        languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
        availability,
      });
      await fetchMe();
      toast.success("Ou se yon teknisyen kounye a!");
      onDone && onDone();
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="w-14 h-14 rounded-2xl bg-secondary/20 text-secondary-foreground flex items-center justify-center mb-4">
          <Wrench className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Devni yon Teknisyen</h1>
        <p className="text-muted-foreground mt-1">Fè kliyan ka jwenn ou pou reparasyon. Ranpli enfòmasyon yo epi kòmanse.</p>

        <div className="mt-5 space-y-2">
          <Req ok={user?.email_verified} label="Email verifye" />
          <Req ok={true} label={`Non konplè: ${user?.full_name}`} />
        </div>

        <div className="mt-5">
          <Label>Espesyalite ou yo</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {allSpecialties.map((s) => (
              <button key={s} type="button" onClick={() => toggleSpecialty(s)} data-testid={`specialty-${s}`}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${specialties.includes(s) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Label>Depatman kote ou sèvi</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {locations.map((d) => (
              <button key={d.id} type="button" onClick={() => toggleDepartment(d.name)} data-testid={`service-dept-${d.name}`}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${departments.includes(d.name) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Label>Ti deskripsyon (opsyonèl)</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1.5" rows={3} placeholder="Dekri eksperyans ou..." />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <Label>Lang (opsyonèl)</Label>
            <Input value={languages} onChange={(e) => setLanguages(e.target.value)} className="mt-1.5 h-11" placeholder="Kreyòl, Fransè" data-testid="technician-languages" />
          </div>
          <div>
            <Label>Disponiblite</Label>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="technician-availability"><SelectValue /></SelectTrigger>
              <SelectContent>{AVAILABILITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 bg-muted/50 rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" />Règ Teknisyen</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            {TECHNICIAN_RULES.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        <label className="flex items-start gap-2 cursor-pointer mt-5">
          <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} data-testid="technician-terms" className="mt-0.5" />
          <span className="text-sm">Mwen aksepte <b>Règ Teknisyen</b> yo.</span>
        </label>

        <Button onClick={submit} disabled={loading || !user?.email_verified} data-testid="become-technician-submit" className="w-full h-11 mt-6 bg-primary font-semibold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aktive pwofil teknisyen mwen"}
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

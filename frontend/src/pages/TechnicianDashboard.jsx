import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Star, ShieldCheck, Loader2, Wrench, ImagePlus, X, Pencil, Trash2, Plus } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { compressImage } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Disponib" },
  { value: "busy", label: "Okipe" },
  { value: "offline", label: "Offline" },
  { value: "by_appointment", label: "Sou Randevou" },
];
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function TechnicianDashboard() {
  const { user, fetchMe } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/technician/profile");
      setProfile(data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !profile) return <FullLoader />;
  const setTab = (t) => { const p = new URLSearchParams(params); p.set("tab", t); setParams(p); };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" /> Tablo Teknisyen {profile.technician_verified && <ShieldCheck className="w-5 h-5 text-primary" />}
          </h1>
          <p className="text-sm text-muted-foreground">Byenveni @{user?.username}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="overview" data-testid="tech-tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="work" data-testid="tech-tab-work">Travay Mwen</TabsTrigger>
          <TabsTrigger value="verification" data-testid="tech-tab-verification">Verifikasyon</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tech-tab-settings">Paramèt</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="bg-card border border-border rounded-xl p-5">
            {profile.review_count > 0 ? (
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 fill-secondary text-secondary" />
                <span className="font-display text-2xl font-800" style={{ fontWeight: 800 }}>{profile.rating}</span>
                <span className="text-sm text-muted-foreground">nan {profile.review_count} avi</span>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Ou poko gen avi. Klika ap parèt lè kliyan kòmanse evalye w.</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {(profile.specialties || []).map((s) => <span key={s} className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium">{s}</span>)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="work">
          <WorkTab />
        </TabsContent>

        <TabsContent value="verification">
          <TechVerificationTab profile={profile} user={user} onRequested={load} />
        </TabsContent>

        <TabsContent value="settings">
          <TechSettingsTab profile={profile} onSaved={() => { load(); fetchMe(); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TechVerificationTab({ profile, user, onRequested }) {
  const [loading, setLoading] = useState(false);
  const request = async () => {
    setLoading(true);
    try { const { data } = await api.post("/technician/verify-request"); toast.success(data.message); onRequested(); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };
  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display font-bold mb-3">Badges ou</h3>
        <div className="space-y-2 text-sm">
          <BadgeRow ok={user?.email_verified} label="Email Verified" />
          <BadgeRow ok={profile?.technician_verified} label="Teknisyen Verifye" />
        </div>
      </div>
      {!profile?.technician_verified && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-bold mb-1">Teknisyen Verifye</h3>
          <p className="text-sm text-muted-foreground mb-4">Mande verifikasyon pou jwenn badge "Teknisyen Verifye" la epi ogmante konfyans kliyan yo.</p>
          <Button onClick={request} disabled={loading} data-testid="tech-request-verification-btn" className="bg-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mande verifikasyon"}
          </Button>
        </div>
      )}
    </div>
  );
}

function BadgeRow({ ok, label }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2"><ShieldCheck className={`w-4 h-4 ${ok ? "text-emerald-500" : "text-muted-foreground/40"}`} />{label}</span>
      {ok ? <span className="text-xs text-emerald-600 font-semibold">✓ Verifye</span> : <span className="text-xs text-muted-foreground">Poko</span>}
    </div>
  );
}

function TechSettingsTab({ profile, onSaved }) {
  const { locations } = useApp();
  const [specialties, setSpecialties] = useState(profile.specialties || []);
  const [allSpecialties, setAllSpecialties] = useState([]);
  const [departments, setDepartments] = useState(profile.service_departments || []);
  const [f, setF] = useState({
    bio: profile.bio || "", years_experience: profile.years_experience ?? "",
    whatsapp_enabled: profile.whatsapp_enabled ?? true, whatsapp_number: profile.whatsapp_number || "",
    show_phone: profile.show_phone ?? true, languages: (profile.languages || []).join(", "),
    availability: profile.availability || "available",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get("/technician-specialties").then(({ data }) => setAllSpecialties(data)).catch(() => {});
  }, []);

  const toggleSpecialty = (s) => setSpecialties((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  const toggleDepartment = (d) => setDepartments((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/technician/settings", {
        ...f, specialties, service_departments: departments,
        years_experience: f.years_experience === "" ? null : Number(f.years_experience),
        languages: f.languages.split(",").map((l) => l.trim()).filter(Boolean),
      });
      toast.success("Anrejistre!"); onSaved && onSaved();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <Label>Espesyalite</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {allSpecialties.map((s) => (
            <button key={s} type="button" onClick={() => toggleSpecialty(s)} data-testid={`tech-setting-specialty-${s}`}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${specialties.includes(s) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Depatman kote ou sèvi</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {locations.map((d) => (
            <button key={d.id} type="button" onClick={() => toggleDepartment(d.name)} data-testid={`tech-setting-dept-${d.name}`}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${departments.includes(d.name) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
              {d.name}
            </button>
          ))}
        </div>
      </div>
      <div><Label>Bio</Label><Textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} data-testid="tech-setting-bio" className="mt-1.5" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Lang</Label><Input value={f.languages} onChange={(e) => set("languages", e.target.value)} data-testid="tech-setting-languages" className="mt-1.5 h-11" placeholder="Kreyòl, Fransè" /></div>
        <div>
          <Label>Disponiblite</Label>
          <Select value={f.availability} onValueChange={(v) => set("availability", v)}>
            <SelectTrigger className="mt-1.5 h-11" data-testid="tech-setting-availability"><SelectValue /></SelectTrigger>
            <SelectContent>{AVAILABILITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Ane eksperyans</Label><Input type="number" min="0" value={f.years_experience} onChange={(e) => set("years_experience", e.target.value)} data-testid="tech-setting-experience" className="mt-1.5 h-11" /></div>
      <div className="flex items-center justify-between"><Label>Aktive WhatsApp</Label><Switch checked={f.whatsapp_enabled} onCheckedChange={(v) => set("whatsapp_enabled", v)} data-testid="tech-setting-whatsapp-toggle" /></div>
      {f.whatsapp_enabled && <div><Label>Nimewo WhatsApp</Label><Input value={f.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} data-testid="tech-setting-whatsapp-number" className="mt-1.5 h-11" placeholder="+509..." /></div>}
      <div className="flex items-center justify-between"><Label>Montre telefòn piblikman</Label><Switch checked={f.show_phone} onCheckedChange={(v) => set("show_phone", v)} data-testid="tech-setting-show-phone" /></div>
      <Button onClick={save} disabled={saving} data-testid="tech-save-settings-btn" className="bg-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Anrejistre"}</Button>
    </div>
  );
}

function WorkTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = editing
  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/technician/work"); setItems(data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const del = async (id) => {
    try { await api.delete(`/technician/work/${id}`); toast.success("Efase"); load(); } catch (e) { toast.error(apiError(e)); }
  };

  if (loading) return <FullLoader />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setEditing({})} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" data-testid="add-work-btn">
          <Plus className="w-4 h-4 mr-1" /> Ajoute Travay
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Ou poko poste okenn travay. Montre kliyan yo sa w konn fè!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((w) => (
            <div key={w.id} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`work-item-${w.id}`}>
              <div className="aspect-video bg-muted">
                {w.images?.[0] ? <img src={w.images[0]} alt="" className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Pa gen foto</div>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-semibold text-sm truncate">{w.title}</h4>
                {w.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{w.description}</p>}
                <div className="flex gap-1.5 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditing(w)} data-testid={`edit-work-${w.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-destructive" data-testid={`delete-work-${w.id}`}><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Efase travay sa?</AlertDialogTitle><AlertDialogDescription>Aksyon sa pa ka defèt.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Anile</AlertDialogCancel><AlertDialogAction onClick={() => del(w.id)} className="bg-destructive">Efase</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing !== null && <WorkFormDialog work={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function WorkFormDialog({ work, onClose, onSaved }) {
  const isEdit = !!work.id;
  const [title, setTitle] = useState(work.title || "");
  const [description, setDescription] = useState(work.description || "");
  const [images, setImages] = useState(work.images || []);
  const [saving, setSaving] = useState(false);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    const room = 6 - images.length;
    const toAdd = files.slice(0, room);
    try {
      const compressed = await Promise.all(toAdd.map((file) => compressImage(file)));
      setImages((cur) => [...cur, ...compressed]);
    } catch { toast.error("Erè pandan chajman foto."); }
    e.target.value = "";
  };
  const removeImg = (i) => setImages((cur) => cur.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!title.trim()) return toast.error("Antre yon tit.");
    setSaving(true);
    try {
      const payload = { title, description, images };
      if (isEdit) await api.put(`/technician/work/${work.id}`, payload);
      else await api.post("/technician/work", payload);
      toast.success("Anrejistre!");
      onSaved();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Modifye Travay" : "Ajoute Travay"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tit</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="work-title" className="mt-1.5 h-11" placeholder="Chanjman ekran iPhone 13" />
          </div>
          <div>
            <Label>Deskripsyon</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="work-description" className="mt-1.5" rows={3} />
          </div>
          <div>
            <Label>Foto</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {images.map((im, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                  <img src={im} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImg(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center" data-testid={`remove-work-img-${i}`}><X className="w-3 h-3" /></button>
                </div>
              ))}
              {images.length < 6 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary text-muted-foreground" data-testid="upload-work-images">
                  <ImagePlus className="w-5 h-5" />
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onFiles} />
                </label>
              )}
            </div>
          </div>
          <Button onClick={submit} disabled={saving} className="w-full bg-primary font-semibold" data-testid="save-work-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Anrejistre"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

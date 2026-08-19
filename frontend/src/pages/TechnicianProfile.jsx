import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, Calendar, Star, ShieldCheck, Wrench, Loader2 } from "lucide-react";import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { timeAgo } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function TechnicianProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const { lang } = useApp();
  const [d, setD] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [work, setWork] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [t, r, w] = await Promise.all([
        api.get(`/technicians/${username}`), api.get(`/technicians/${username}/reviews`), api.get(`/technicians/${username}/work`),
      ]);
      setD(t.data); setReviews(r.data); setWork(w.data);
    } catch { toast.error("Teknisyen pa jwenn."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [username]); // eslint-disable-line

  if (loading) return <FullLoader />;
  if (!d) return null;
  const { user: u, profile } = d;
  const canReview = user && user.id && user.id !== u.id;
  const isOwnProfile = user && user.id === u.id;

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center text-3xl font-bold overflow-hidden shrink-0">
            {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold">{u.full_name}</h1>
              {profile.technician_verified && <ShieldCheck className="w-6 h-6 text-primary" />}
            </div>
            <p className="text-muted-foreground">@{u.username}</p>
            {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-3">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{u.city}, {u.department}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Manm depi {timeAgo(u.created_at, lang)}</span>
              {profile.years_experience != null && <span className="flex items-center gap-1"><Wrench className="w-4 h-4" />{profile.years_experience} ane eksperyans</span>}
              {profile.review_count > 0 && <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-secondary text-secondary" />{profile.rating} ({profile.review_count})</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(profile.specialties || []).map((s) => (
                <span key={s} className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium">{s}</span>
              ))}
            </div>
            {profile.service_departments?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">Sèvis nan: {profile.service_departments.join(", ")}</p>
            )}
          </div>
          {canReview && <ReviewDialog technicianId={u.id} onDone={load} />}
        </div>
        {u.phone && (
          <a href={`tel:${u.phone}`} className="inline-block mt-4">
            <Button className="bg-primary font-semibold" data-testid="call-technician-btn">Rele {u.phone}</Button>
          </a>
        )}
        {isOwnProfile && !profile.technician_verified && <VerifyRequestButton onDone={load} />}
      </div>

      <Tabs defaultValue="reviews" className="mt-6">
        <TabsList>
          <TabsTrigger value="work" data-testid="technician-tab-work">Travay ({work.length})</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="technician-tab-reviews">Avi ({reviews.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="work" className="mt-5">
          {work.length === 0 ? <div className="text-center py-16 text-muted-foreground">Teknisyen sa poko poste travay.</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {work.map((w) => (
                <div key={w.id} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`public-work-${w.id}`}>
                  <div className="aspect-video bg-muted">
                    {w.images?.[0] ? <img src={w.images[0]} alt="" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Pa gen foto</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-sm">{w.title}</h4>
                    {w.description && <p className="text-xs text-muted-foreground mt-1">{w.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="reviews" className="mt-5">
          {reviews.length === 0 ? <div className="text-center py-16 text-muted-foreground">Pa gen avi.</div> : (
            <div className="space-y-3 max-w-2xl">
              {reviews.map((r) => (
                <div key={r.id} className="bg-card border border-border rounded-xl p-4" data-testid={`technician-review-${r.id}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">@{r.buyer_username}</span>
                    <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-secondary text-secondary" : "text-muted"}`} />)}</div>
                  </div>
                  {r.comment && <p className="text-sm mt-1.5">{r.comment}</p>}
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span>{timeAgo(r.created_at, lang)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VerifyRequestButton({ onDone }) {
  const [loading, setLoading] = useState(false);
  const request = async () => {
    setLoading(true);
    try { const { data } = await api.post("/technician/verify-request"); toast.success(data.message); onDone(); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };
  return (
    <Button onClick={request} disabled={loading} variant="outline" className="mt-4 ml-2" data-testid="request-technician-verify-btn">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4 mr-1.5" />Mande Verifikasyon</>}
    </Button>
  );
}

function ReviewDialog({ technicianId, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!rating) return toast.error("Chwazi yon nòt.");
    setLoading(true);
    try {
      await api.post("/reviews", { seller_id: technicianId, rating, comment, target_type: "technician" });
      toast.success("Mèsi pou avi w!"); setOpen(false); onDone();
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-primary" data-testid="write-technician-review-btn"><Star className="w-4 h-4 mr-1" />Bay yon avi</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Evalye teknisyen an</DialogTitle></DialogHeader>
        <div className="flex gap-1 justify-center py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} onClick={() => setRating(i + 1)} data-testid={`tech-star-${i + 1}`}><Star className={`w-8 h-8 ${i < rating ? "fill-secondary text-secondary" : "text-muted"}`} /></button>
          ))}
        </div>
        <Textarea placeholder="Kòmantè w (opsyonèl)" value={comment} onChange={(e) => setComment(e.target.value)} data-testid="technician-review-comment" />
        <Button onClick={submit} disabled={loading} className="bg-primary" data-testid="submit-technician-review-btn">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Voye avi"}</Button>
      </DialogContent>
    </Dialog>
  );
}

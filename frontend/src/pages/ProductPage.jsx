import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Heart, MapPin, Eye, Clock, MessageCircle, Phone, Flag, ChevronLeft, ChevronRight, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice, timeAgo } from "@/lib/format";
import { SellerBadges } from "@/components/Badges";
import { Button } from "@/components/ui/button";
import { FullLoader } from "@/components/Layout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const REPORT_REASONS = ["Scam", "Fake product", "Stolen product", "Wrong information", "Duplicate", "Suspicious seller", "Inappropriate content", "Other"];

export default function ProductPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { t, branding, lang } = useApp();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [fav, setFav] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${slug}`);
        setD(data);
        setFav(data.is_favorite);
        setImgIdx(data.product.main_image_index || 0);
      } catch {
        toast.error("Pwodwi pa jwenn.");
        nav("/browse");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, nav]);

  if (loading) return <FullLoader />;
  if (!d) return null;
  const p = d.product;
  const s = d.seller;
  const images = p.images?.length ? p.images : [null];

  const requireAuth = () => {
    if (!user || !user.id) { nav("/login"); return false; }
    return true;
  };

  const toggleFav = async () => {
    if (!requireAuth()) return;
    try {
      const { data } = await api.post(`/favorites/${p.id}`);
      setFav(data.favorited);
      toast.success(data.favorited ? "Ajoute nan favori" : "Retire nan favori");
    } catch (e) { toast.error(apiError(e)); }
  };

  const contactSeller = async () => {
    if (!requireAuth()) return;
    try {
      const { data } = await api.post("/conversations", { product_id: p.id });
      nav(`/messages?c=${data.id}`);
    } catch (e) { toast.error(apiError(e)); }
  };

  const whatsappLink = () => {
    const num = (s?.whatsapp_number || "").replace(/[^\d]/g, "");
    const msg = encodeURIComponent(`Bonjou, mwen wè ${p.title} sou ${branding.siteName}. Èske pwodwi a toujou disponib?`);
    return `https://wa.me/${num}?text=${msg}`;
  };

  const submitReport = async () => {
    if (!requireAuth()) return;
    if (!reportReason) return toast.error("Chwazi yon rezon.");
    try {
      await api.post("/reports", { target_type: "listing", target_id: p.id, reason: reportReason, description: reportDesc });
      toast.success("Rapò voye. Mèsi.");
      setReportOpen(false); setReportReason(""); setReportDesc("");
    } catch (e) { toast.error(apiError(e)); }
  };

  const specs = Object.entries(p.specs || {}).filter(([, v]) => v !== "" && v != null);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gallery */}
        <div className="lg:col-span-2">
          <div className="relative aspect-square md:aspect-[4/3] bg-muted rounded-2xl overflow-hidden border border-border">
            {images[imgIdx] ? (
              <img src={images[imgIdx]} alt={p.title} className="w-full h-full object-contain" data-testid="product-main-image" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Pa gen foto</div>
            )}
            {p.status === "sold" && (
              <div className="absolute top-4 left-4 bg-destructive text-white font-display font-bold px-4 py-1.5 rounded-lg">{t("sold")}</div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setImgIdx((i) => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"><ChevronRight className="w-5 h-5" /></button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {images.map((im, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${i === imgIdx ? "border-primary" : "border-border"}`}>
                  <img src={im} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Description & specs (desktop) */}
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold mb-2">{t("description")}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description || "—"}</p>
            </div>
            {specs.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-bold mb-3">{t("specifications")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 bg-card border border-border rounded-xl p-4">
                  {specs.map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-border/50 text-sm">
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-medium text-right">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-32 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{p.condition}</span>
                <button onClick={toggleFav} data-testid="favorite-btn" className={`p-2 rounded-full border ${fav ? "bg-rose-50 border-rose-200 text-rose-500" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  <Heart className={`w-5 h-5 ${fav ? "fill-rose-500" : ""}`} />
                </button>
              </div>
              <h1 className="font-display text-xl font-bold mt-3 leading-snug" data-testid="product-title">{p.title}</h1>
              <p className="font-display text-3xl font-800 text-primary mt-2" style={{ fontWeight: 800 }} data-testid="product-price">{formatPrice(p.price, p.currency)}</p>
              {p.quantity > 1 && <p className="text-sm text-muted-foreground mt-1">Kantite disponib: {p.quantity}</p>}

              <div className="flex flex-col gap-2 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{p.neighborhood ? `${p.neighborhood}, ` : ""}{p.city}, {p.department}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{timeAgo(p.created_at, lang)}</span>
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" />{p.views} {t("views")}</span>
              </div>

              {p.status !== "sold" && (
                <div className="flex flex-col gap-2 mt-4">
                  <Button onClick={contactSeller} data-testid="contact-seller-btn" className="w-full h-11 bg-primary font-semibold"><MessageCircle className="w-4 h-4 mr-2" />{t("sendMessage")}</Button>
                  {s?.whatsapp_enabled && s?.whatsapp_number && (
                    <a href={whatsappLink()} target="_blank" rel="noreferrer" data-testid="whatsapp-btn">
                      <Button className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 font-semibold text-white"><MessageCircle className="w-4 h-4 mr-2" />{t("whatsapp")}</Button>
                    </a>
                  )}
                  {s?.phone && (
                    <a href={`tel:${s.phone}`} data-testid="call-btn">
                      <Button variant="outline" className="w-full h-11 font-semibold"><Phone className="w-4 h-4 mr-2" />{t("call")} {s.phone}</Button>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Seller card */}
            {s && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <Link to={`/seller/${s.username}`} className="flex items-center gap-3 group" data-testid="seller-link">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg overflow-hidden">
                    {s.avatar ? <img src={s.avatar} alt="" className="w-full h-full object-cover" /> : s.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 font-semibold group-hover:text-primary">
                      {s.store_name || s.full_name} {s.seller_verified && <ShieldCheck className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {s.review_count > 0 ? <><Star className="w-3 h-3 fill-secondary text-secondary" />{s.rating} · {s.review_count} avi</> : "Nouvo vandè"}
                    </div>
                  </div>
                </Link>
                <div className="mt-3"><SellerBadges seller={s} /></div>
              </div>
            )}

            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <button className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mx-auto" data-testid="report-btn"><Flag className="w-3 h-3" />{t("report")}</button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("report")}</DialogTitle></DialogHeader>
                <Select value={reportReason} onValueChange={setReportReason}>
                  <SelectTrigger data-testid="report-reason"><SelectValue placeholder="Chwazi rezon" /></SelectTrigger>
                  <SelectContent>{REPORT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea placeholder="Detay (opsyonèl)" value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} data-testid="report-desc" />
                <Button onClick={submitReport} data-testid="report-submit" className="bg-destructive hover:bg-destructive/90">{t("submit")}</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}

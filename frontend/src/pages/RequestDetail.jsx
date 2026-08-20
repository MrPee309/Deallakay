import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, Clock, Loader2, ImagePlus, X, Lock, ShieldCheck, Wrench, Store, Check } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { compressImage, timeAgo, formatPrice } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { lang } = useApp();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const { data } = await api.get(`/requests/${id}`); setD(data); }
    catch (e) { toast.error(apiError(e)); nav("/requests"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (loading || !d) return <FullLoader />;
  const { request: r, offers, is_owner, my_offer } = d;
  const canOffer = user?.id && !is_owner && (user.is_seller || user.is_technician) && r.status === "open";
  const alreadyOffered = !!my_offer;

  const closeReq = async () => {
    try { await api.put(`/requests/${id}/close`); toast.success("Demann fèmen."); load(); } catch (e) { toast.error(apiError(e)); }
  };
  const delReq = async () => {
    try { await api.delete(`/requests/${id}`); toast.success("Efase."); nav("/requests"); } catch (e) { toast.error(apiError(e)); }
  };
  const proposeAccept = async (oid) => {
    try { await api.put(`/requests/${id}/offers/${oid}/propose-accept`); toast.success("Pwopozisyon voye. Tann konfimasyon."); load(); } catch (e) { toast.error(apiError(e)); }
  };
  const confirmOffer = async () => {
    try { await api.put(`/requests/${id}/offers/${my_offer.id}/confirm`); toast.success("Konfime! Antant lan fini."); load(); } catch (e) { toast.error(apiError(e)); }
  };
  const declineOffer = async () => {
    try { await api.put(`/requests/${id}/offers/${my_offer.id}/decline`); toast.info("Ou refize pwopozisyon an."); load(); } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold">{r.title}</h1>
          {r.status !== "open" && <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-semibold shrink-0">FÈMEN</span>}
        </div>
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{r.city}, {r.department}</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{timeAgo(r.created_at, lang)}</span>
        </div>
        {r.description && <p className="text-sm mt-4">{r.description}</p>}
        {r.images?.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {r.images.map((im, i) => <img key={i} src={im} alt="" className="aspect-square rounded-lg object-cover" />)}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">Poste pa @{r.username}</p>

        {is_owner && r.status === "open" && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={closeReq} data-testid="close-request-btn">Make Rezoud</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline" className="text-destructive" data-testid="delete-request-btn">Efase</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Efase demann sa?</AlertDialogTitle><AlertDialogDescription>Aksyon sa pa ka defèt.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Anile</AlertDialogCancel><AlertDialogAction onClick={delReq} className="bg-destructive">Efase</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {is_owner ? (
        <div className="mt-6">
          <h2 className="font-display font-bold mb-3">Òf ki rive ({offers.length})</h2>
          {offers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Pa gen òf ankò.</div>
          ) : (
            <div className="space-y-3">
              {offers.map((o) => (
                <div key={o.id} className="bg-card border border-border rounded-xl p-4" data-testid={`offer-${o.id}`}>
                  <div className="flex items-center justify-between">
                    <Link to={o.is_technician ? `/technician/${o.seller_username}` : `/seller/${o.seller_username}`} className="font-semibold text-sm hover:underline flex items-center gap-1.5">
                      {o.is_technician ? <Wrench className="w-3.5 h-3.5 text-primary" /> : <Store className="w-3.5 h-3.5 text-primary" />}@{o.seller_username}
                    </Link>
                    <span className="font-display font-bold text-primary">{formatPrice(o.price)}</span>
                  </div>
                  {o.message && <p className="text-sm mt-2">{o.message}</p>}
                  {o.images?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {o.images.map((im, i) => <img key={i} src={im} alt="" className="w-16 h-16 rounded-lg object-cover" />)}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">{timeAgo(o.created_at, lang)}</p>
                    {r.status === "fulfilled" && r.accepted_offer_id === o.id && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><Check className="w-3 h-3" />Konfime</span>
                    )}
                    {r.status === "open" && o.owner_accepted && (
                      <span className="text-xs bg-secondary/20 text-secondary-foreground px-2.5 py-1 rounded-full font-semibold">K ap tann konfimasyon @{o.seller_username}</span>
                    )}
                    {r.status === "open" && !o.owner_accepted && (
                      <Button size="sm" onClick={() => proposeAccept(o.id)} className="bg-emerald-500 hover:bg-emerald-600 h-8" data-testid={`accept-offer-${o.id}`}>Pwopoze Aksepte</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {canOffer && !alreadyOffered && <OfferForm requestId={id} onDone={load} />}
          {alreadyOffered && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold">Òf ou</h3>
                <span className="font-display font-bold text-primary">{formatPrice(my_offer.price)}</span>
              </div>
              {my_offer.message && <p className="text-sm text-muted-foreground mt-1">{my_offer.message}</p>}
              {r.status === "fulfilled" && r.accepted_offer_id === my_offer.id ? (
                <p className="text-sm font-semibold text-emerald-600 mt-3 flex items-center gap-1"><Check className="w-4 h-4" />Antant lan konfime — fèlisitasyon!</p>
              ) : my_offer.owner_accepted ? (
                <div className="mt-3">
                  <p className="text-sm mb-2">Pwopriyetè demann lan vle aksepte òf ou. Konfime si nou toude dakò.</p>
                  <div className="flex gap-2">
                    <Button onClick={confirmOffer} className="bg-emerald-500 hover:bg-emerald-600" data-testid="confirm-offer-btn">Konfime</Button>
                    <Button variant="outline" onClick={declineOffer} className="text-destructive" data-testid="decline-offer-btn">Refize</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-3">Ap tann pwopriyetè demann lan reponn.</p>
              )}
            </div>
          )}
          {!canOffer && !alreadyOffered && r.status === "open" && !is_owner && (
            <div className="flex items-center gap-2 justify-center py-6 text-muted-foreground text-sm">
              <Lock className="w-4 h-4" />Ou dwe yon vandè oswa teknisyen pou fè yon òf.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OfferForm({ requestId, onDone }) {
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    const room = 6 - images.length;
    try {
      const compressed = await Promise.all(files.slice(0, room).map((file) => compressImage(file)));
      setImages((cur) => [...cur, ...compressed]);
    } catch { toast.error("Erè pandan chajman foto."); }
    e.target.value = "";
  };
  const removeImg = (i) => setImages((cur) => cur.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!price || Number(price) <= 0) return toast.error("Antre yon pri valab.");
    setSaving(true);
    try {
      await api.post(`/requests/${requestId}/offers`, { price: Number(price), message, images });
      toast.success("Òf ou voye!"); onDone();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-display font-bold mb-3">Fè yon Òf</h3>
      <div className="space-y-3">
        <div><Label>Pri (HTG)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="offer-price" className="mt-1.5 h-11" /></div>
        <div><Label>Mesaj</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} data-testid="offer-message" className="mt-1.5" rows={3} placeholder="Dekri sa w ap ofri..." /></div>
        <div>
          <Label>Foto (opsyonèl)</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {images.map((im, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                <img src={im} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImg(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {images.length < 6 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary text-muted-foreground">
                <ImagePlus className="w-5 h-5" />
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onFiles} />
              </label>
            )}
          </div>
        </div>
        <Button onClick={submit} disabled={saving} data-testid="submit-offer-btn" className="w-full bg-primary font-semibold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Voye Òf la"}
        </Button>
      </div>
    </div>
  );
}

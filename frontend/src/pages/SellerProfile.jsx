import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, Calendar, Package, Star, ShieldCheck, Store, Loader2 } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { timeAgo } from "@/lib/format";
import { SellerBadges } from "@/components/Badges";
import ProductCard from "@/components/ProductCard";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SellerProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const { lang } = useApp();
  const [d, setD] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, r] = await Promise.all([api.get(`/sellers/${username}`), api.get(`/sellers/${username}/reviews`)]);
      setD(s.data); setReviews(r.data);
    } catch { toast.error("Vandè pa jwenn."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [username]); // eslint-disable-line

  if (loading) return <FullLoader />;
  if (!d) return null;
  const { user: u, profile, product_count, products } = d;
  const canReview = user && user.id && user.id !== u.id;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center text-3xl font-bold overflow-hidden shrink-0">
            {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold">{profile.store_name || u.full_name}</h1>
              {profile.seller_verified && <ShieldCheck className="w-6 h-6 text-primary" />}
            </div>
            <p className="text-muted-foreground">@{u.username}</p>
            {profile.store_description && <p className="text-sm mt-2">{profile.store_description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-3">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{u.city}, {u.department}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Manm depi {timeAgo(u.created_at, lang)}</span>
              <span className="flex items-center gap-1"><Package className="w-4 h-4" />{product_count} pwodwi</span>
              {profile.review_count > 0 && <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-secondary text-secondary" />{profile.rating} ({profile.review_count})</span>}
            </div>
            <div className="mt-3"><SellerBadges seller={{ ...u, seller_verified: profile.seller_verified }} /></div>
          </div>
          {canReview && <ReviewDialog sellerId={u.id} onDone={load} />}
        </div>
      </div>

      <Tabs defaultValue="products" className="mt-6">
        <TabsList>
          <TabsTrigger value="products" data-testid="seller-tab-products">Pwodwi ({product_count})</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="seller-tab-reviews">Avi ({reviews.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-5">
          {products.length === 0 ? <div className="text-center py-16 text-muted-foreground">Pa gen pwodwi aktif.</div> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">{products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="reviews" className="mt-5">
          {reviews.length === 0 ? <div className="text-center py-16 text-muted-foreground">Pa gen avi.</div> : (
            <div className="space-y-3 max-w-2xl">
              {reviews.map((r) => (
                <div key={r.id} className="bg-card border border-border rounded-xl p-4" data-testid={`review-${r.id}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">@{r.buyer_username}</span>
                    <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-secondary text-secondary" : "text-muted"}`} />)}</div>
                  </div>
                  {r.comment && <p className="text-sm mt-1.5">{r.comment}</p>}
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    {r.verified && <span className="text-emerald-600 font-semibold">✓ Tranzaksyon verifye</span>}
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

function ReviewDialog({ sellerId, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!rating) return toast.error("Chwazi yon nòt.");
    setLoading(true);
    try { await api.post("/reviews", { seller_id: sellerId, rating, comment }); toast.success("Mèsi pou avi w!"); setOpen(false); onDone(); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-primary" data-testid="write-review-btn"><Star className="w-4 h-4 mr-1" />Bay yon avi</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Evalye vandè a</DialogTitle></DialogHeader>
        <div className="flex gap-1 justify-center py-2" role="radiogroup" aria-label="Chwazi yon nòt">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-1 text-4xl leading-none select-none" data-testid={`star-${n}`} style={{ color: n <= rating ? "#f5b301" : "#d1d5db" }}>
              <input type="radio" name="seller-rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              ★
            </label>
          ))}
        </div>
        <Textarea placeholder="Kòmantè w (opsyonèl)" value={comment} onChange={(e) => setComment(e.target.value)} data-testid="review-comment" />
        <Button onClick={submit} disabled={loading} className="bg-primary" data-testid="submit-review-btn">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Voye avi"}</Button>
      </DialogContent>
    </Dialog>
  );
}

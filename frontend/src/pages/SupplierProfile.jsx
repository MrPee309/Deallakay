import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, MapPin, Globe, Loader2, Truck, Package, MessageSquareText, Lock } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SupplierProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [products, setProducts] = useState([]);
  const [shipping, setShipping] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [sup, prods, ship] = await Promise.all([
        api.get(`/suppliers/${id}`), api.get(`/suppliers/${id}/products`), api.get(`/suppliers/${id}/shipping-services`),
      ]);
      setS(sup.data); setProducts(prods.data); setShipping(ship.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (loading) return <FullLoader />;
  if (!s) return null;
  const isVerifiedActor = user && (user.is_seller || user.is_technician);
  const canInquire = user && !s.is_owner;

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      {s.cover_image && <div className="h-40 rounded-2xl overflow-hidden mb-[-3rem] relative z-0"><img src={s.cover_image} alt="" className="w-full h-full object-cover" /></div>}
      <div className="bg-card border border-border rounded-2xl p-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center text-3xl font-bold overflow-hidden shrink-0">
            {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover" /> : s.company_name[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold">{s.company_name}</h1>
              {s.verified && <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Founisè Verifye</span>}
              {s.status === "pending" && <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">An Atant Apwobasyon</span>}
              {s.status === "rejected" && <span className="text-xs bg-destructive/10 text-destructive font-semibold px-2.5 py-1 rounded-full">Rejte</span>}
              {s.featured && <span className="text-xs bg-secondary/20 text-secondary-foreground font-semibold px-2.5 py-1 rounded-full">Featured</span>}
            </div>
            {s.short_description && <p className="text-sm mt-2">{s.short_description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-3">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{s.city ? `${s.city}, ` : ""}{s.state_province ? `${s.state_province}, ` : ""}{s.country}</span>
              {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="w-4 h-4" />Sit Wèb</a>}
              {s.years_in_business != null && <span>{s.years_in_business} ane nan biznis lan</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {s.supplier_types?.map((t) => <span key={t} className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium">{t}</span>)}
            </div>
            {s.brands?.length > 0 && <p className="text-xs text-muted-foreground mt-2">Mak: {s.brands.join(", ")}</p>}
            {s.ships_to_haiti && <p className="text-sm text-emerald-600 font-medium mt-2 flex items-center gap-1"><Truck className="w-4 h-4" />Livre nan Ayiti</p>}
          </div>
          {canInquire && <InquiryButton supplier={s} isVerifiedActor={isVerifiedActor} onDone={load} />}
        </div>
        {s.full_description && <p className="text-sm text-muted-foreground mt-4 whitespace-pre-line">{s.full_description}</p>}
        {(s.contact_email || s.contact_phone || s.website) && (
          <div className="flex flex-wrap gap-3 mt-4 text-sm">
            {s.contact_email && <a href={`mailto:${s.contact_email}`} className="text-primary hover:underline">{s.contact_email}</a>}
            {s.contact_phone && <a href={`tel:${s.contact_phone}`} className="text-primary hover:underline">{s.contact_phone}</a>}
          </div>
        )}
        {s.is_owner && (
          <Link to={`/suppliers/${id}/edit`}><Button variant="outline" className="mt-4">Modifye Pwofil</Button></Link>
        )}
      </div>

      <Tabs defaultValue="products" className="mt-6">
        <TabsList>
          <TabsTrigger value="products" data-testid="supplier-tab-products">Pwodwi ({products.length})</TabsTrigger>
          <TabsTrigger value="shipping" data-testid="supplier-tab-shipping">Livrezon ({shipping.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-5">
          {products.length === 0 ? <div className="text-center py-16 text-muted-foreground">Founisè sa poko ajoute pwodwi.</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products.map((p) => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-4" data-testid={`supplier-product-${p.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm">{p.name}</h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${p.availability === "in_stock" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {p.availability === "in_stock" ? "Disponib" : p.availability === "limited" ? "Limite" : p.availability === "out_of_stock" ? "Pa gen ankò" : "Sou Kòmand"}
                    </span>
                  </div>
                  {p.brand && <p className="text-xs text-muted-foreground mt-1">Mak: {p.brand}</p>}
                  {p.model_compatibility && <p className="text-xs text-muted-foreground">Konpatib: {p.model_compatibility}</p>}
                  {p.description && <p className="text-sm mt-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {p.wholesale_price != null && <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />${p.wholesale_price} (an gwo)</span>}
                    {p.moq && <span>MOQ: {p.moq}</span>}
                  </div>
                  {p.product_url && <a href={p.product_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">Wè sou sit founisè a →</a>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="shipping" className="mt-5">
          {shipping.length === 0 ? <div className="text-center py-16 text-muted-foreground">Pa gen enfòmasyon livrezon disponib.</div> : (
            <div className="space-y-3 max-w-xl">
              {shipping.map((sv) => (
                <div key={sv.id} className="bg-card border border-border rounded-xl p-4" data-testid={`shipping-service-${sv.id}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{sv.name}</h4>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{sv.owned_by_supplier ? "Sèvis pwòp founisè a" : sv.carrier_name || "Tyès pati"}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {sv.ships_to_haiti && <span className="text-emerald-600 font-medium">Livre nan Ayiti</span>}
                    {sv.estimated_delivery && <span>Dire: {sv.estimated_delivery}</span>}
                    {sv.tracking_available && <span>Tracking disponib</span>}
                    {sv.quote_required && <span>Mande yon devi</span>}
                  </div>
                  {sv.notes && <p className="text-sm mt-2">{sv.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InquiryButton({ supplier, isVerifiedActor, onDone }) {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!product.trim()) return toast.error("Antre pwodwi w bezwen an.");
    setSaving(true);
    try {
      await api.post(`/suppliers/${supplier.id}/inquiries`, { product_requested: product, quantity: Number(quantity) || 1, message });
      toast.success("Demann ou voye bay founisè a!"); setOpen(false); onDone();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  if (!isVerifiedActor) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
        <Lock className="w-4 h-4 shrink-0" />
        Ou dwe yon vandè oswa teknisyen <b>verifye</b> pou kontakte founisè entènasyonal yo.
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-primary font-semibold" data-testid="contact-supplier-btn"><MessageSquareText className="w-4 h-4 mr-1.5" />Voye Demann</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Voye Demann bay {supplier.company_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Pwodwi w bezwen an</Label><Input value={product} onChange={(e) => setProduct(e.target.value)} data-testid="inquiry-product" className="mt-1.5 h-11" placeholder="iPhone 13 Pro Max OLED" /></div>
          <div><Label>Kantite</Label><Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} data-testid="inquiry-quantity" className="mt-1.5 h-11" /></div>
          <div><Label>Mesaj</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} data-testid="inquiry-message" className="mt-1.5" rows={3} /></div>
          <Button onClick={submit} disabled={saving} className="w-full bg-primary font-semibold" data-testid="submit-inquiry-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Voye Demann lan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function KafouShopProduct() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [fulfillment, setFulfillment] = useState("pickup");
  const [contactName, setContactName] = useState(user?.full_name || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [deliveryDept, setDeliveryDept] = useState(user?.department || "");
  const [deliveryCity, setDeliveryCity] = useState(user?.city || "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState("form"); // "form" | "review" | "submitting" | "done"
  const [idempotencyKey] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${slug}`);
        setProduct(data.product);
      } catch {
        toast.error("Pwodwi pa jwenn.");
        nav("/kafou-shop");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, nav]);

  if (loading) return <FullLoader />;
  if (!product) return null;

  const subtotal = (product.price || 0) * quantity;
  const outOfStock = product.quantity <= 0;

  const canReview =
    quantity > 0 &&
    quantity <= product.quantity &&
    contactName.trim() &&
    contactPhone.trim() &&
    (fulfillment === "pickup" || (deliveryDept.trim() && deliveryCity.trim() && deliveryAddress.trim()));

  const submitOrder = async () => {
    if (!user) {
      toast.error("Konekte anvan ou pase yon kòmand.");
      nav("/login");
      return;
    }
    setStep("submitting");
    try {
      const { data } = await api.post("/kafou-shop/orders", {
        items: [{ product_id: product.id, quantity }],
        fulfillment_method: fulfillment,
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        delivery_department: fulfillment === "delivery" ? deliveryDept.trim() : null,
        delivery_city: fulfillment === "delivery" ? deliveryCity.trim() : null,
        delivery_address: fulfillment === "delivery" ? deliveryAddress.trim() : null,
        notes,
        idempotency_key: idempotencyKey,
      });
      setPlacedOrder(data);
      setStep("done");
    } catch (e) {
      toast.error(apiError(e));
      setStep("review");
    }
  };

  if (step === "done" && placedOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-primary">Kòmand ou a resevwa!</h1>
        <p className="mt-2 text-muted-foreground">Nimewo referans: <span className="font-mono font-medium">{placedOrder.reference}</span></p>
        <p className="mt-1 text-muted-foreground">N ap voye yon notifikasyon lè estati l chanje.</p>
        <Button className="mt-6" onClick={() => nav("/kafou-shop/orders")}>Wè Kòmand Mwen Yo</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex gap-4 border-b pb-6 mb-6">
        <div className="w-28 h-28 bg-muted rounded-xl flex-shrink-0">
          {product.images?.[0] && <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover rounded-xl" />}
        </div>
        <div>
          <h1 className="text-lg font-bold">{product.title}</h1>
          <p className="text-primary font-bold text-xl mt-1">{formatPrice(product.price)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {outOfStock ? "Pa gen stock" : `${product.quantity} disponib`}
          </p>
        </div>
      </div>

      {outOfStock ? (
        <p className="text-center text-muted-foreground py-8">Pwodwi sa a pa disponib kounye a.</p>
      ) : step === "form" ? (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium">Kantite</label>
            <div className="flex items-center gap-3 mt-1">
              <Button type="button" variant="outline" size="icon" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</Button>
              <span className="w-10 text-center font-medium">{quantity}</span>
              <Button type="button" variant="outline" size="icon" onClick={() => setQuantity((q) => Math.min(product.quantity, q + 1))}>+</Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Kijan ou vle resevwa l</label>
            <div className="flex gap-3 mt-1">
              <Button type="button" variant={fulfillment === "pickup" ? "default" : "outline"} onClick={() => setFulfillment("pickup")} className="flex-1">
                Vin Pran l
              </Button>
              <Button type="button" variant={fulfillment === "delivery" ? "default" : "outline"} onClick={() => setFulfillment("delivery")} className="flex-1">
                Livrezon
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Non ou</label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Telefòn ou</label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1" />
          </div>

          {fulfillment === "delivery" && (
            <>
              <div>
                <label className="text-sm font-medium">Depatman</label>
                <Input value={deliveryDept} onChange={(e) => setDeliveryDept(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Vil</label>
                <Input value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Adrès konplè</label>
                <Textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="mt-1" />
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium">Nòt (opsyonèl)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Eg. koulè espesifik, elatriye" />
          </div>

          <Button className="w-full" disabled={!canReview} onClick={() => setStep("review")}>
            Revize Kòmand lan
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-semibold">Revize Kòmand lan</h2>
          <div className="border rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Pwodwi</span><span>{product.title}</span></div>
            <div className="flex justify-between"><span>Kantite</span><span>{quantity}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span>Metòd</span><span>{fulfillment === "pickup" ? "Vin Pran l" : "Livrezon"}</span></div>
            <div className="flex justify-between"><span>Kontak</span><span>{contactName} · {contactPhone}</span></div>
            {fulfillment === "delivery" && (
              <div className="flex justify-between"><span>Adrès</span><span className="text-right">{deliveryAddress}, {deliveryCity}, {deliveryDept}</span></div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("form")} disabled={step === "submitting"}>
              Modifye
            </Button>
            <Button className="flex-1" onClick={submitOrder} disabled={step === "submitting"}>
              {step === "submitting" ? "N ap voye..." : "Konfime Kòmand"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Phone, MessageCircle } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function KafouShopCart() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { items, removeItem, setQuantity, clear, subtotal } = useCart();
  const [store, setStore] = useState(null);

  const [fulfillment, setFulfillment] = useState("pickup");
  const [contactName, setContactName] = useState(user?.full_name || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [deliveryDept, setDeliveryDept] = useState(user?.department || "");
  const [deliveryCity, setDeliveryCity] = useState(user?.city || "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState("cart"); // "cart" | "submitting" | "done"
  const [placedOrder, setPlacedOrder] = useState(null);
  const [idempotencyKey] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    api.get("/kafou-shop/store").then(({ data }) => setStore(data)).catch(() => undefined);
  }, []);

  const canSubmit =
    items.length > 0 &&
    contactName.trim() &&
    contactPhone.trim() &&
    (fulfillment === "pickup" || (deliveryDept.trim() && deliveryCity.trim() && deliveryAddress.trim()));

  const submitOrder = async () => {
    if (!user) {
      toast.error("Konekte anvan ou pase yon kòmand.");
      nav("/login", { state: { from: "/kafou-shop/cart" } });
      return;
    }
    setStep("submitting");
    try {
      const { data } = await api.post("/kafou-shop/orders", {
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
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
      clear();
      setStep("done");
    } catch (e) {
      toast.error(apiError(e));
      setStep("cart");
    }
  };

  // Final step replaces a payment form — there's no online payment system
  // yet, so instead of asking for payment details, this shows the store's
  // real, configured contact info so the customer can follow up directly
  // to arrange payment and finalize things (never an invented payment
  // method or a fake "paid" confirmation).
  if (step === "done" && placedOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-primary">Kòmand ou a resevwa!</h1>
        <p className="mt-2 text-muted-foreground">
          Nimewo referans: <span className="font-mono font-medium">{placedOrder.reference}</span>
        </p>
        <div className="mt-6 border rounded-xl p-5 text-left">
          <p className="font-medium mb-3">Pwochen Etap — Kontakte Nou Pou Konplete Kòmand lan</p>
          <p className="text-sm text-muted-foreground mb-3">
            Nou pa gen peman an liy kounye a — rele oswa ekri nou pou nou konfime kòmand ou a ansanm.
          </p>
          {store?.contact_phone && (
            <a href={`tel:${store.contact_phone}`} className="flex items-center gap-2 text-primary font-medium mb-2">
              <Phone className="w-4 h-4" /> {store.contact_phone}
            </a>
          )}
          {store?.whatsapp_number && (
            <a
              href={`https://wa.me/${store.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjou, mwen fèk fè kòmand ${placedOrder.reference} sou Kafou Shop.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-green-600 font-medium"
            >
              <MessageCircle className="w-4 h-4" /> Ekri sou WhatsApp
            </a>
          )}
        </div>
        <Button className="mt-6" onClick={() => nav("/kafou-shop/orders")}>Wè Kòmand Mwen Yo</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/kafou-shop" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Tounen nan Kafou Shop
      </Link>
      <h1 className="text-xl font-bold mb-6">Panye Mwen</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Panye ou vid.</p>
          <Link to="/kafou-shop"><Button>Gade Pwodwi yo</Button></Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-3 border rounded-xl p-3">
                <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0">
                  {item.image && <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded-lg" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                  <p className="text-primary font-bold text-sm">{formatPrice(item.price * item.quantity)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => setQuantity(item.productId, item.quantity - 1)}>-</Button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</Button>
                    <button onClick={() => removeItem(item.productId)} className="ml-auto text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Kijan ou vle resevwa l</label>
              <div className="flex gap-3 mt-1">
                <Button type="button" variant={fulfillment === "pickup" ? "default" : "outline"} onClick={() => setFulfillment("pickup")} className="flex-1">Vin Pran l</Button>
                <Button type="button" variant={fulfillment === "delivery" ? "default" : "outline"} onClick={() => setFulfillment("delivery")} className="flex-1">Livrezon</Button>
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
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
            </div>

            <Button className="w-full" disabled={!canSubmit || step === "submitting"} onClick={submitOrder}>
              {step === "submitting" ? "N ap voye..." : "Konfime Kòmand"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

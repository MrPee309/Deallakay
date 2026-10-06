import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Phone, MessageCircle, Store } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Site-wide cart — not specific to any one seller. A customer can add
 * products from several different sellers/businesses here, then at
 * checkout:
 *   - Kafou Shop items go through the existing formal order flow
 *     (/kafou-shop/orders — real backend order, stock validation, staff
 *     confirmation).
 *   - Every other seller's items use the existing contact-seller flow
 *     (POST /conversations) — there's no general order/payment system for
 *     arbitrary sellers site-wide, so "checking out" with them means
 *     opening a conversation to discuss and arrange the sale directly,
 *     same as the existing "Voye Mesaj" button on any product page.
 */
export default function KafouShopCart() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { items, removeItem, setQuantity, clear } = useCart();

  const kafouItems = items.filter((i) => i.storeId === "kafou-shop");
  const otherItems = items.filter((i) => i.storeId !== "kafou-shop");
  const otherBySeller = {};
  for (const item of otherItems) {
    const key = item.sellerId || "unknown";
    if (!otherBySeller[key]) otherBySeller[key] = { sellerName: item.sellerName || "Vandè", items: [] };
    otherBySeller[key].items.push(item);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Tounen
      </Link>
      <h1 className="text-xl font-bold mb-6">Panye Mwen</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Panye ou vid.</p>
          <Link to="/browse"><Button>Gade Pwodwi yo</Button></Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(otherBySeller).map(([sellerId, group]) => (
            <SellerGroup key={sellerId} sellerName={group.sellerName} items={group.items} removeItem={removeItem} setQuantity={setQuantity} user={user} nav={nav} />
          ))}

          {kafouItems.length > 0 && (
            <KafouShopGroup items={kafouItems} removeItem={removeItem} setQuantity={setQuantity} user={user} nav={nav} clearKafouItems={() => kafouItems.forEach((i) => removeItem(i.productId))} />
          )}
        </div>
      )}
    </div>
  );
}

function SellerGroup({ sellerName, items, removeItem, setQuantity, user, nav }) {
  const [contacting, setContacting] = useState(false);
  const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

  const contactSeller = async () => {
    if (!user) {
      toast.error("Konekte anvan ou kontakte yon vandè.");
      nav("/login");
      return;
    }
    setContacting(true);
    try {
      // The existing endpoint starts a conversation scoped to one product
      // — using the first item in this seller's group opens the chat;
      // the customer can naturally mention the other items once it's open.
      const { data } = await api.post("/conversations", { product_id: items[0].productId });
      nav(`/messages?c=${data.id}`);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setContacting(false);
    }
  };

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Store className="w-4 h-4 text-muted-foreground" />
        <p className="font-medium">{sellerName}</p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <CartItemRow key={item.productId} item={item} removeItem={removeItem} setQuantity={setQuantity} />
        ))}
      </div>
      <div className="flex justify-between font-semibold pt-2 mt-2 border-t text-sm">
        <span>Total</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <Button onClick={contactSeller} disabled={contacting} className="w-full mt-3">
        <MessageCircle className="w-4 h-4 mr-2" /> {contacting ? "N ap konekte..." : `Kontakte ${sellerName}`}
      </Button>
    </div>
  );
}

function KafouShopGroup({ items, removeItem, setQuantity, user, nav, clearKafouItems }) {
  const [store, setStore] = useState(null);
  const [fulfillment, setFulfillment] = useState("pickup");
  const [contactName, setContactName] = useState(user?.full_name || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [deliveryDept, setDeliveryDept] = useState(user?.department || "");
  const [deliveryCity, setDeliveryCity] = useState(user?.city || "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState("form"); // "form" | "submitting" | "done"
  const [placedOrder, setPlacedOrder] = useState(null);
  const [idempotencyKey] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    api.get("/kafou-shop/store").then(({ data }) => setStore(data)).catch(() => undefined);
  }, []);

  const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
  const canSubmit =
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
      clearKafouItems();
      setStep("done");
    } catch (e) {
      toast.error(apiError(e));
      setStep("form");
    }
  };

  if (step === "done" && placedOrder) {
    return (
      <div className="border rounded-xl p-5">
        <h2 className="font-bold text-primary">Kòmand Kafou Shop ou a resevwa!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Referans: <span className="font-mono font-medium">{placedOrder.reference}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nou pa gen peman an liy kounye a — rele oswa ekri nou pou nou konfime kòmand ou a.
        </p>
        {store?.contact_phone && (
          <a href={`tel:${store.contact_phone}`} className="flex items-center gap-2 text-primary font-medium mt-2">
            <Phone className="w-4 h-4" /> {store.contact_phone}
          </a>
        )}
        {store?.whatsapp_number && (
          <a
            href={`https://wa.me/${store.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjou, mwen fèk fè kòmand ${placedOrder.reference} sou Kafou Shop.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-green-600 font-medium mt-1"
          >
            <MessageCircle className="w-4 h-4" /> Ekri sou WhatsApp
          </a>
        )}
        <Link to="/kafou-shop/orders"><Button className="mt-4 w-full">Wè Kòmand Mwen Yo</Button></Link>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Store className="w-4 h-4 text-muted-foreground" />
        <p className="font-medium">Kafou Shop</p>
      </div>
      <div className="space-y-3 mb-3">
        {items.map((item) => (
          <CartItemRow key={item.productId} item={item} removeItem={removeItem} setQuantity={setQuantity} />
        ))}
      </div>
      <div className="flex justify-between font-semibold pt-2 border-t text-sm mb-4">
        <span>Total</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={fulfillment === "pickup" ? "default" : "outline"} onClick={() => setFulfillment("pickup")} className="flex-1">Vin Pran l</Button>
          <Button type="button" size="sm" variant={fulfillment === "delivery" ? "default" : "outline"} onClick={() => setFulfillment("delivery")} className="flex-1">Livrezon</Button>
        </div>
        <Input placeholder="Non ou" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        <Input placeholder="Telefòn ou" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        {fulfillment === "delivery" && (
          <>
            <Input placeholder="Depatman" value={deliveryDept} onChange={(e) => setDeliveryDept(e.target.value)} />
            <Input placeholder="Vil" value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} />
            <Textarea placeholder="Adrès konplè" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
          </>
        )}
        <Textarea placeholder="Nòt (opsyonèl)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button className="w-full" disabled={!canSubmit || step === "submitting"} onClick={submitOrder}>
          {step === "submitting" ? "N ap voye..." : "Konfime Kòmand Kafou Shop"}
        </Button>
      </div>
    </div>
  );
}

function CartItemRow({ item, removeItem, setQuantity }) {
  return (
    <div className="flex gap-3">
      <div className="w-14 h-14 bg-muted rounded-lg flex-shrink-0">
        {item.image && <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded-lg" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium line-clamp-1">{item.title}</p>
        <p className="text-primary font-bold text-sm">{formatPrice((item.price || 0) * item.quantity)}</p>
        <div className="flex items-center gap-2 mt-1">
          <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => setQuantity(item.productId, item.quantity - 1)}>-</Button>
          <span className="text-sm w-6 text-center">{item.quantity}</span>
          <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</Button>
          <button onClick={() => removeItem(item.productId)} className="ml-auto text-destructive"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

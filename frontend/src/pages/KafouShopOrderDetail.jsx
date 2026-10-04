import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { formatPrice, timeAgo } from "@/lib/format";
import { FullLoader } from "@/components/Layout";

const STATUS_LABELS = {
  pending: "An atant", confirmed: "Konfime", preparing: "N ap prepare",
  ready_for_pickup: "Pare pou pran", out_for_delivery: "Nan wout",
  completed: "Fini", cancelled: "Anile",
};

export default function KafouShopOrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/kafou-shop/orders/${id}`)
      .then(({ data }) => setOrder(data))
      .catch((e) => {
        toast.error(apiError(e));
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <FullLoader />;

  if (notFound || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Kòmand sa a pa jwenn, oswa ou pa gen aksè l.</p>
        <button onClick={() => nav("/kafou-shop/orders")} className="text-primary font-medium">Tounen nan Kòmand Mwen Yo</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => nav("/kafou-shop/orders")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Tounen nan Kòmand Mwen Yo
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold font-mono">{order.reference}</h1>
        <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{STATUS_LABELS[order.status]}</span>
      </div>

      <div className="border rounded-xl p-4 mb-4">
        <h2 className="font-semibold mb-3">Atik yo</h2>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-1">
            <span>{item.quantity}× {item.title}</span>
            <span>{formatPrice(item.line_total)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold mt-2 pt-2 border-t text-sm">
          <span>Total</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
      </div>

      <div className="border rounded-xl p-4 mb-4 text-sm space-y-1">
        <h2 className="font-semibold mb-2">Enfòmasyon Livrezon</h2>
        <p className="text-muted-foreground">
          {order.fulfillment_method === "pickup" ? "Vin pran l nan boutik la" : "Livrezon"}
        </p>
        {order.fulfillment_method === "delivery" && (
          <p className="text-muted-foreground">{order.delivery_address}, {order.delivery_city}, {order.delivery_department}</p>
        )}
        <p className="text-muted-foreground">Kontak: {order.customer_name} · {order.customer_phone}</p>
        {order.notes && <p className="text-muted-foreground">Nòt: {order.notes}</p>}
      </div>

      <div className="border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Istorik Estati</h2>
        <div className="space-y-3">
          {order.status_history.map((h, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{STATUS_LABELS[h.status] || h.status}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(h.at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

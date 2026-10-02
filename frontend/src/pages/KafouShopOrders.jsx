import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatPrice, timeAgo } from "@/lib/format";
import { FullLoader } from "@/components/Layout";

const STATUS_LABELS = {
  pending: "An atant", confirmed: "Konfime", preparing: "N ap prepare",
  ready_for_pickup: "Pare pou pran", out_for_delivery: "Nan wout",
  completed: "Fini", cancelled: "Anile",
};

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700", confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-blue-100 text-blue-700", ready_for_pickup: "bg-green-100 text-green-700",
  out_for_delivery: "bg-green-100 text-green-700", completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function KafouShopOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/kafou-shop/orders").then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <FullLoader />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Kòmand Kafou Shop Mwen Yo</h1>
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Ou poko gen okenn kòmand.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium">{o.reference}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{timeAgo(o.created_at)}</p>
              <div className="mt-3 space-y-1">
                {o.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.quantity}× {item.title}</span>
                    <span>{formatPrice(item.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-semibold mt-2 pt-2 border-t text-sm">
                <span>Total</span>
                <span>{formatPrice(o.subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {o.fulfillment_method === "pickup" ? "Vin Pran l" : `Livrezon: ${o.delivery_address}, ${o.delivery_city}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

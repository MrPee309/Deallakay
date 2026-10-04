import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { formatPrice, timeAgo } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";

const STATUS_LABELS = {
  pending: "An atant", confirmed: "Konfime", preparing: "N ap prepare",
  ready_for_pickup: "Pare pou pran", out_for_delivery: "Nan wout",
  completed: "Fini", cancelled: "Anile",
};

// Next-step suggestions shown as quick-action buttons — the backend still
// enforces the real allowed-transition rules, this is just a convenient
// shortcut for the most common forward move from each status.
const NEXT_STEP = {
  pending: "confirmed", confirmed: "preparing",
  preparing: { pickup: "ready_for_pickup", delivery: "out_for_delivery" },
  ready_for_pickup: "completed", out_for_delivery: "completed",
};

const FILTERS = ["all", "pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "completed", "cancelled"];

export default function KafouShopStaffDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get("/kafou-shop/staff/stats"),
        api.get("/kafou-shop/staff/orders", { params: filter === "all" ? {} : { status: filter } }),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (order, status) => {
    setUpdatingId(order.id);
    try {
      await api.put(`/kafou-shop/staff/orders/${order.id}/status`, { status });
      toast.success("Kòmand mizajou.");
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setUpdatingId(null);
    }
  };

  const nextStepFor = (order) => {
    const next = NEXT_STEP[order.status];
    if (!next) return null;
    return typeof next === "string" ? next : next[order.fulfillment_method];
  };

  if (loading && !stats) return <FullLoader />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Kafou Shop — Jesyon</h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Pwodwi Aktif" value={stats.total_products} />
          <StatCard label="San Stock" value={stats.out_of_stock_products} />
          <StatCard label="Kòmand An Atant" value={stats.orders_by_status.pending} />
          <StatCard label="Kòmand Fini" value={stats.orders_by_status.completed} />
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
          >
            {f === "all" ? "Tout" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Pa gen kòmand nan kategori sa a.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const next = nextStepFor(o);
            return (
              <div key={o.id} className="border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <Link to={`/kafou-shop/orders/${o.id}`} className="font-mono text-sm font-medium hover:underline">{o.reference}</Link>
                  <span className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</span>
                </div>
                <p className="text-sm mt-1">{o.customer_name} · {o.customer_phone}</p>
                <div className="mt-2 space-y-1">
                  {o.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantity}× {item.title}</span>
                      <span>{formatPrice(item.line_total)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {o.fulfillment_method === "pickup" ? "Vin Pran l" : `Livrezon: ${o.delivery_address}, ${o.delivery_city}`}
                </p>
                {o.notes && <p className="text-xs text-muted-foreground mt-1">Nòt: {o.notes}</p>}

                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-muted">{STATUS_LABELS[o.status]}</span>
                  {next && (
                    <Button size="sm" disabled={updatingId === o.id} onClick={() => updateStatus(o, next)}>
                      {updatingId === o.id ? "..." : `Chanje pou "${STATUS_LABELS[next]}"`}
                    </Button>
                  )}
                  {o.status !== "completed" && o.status !== "cancelled" && (
                    <Button size="sm" variant="outline" disabled={updatingId === o.id} onClick={() => updateStatus(o, "cancelled")}>
                      Anile
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="border rounded-xl p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

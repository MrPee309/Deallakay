import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, MessageCircle, Heart, ShieldCheck, Package, Star } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";

const ICONS = { message: MessageCircle, favorite: Heart, verified: ShieldCheck, listing: Package, review: Star };

export default function Notifications() {
  const { refreshNotif } = useAuth();
  const nav = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const { data } = await api.get("/notifications"); setNotifs(data.notifications); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const readAll = async () => { await api.post("/notifications/read-all"); load(); refreshNotif(); };
  const click = async (n) => {
    await api.post(`/notifications/${n.id}/read`);
    refreshNotif();
    if (n.link) nav(n.link);
    else load();
  };

  if (loading) return <FullLoader />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6" />Notifikasyon</h1>
        {notifs.some((n) => !n.read) && <Button variant="outline" size="sm" onClick={readAll} data-testid="read-all-btn"><Check className="w-4 h-4 mr-1" />Make tout li</Button>}
      </div>
      {notifs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Pa gen notifikasyon.</div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button key={n.id} onClick={() => click(n)} data-testid={`notif-${n.id}`}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${n.read ? "bg-card border-border" : "bg-accent border-primary/20"}`}>
                <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

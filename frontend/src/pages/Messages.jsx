import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Send, ArrowLeft, MessageCircle } from "lucide-react";
import api, { apiError, WS_URL } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Messages() {
  const { user, refreshNotif } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeId = params.get("c");
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  const loadConvs = useCallback(async () => {
    try { const { data } = await api.get("/conversations"); setConvs(data); } catch {}
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  const openConv = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/conversations/${id}/messages`);
      setActive(data.conversation);
      setMessages(data.messages);
      const p = new URLSearchParams(params); p.set("c", id); setParams(p);
      loadConvs();
      refreshNotif();
    } catch (e) { toast_err(e); }
  }, []); // eslint-disable-line

  useEffect(() => { if (activeId) openConv(activeId); }, [activeId]); // eslint-disable-line

  useEffect(() => {
    const token = localStorage.getItem("dl_token");
    if (!token) return;
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.event === "message") {
        setMessages((prev) => (msg.conversation_id === activeIdRef.current ? [...prev, msg.data] : prev));
        loadConvs();
        if (msg.conversation_id === activeIdRef.current) api.get(`/conversations/${activeIdRef.current}/messages`).catch(() => {});
      }
    };
    return () => ws.close();
  }, [loadConvs]);

  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = active?.id; }, [active]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    const content = text;
    setText("");
    try {
      const { data } = await api.post(`/conversations/${active.id}/messages`, { content });
      setMessages((prev) => [...prev, data]);
      loadConvs();
    } catch (e) { toast_err(e); }
  };

  const otherName = (c) => (c.buyer_id === user?.id ? c.seller_username : c.buyer_username);

  return (
    <div className="max-w-6xl mx-auto px-0 md:px-6 py-0 md:py-6">
      <div className="bg-card md:border border-border md:rounded-2xl overflow-hidden flex h-[calc(100vh-8rem)] md:h-[75vh]">
        {/* Conversation list */}
        <div className={`w-full md:w-80 border-r border-border flex-col ${active ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-border font-display font-bold text-lg">Mesaj</div>
          <div className="flex-1 overflow-y-auto">
            {convs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Pa gen konvèsasyon.</div>
            ) : convs.map((c) => (
              <button key={c.id} onClick={() => openConv(c.id)} data-testid={`conv-${c.id}`}
                className={`w-full flex items-center gap-3 p-3 hover:bg-muted text-left border-b border-border/50 ${active?.id === c.id ? "bg-accent" : ""}`}>
                <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0">{c.product_image && <img src={c.product_image} alt="" className="w-full h-full object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center"><span className="font-semibold text-sm truncate">@{otherName(c)}</span>{c.unread > 0 && <span className="bg-primary text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{c.unread}</span>}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.product_title}</div>
                  <div className="text-xs text-muted-foreground/80 truncate">{c.last_message || "..."}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className={`flex-1 flex-col ${active ? "flex" : "hidden md:flex"}`}>
          {active ? (
            <>
              <div className="p-3 border-b border-border flex items-center gap-2">
                <button className="md:hidden p-1" onClick={() => { setActive(null); const p = new URLSearchParams(params); p.delete("c"); setParams(p); }}><ArrowLeft className="w-5 h-5" /></button>
                <Link to={`/product/${active.product_id}`} className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden shrink-0">{active.product_image && <img src={active.product_image} alt="" className="w-full h-full object-cover" />}</div>
                  <div className="min-w-0"><div className="font-semibold text-sm truncate">{active.product_title}</div><div className="text-xs text-muted-foreground">@{otherName(active)}</div></div>
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/30">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-white rounded-br-sm" : "bg-white border border-border rounded-bl-sm"}`}>
                        {m.content}
                        <div className={`text-[10px] mt-0.5 ${mine ? "text-white/70" : "text-muted-foreground"}`}>{timeAgo(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ekri yon mesaj..." data-testid="message-input" className="h-11" />
                <Button type="submit" data-testid="send-message-btn" className="h-11 px-4 bg-primary"><Send className="w-4 h-4" /></Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-2 opacity-40" />
              <p className="text-sm">Chwazi yon konvèsasyon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function toast_err(e) {
  import("sonner").then(({ toast }) => toast.error(apiError(e)));
}

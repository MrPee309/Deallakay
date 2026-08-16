import React from "react";
import { Link } from "react-router-dom";
import { UserPlus, Store, Package, Search, MessageSquare, Handshake, CheckCircle2, ShieldCheck } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";

export function HowItWorks() {
  const steps = [
    { icon: UserPlus, t: "Kreye kont", d: "Enskri gratis epi verifye email ou." },
    { icon: Store, t: "Devni seller", d: "Aksepte règ yo epi aktive kont vandè w." },
    { icon: Package, t: "Mete pwodwi", d: "Chwazi kategori, ajoute foto ak detay." },
    { icon: Search, t: "Achtè jwenn ou", d: "Achtè yo chèche epi jwenn pwodwi w." },
    { icon: MessageSquare, t: "Kominike", d: "Reponn mesaj, WhatsApp oswa apèl." },
    { icon: Handshake, t: "Fè transaction", d: "Rankontre an sekirite epi fè deal la." },
    { icon: CheckCircle2, t: "Mark SOLD", d: "Make pwodwi a vann lè li fini." },
  ];
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-2">Kijan DealLakay mache</h1>
      <p className="text-muted-foreground mb-8">7 etap senp pou achte ak vann teknoloji ann Ayiti.</p>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-4 bg-card border border-border rounded-xl p-5">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><s.icon className="w-5 h-5" /></span>
            <div><div className="font-semibold flex items-center gap-2"><span className="text-primary">{i + 1}.</span> {s.t}</div><p className="text-sm text-muted-foreground mt-0.5">{s.d}</p></div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center"><Link to="/sell"><Button className="h-12 px-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">Kòmanse vann kounye a</Button></Link></div>
    </div>
  );
}

export function Safety() {
  const { safetyMessages } = useApp();
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-8 h-8 text-primary" /><h1 className="font-display text-3xl font-bold">Konsèy Sekirite</h1></div>
      <p className="text-muted-foreground mb-8">Pwoteje tèt ou lè w ap achte oswa vann sou DealLakay.</p>
      <div className="space-y-3">
        {safetyMessages.map((m, i) => (
          <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><p className="text-sm">{m}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

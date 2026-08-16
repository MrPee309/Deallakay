import React, { useState } from "react";
import { toast } from "sonner";
import { Store, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const SELLER_RULES = [
  "Bay enfòmasyon vre sou tout pwodwi.",
  "Pa vann pwodwi vòlè oswa ilegal.",
  "Pa make pyès konpatib kòm orijinal.",
  "Reponn achtè yo ak respè.",
  "Respekte pri ou afiche a.",
];

export default function BecomeSeller({ onDone }) {
  const { user, fetchMe } = useAuth();
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!a || !b) return toast.error("Aksepte tou de kondisyon yo.");
    setLoading(true);
    try {
      await api.post("/seller/become", { accept_seller_terms: a, accept_marketplace_rules: b });
      await fetchMe();
      toast.success("Ou se yon vandè kounye a!");
      onDone && onDone();
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="w-14 h-14 rounded-2xl bg-secondary/20 text-secondary-foreground flex items-center justify-center mb-4">
          <Store className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Devni yon Vandè</h1>
        <p className="text-muted-foreground mt-1">Nenpòt moun ka vann sou DealLakay. Ranpli kondisyon yo epi kòmanse.</p>

        <div className="mt-5 space-y-2">
          <Req ok={user?.email_verified} label="Email verifye" />
          <Req ok={true} label={`Non konplè: ${user?.full_name}`} />
          <Req ok={true} label={`Lokasyon: ${user?.city}, ${user?.department}`} />
        </div>

        <div className="mt-6 bg-muted/50 rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" />Règ Marketplace</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            {SELLER_RULES.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        <div className="mt-5 space-y-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox checked={a} onCheckedChange={(v) => setA(!!v)} data-testid="seller-terms" className="mt-0.5" />
            <span className="text-sm">Mwen aksepte <b>Seller Terms</b> yo.</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox checked={b} onCheckedChange={(v) => setB(!!v)} data-testid="seller-rules" className="mt-0.5" />
            <span className="text-sm">Mwen aksepte <b>Marketplace Rules</b> yo.</span>
          </label>
        </div>

        <Button onClick={submit} disabled={loading || !user?.email_verified} data-testid="become-seller-submit" className="w-full h-11 mt-6 bg-primary font-semibold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aktive kont vandè mwen"}
        </Button>
        {!user?.email_verified && <p className="text-xs text-destructive mt-2 text-center">Verifye email ou anvan ou vin vandè.</p>}
      </div>
    </div>
  );
}

function Req({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className={`w-4 h-4 ${ok ? "text-emerald-500" : "text-muted-foreground/40"}`} />
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

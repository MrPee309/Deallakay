import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import api, { apiError } from "@/lib/api";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setRes(data);
      toast.success(data.message);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8"><Logo size="lg" className="justify-center" /></div>
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <h1 className="font-display text-2xl font-bold mb-1">Bliye modpas?</h1>
        <p className="text-sm text-muted-foreground mb-6">Antre email ou pou resevwa yon lyen reset.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="forgot-email" className="mt-1.5 h-11" autoCapitalize="none" />
          </div>
          <Button type="submit" disabled={loading} data-testid="forgot-submit" className="w-full h-11 bg-primary font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Voye lyen reset"}
          </Button>
        </form>
        {res?.demo_reset_link && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-2">MODE DEMO — klike pou reset:</p>
            <a href={res.demo_reset_link} className="text-sm text-primary font-semibold flex items-center gap-1 break-all hover:underline" data-testid="demo-reset-link">
              <ExternalLink className="w-4 h-4 shrink-0" /> Chanje modpas mwen
            </a>
          </div>
        )}
        <p className="text-sm text-center text-muted-foreground mt-6"><Link to="/login" className="text-primary font-semibold hover:underline">Retounen konekte</Link></p>
      </div>
    </div>
  );
}

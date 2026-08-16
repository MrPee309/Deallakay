import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api, { apiError } from "@/lib/api";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Modpas yo pa menm.");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token: params.get("token"), password });
      toast.success("Modpas chanje!");
      nav("/login");
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8"><Logo size="lg" className="justify-center" /></div>
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <h1 className="font-display text-2xl font-bold mb-6">Chanje modpas</h1>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Nouvo modpas</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="reset-password" className="mt-1.5 h-11" /></div>
          <div><Label>Konfime modpas</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required data-testid="reset-confirm" className="mt-1.5 h-11" /></div>
          <Button type="submit" disabled={loading} data-testid="reset-submit" className="w-full h-11 bg-primary font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Chanje modpas"}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground mt-6"><Link to="/login" className="text-primary font-semibold hover:underline">Retounen konekte</Link></p>
      </div>
    </div>
  );
}

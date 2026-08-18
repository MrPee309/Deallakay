import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiError } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function Login() {
  const { t } = useApp();
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Byenveni!");
      nav(loc.state?.from || "/");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8"><Logo size="lg" className="justify-center" /></div>
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <h1 className="font-display text-2xl font-bold mb-1">{t("signIn")}</h1>
        <p className="text-sm text-muted-foreground mb-6">Konekte ak non itilizatè w oswa email.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>{t("username")} / {t("email")}</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required data-testid="login-username" className="mt-1.5 h-11" autoCapitalize="none" />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <Label>{t("password")}</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">{t("forgotPassword")}</Link>
            </div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password" className="mt-1.5 h-11" />
          </div>
          <Button type="submit" disabled={loading} data-testid="login-submit" className="w-full h-11 bg-primary font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("signIn")}
          </Button>
        </form>
        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground">oswa</span>
          <div className="h-px bg-border flex-1" />
        </div>
        <GoogleAuthButton onSuccess={() => nav(loc.state?.from || "/")} />
        <p className="text-sm text-center text-muted-foreground mt-6">
          {t("noAccount")} <Link to="/register" className="text-primary font-semibold hover:underline">{t("register")}</Link>
        </p>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import api, { apiError } from "@/lib/api";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [state, setState] = useState("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("error"); setMsg("Token manke."); return; }
    (async () => {
      try {
        const { data } = await api.get(`/auth/verify-email?token=${token}`);
        setState("ok"); setMsg(data.message);
      } catch (e) {
        setState("error"); setMsg(apiError(e));
      }
    })();
  }, [params]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <Logo size="lg" className="justify-center mb-8" />
      {state === "loading" && <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />}
      {state === "ok" && (
        <>
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold" data-testid="verify-success">{msg}</h1>
          <Button className="mt-6 h-11 bg-primary" onClick={() => nav("/login")} data-testid="verify-login-btn">Konekte kounye a</Button>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold" data-testid="verify-error">{msg}</h1>
          <Link to="/login"><Button variant="outline" className="mt-6 h-11">Ale nan Konekte</Button></Link>
        </>
      )}
    </div>
  );
}

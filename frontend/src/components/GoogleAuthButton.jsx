import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiError } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("google-identity-script");
    if (existing) {
      existing.addEventListener("load", resolve);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function GoogleAuthButton({ onSuccess }) {
  const { locations } = useApp();
  const { loginWithGoogle } = useAuth();
  const btnRef = useRef(null);
  const [pendingCredential, setPendingCredential] = useState(null);
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dep = locations.find((d) => d.name === department);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await loginWithGoogle(response.credential);
            toast.success("Byenveni!");
            onSuccess?.();
          } catch (e) {
            if (e?.response?.status === 422) {
              // New Google user — need department/city to finish sign-up.
              setPendingCredential(response.credential);
            } else {
              toast.error(apiError(e));
            }
          }
        },
      });
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
        });
      }
    });
    return () => { cancelled = true; };
  }, [loginWithGoogle, onSuccess]);

  const finishSignup = async (e) => {
    e.preventDefault();
    if (!department || !city) return toast.error("Chwazi depatman ak vil ou.");
    setSubmitting(true);
    try {
      await loginWithGoogle(pendingCredential, department, city);
      toast.success("Kont kreye ak Google!");
      onSuccess?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!GOOGLE_CLIENT_ID) return null;

  if (pendingCredential) {
    return (
      <form onSubmit={finishSignup} className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
        <p className="text-sm text-muted-foreground">Yon dènye etap — chwazi kote w ye:</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Depatman</Label>
            <Select value={department} onValueChange={(v) => { setDepartment(v); setCity(""); }}>
              <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{locations.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vil</Label>
            <Select value={city} onValueChange={setCity} disabled={!dep}>
              <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{dep?.cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full h-10 bg-primary font-semibold">
          Fini kreye kont lan
        </Button>
      </form>
    );
  }

  return (
    <div className="flex justify-center">
      <div ref={btnRef} />
    </div>
  );
}

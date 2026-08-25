import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, MailCheck, ExternalLink } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GoogleAuthButton from "@/components/GoogleAuthButton";

// Same country/phone-code list used in the DealLakay Alert mobile app —
// Ayiti listed first since that's the primary user base, but the site
// welcomes registrations from the diaspora too.
const COUNTRY_PHONE = [
  { name: "Ayiti", code: "+509", digits: [8, 8] },
  { name: "United States", code: "+1", digits: [10, 10] },
  { name: "Canada", code: "+1", digits: [10, 10] },
  { name: "Dominican Republic", code: "+1", digits: [10, 10] },
  { name: "France", code: "+33", digits: [9, 9] },
  { name: "Other", code: "", digits: [7, 15] },
];

export default function Register() {
  const { t, locations } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ full_name: "", username: "", email: "", phone: "", password: "", confirm_password: "", country: "Ayiti", department: "", city: "", accept_terms: false });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const dep = locations.find((d) => d.name === f.department);
  const phoneCountry = COUNTRY_PHONE.find((c) => c.name === f.country) || COUNTRY_PHONE[0];

  const submit = async (e) => {
    e.preventDefault();
    if (!f.accept_terms) return toast.error("Aksepte Terms & Conditions.");
    if (f.password !== f.confirm_password) return toast.error("Modpas yo pa menm.");
    const digits = f.phone.replace(/\D/g, "");
    const [lo, hi] = phoneCountry.digits;
    if (digits.length < lo || digits.length > hi) {
      return toast.error(`Nimewo telefòn pa valab pou ${phoneCountry.name} — li dwe gen ${lo === hi ? lo : `${lo}-${hi}`} chif.`);
    }
    setLoading(true);
    try {
      const payload = { ...f, phone: `${phoneCountry.code}${digits}` };
      const { data } = await api.post("/auth/register", payload);
      setDone(data);
      toast.success("Kont kreye!");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4"><MailCheck className="w-8 h-8" /></div>
        <h1 className="font-display text-2xl font-bold">Verifye email ou</h1>
        <p className="text-muted-foreground mt-2">{done.message}</p>
        {done.demo_verification_link && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-amber-800 mb-2">MODE DEMO (SendGrid poko konfigire) — klike pou verifye:</p>
            <a href={done.demo_verification_link} className="text-sm text-primary font-semibold flex items-center gap-1 break-all hover:underline" data-testid="demo-verify-link">
              <ExternalLink className="w-4 h-4 shrink-0" /> Verifye email mwen kounye a
            </a>
          </div>
        )}
        <Button className="mt-6 h-11 bg-primary" onClick={() => nav("/login")} data-testid="go-login-btn">Ale nan Konekte</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8"><Logo size="lg" className="justify-center" /></div>
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <h1 className="font-display text-2xl font-bold mb-6">{t("createAccount")}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("fullName")} v={f.full_name} onC={(v) => set("full_name", v)} testid="reg-fullname" required />
            <Field label={t("username")} v={f.username} onC={(v) => set("username", v)} testid="reg-username" required />
          </div>
          <Field label={t("email")} type="email" v={f.email} onC={(v) => set("email", v)} testid="reg-email" required />

          <div>
            <Label>{t("country")}<span className="text-red-500 ml-0.5">*</span></Label>
            <Select value={f.country} onValueChange={(v) => set("country", v)}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="reg-country"><SelectValue /></SelectTrigger>
              <SelectContent>{COUNTRY_PHONE.map((c) => <SelectItem key={c.name} value={c.name}>{c.code ? `${c.name} (${c.code})` : c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("phone")}<span className="text-red-500 ml-0.5">*</span></Label>
            <div className="flex gap-2 mt-1.5">
              {phoneCountry.code && (
                <span className="h-11 px-3 rounded-md border border-input bg-muted flex items-center text-sm font-medium shrink-0">{phoneCountry.code}</span>
              )}
              <Input
                value={f.phone}
                onChange={(e) => set("phone", e.target.value)}
                required
                data-testid="reg-phone"
                placeholder={phoneCountry.digits[0] === phoneCountry.digits[1] ? `${phoneCountry.digits[0]} chif` : "nimewo w"}
                className="h-11"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("password")} type="password" v={f.password} onC={(v) => set("password", v)} testid="reg-password" required />
            <Field label={t("confirmPassword")} type="password" v={f.confirm_password} onC={(v) => set("confirm_password", v)} testid="reg-confirm" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t("department")}<span className="text-red-500 ml-0.5">*</span></Label>
              <Select value={f.department} onValueChange={(v) => { set("department", v); set("city", ""); }}>
                <SelectTrigger className="mt-1.5 h-11" data-testid="reg-department"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{locations.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("city")}<span className="text-red-500 ml-0.5">*</span></Label>
              <Select value={f.city} onValueChange={(v) => set("city", v)} disabled={!dep}>
                <SelectTrigger className="mt-1.5 h-11" data-testid="reg-city"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{dep?.cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <Checkbox checked={f.accept_terms} onCheckedChange={(v) => set("accept_terms", !!v)} data-testid="reg-terms" className="mt-0.5" />
            <span className="text-sm text-muted-foreground">{t("acceptTerms")}</span>
          </label>
          <Button type="submit" disabled={loading} data-testid="reg-submit" className="w-full h-11 bg-primary font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("createAccount")}
          </Button>
        </form>
        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground">oswa</span>
          <div className="h-px bg-border flex-1" />
        </div>
        <GoogleAuthButton onSuccess={() => nav("/")} />
        <p className="text-sm text-center text-muted-foreground mt-6">
          {t("alreadyAccount")} <Link to="/login" className="text-primary font-semibold hover:underline">{t("signIn")}</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, v, onC, type = "text", testid, required, placeholder }) {
  return (
    <div>
      <Label>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      <Input type={type} value={v} onChange={(e) => onC(e.target.value)} required={required} data-testid={testid} placeholder={placeholder} className="mt-1.5 h-11" autoCapitalize={type === "email" ? "none" : undefined} />
    </div>
  );
}

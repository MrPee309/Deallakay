import React from "react";
import { BadgeCheck, Mail, Phone, ShieldCheck, Smartphone } from "lucide-react";

const MAP = {
  email: { icon: Mail, label: "Email", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  phone: { icon: Phone, label: "Telefòn", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  seller: { icon: ShieldCheck, label: "Vandè Verifye", cls: "bg-primary/10 text-primary border-primary/20" },
  imei: { icon: Smartphone, label: "IMEI", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

export function VerifBadge({ type, testid }) {
  const m = MAP[type];
  if (!m) return null;
  const Icon = m.icon;
  return (
    <span data-testid={testid} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${m.cls}`}>
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

export function SellerBadges({ seller, size = "sm" }) {
  if (!seller) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {seller.email_verified && <VerifBadge type="email" />}
      {seller.phone_verified && <VerifBadge type="phone" />}
      {seller.seller_verified && <VerifBadge type="seller" />}
    </div>
  );
}

export function VerifiedTick({ seller }) {
  if (seller?.seller_verified) return <BadgeCheck className="w-4 h-4 text-primary inline" data-testid="verified-tick" />;
  return null;
}

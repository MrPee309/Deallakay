import React from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";

export default function Logo({ size = "md", className = "" }) {
  const { branding } = useApp();
  const dims = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" }[size];
  const text = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];
  const name = branding?.siteName || "DealLakay";
  return (
    <Link to="/" className={`flex items-center gap-2 group ${className}`} data-testid="site-logo">
      <img src="/deallakay-icon.png" alt={name} className={`${dims} rounded-xl shadow-sm group-hover:scale-105 transition-transform`} />
      <span className={`font-display font-800 ${text} tracking-tight text-foreground`} style={{ fontWeight: 800 }}>
        {name.replace(/Lakay$/i, "")}<span className="text-primary">{name.match(/Lakay$/i) ? "Lakay" : ""}</span>
      </span>
    </Link>
  );
}

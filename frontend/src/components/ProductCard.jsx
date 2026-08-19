import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Eye, Heart, BadgeCheck } from "lucide-react";
import { formatPrice, timeAgo } from "@/lib/format";
import { useApp } from "@/contexts/AppContext";

const CONDITION_COLORS = {
  New: "bg-emerald-100 text-emerald-800",
  "Like New": "bg-teal-100 text-teal-800",
  Good: "bg-blue-100 text-blue-800",
  Fair: "bg-amber-100 text-amber-800",
  Used: "bg-slate-100 text-slate-700",
  "For Parts / Repair": "bg-rose-100 text-rose-800",
};

export default function ProductCard({ product, index = 0 }) {
  const { branding, lang } = useApp();
  const img = product.images?.[0];
  const isSold = product.status === "sold";
  const outOfStock = !isSold && product.quantity != null && product.quantity <= 0;
  return (
    <Link
      to={`/product/${product.slug || product.id}`}
      data-testid={`product-card-${product.id}`}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-md transition-transform transition-shadow duration-200 flex flex-col animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {img ? (
          <img src={img} alt={product.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Pa gen foto</div>
        )}
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-destructive text-white font-display font-bold px-4 py-1.5 rounded-lg text-sm rotate-[-8deg]">VANN</span>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-slate-700 text-white font-display font-bold px-4 py-1.5 rounded-lg text-sm">PA GEN ANKÒ</span>
          </div>
        )}
        <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${CONDITION_COLORS[product.condition] || "bg-slate-100 text-slate-700"}`}>
          {product.condition}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
        <p className="text-lg font-display font-bold text-primary" style={{ fontWeight: 700 }}>
          {formatPrice(product.price, product.currency || branding.currency)}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{product.city}, {product.department}</span>
        </div>
        <div className="flex items-center justify-between mt-auto pt-1.5 text-[11px] text-muted-foreground border-t border-border/60">
          <span className="flex items-center gap-1 truncate">
            @{product.seller_username}
          </span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{product.views || 0}</span>
            <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{product.favorites_count || 0}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import api from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { FullLoader } from "@/components/Layout";

export default function Favorites() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/favorites"); setProducts(data); } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <FullLoader />;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <h1 className="font-display text-2xl font-bold mb-5 flex items-center gap-2"><Heart className="w-6 h-6 text-rose-500" />Favori</h1>
      {products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground" data-testid="no-favorites">Ou poko gen favori.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Phone, MapPin } from "lucide-react";
import api from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { FullLoader } from "@/components/Layout";

export default function KafouShop() {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [storeRes, productsRes] = await Promise.all([
          api.get("/kafou-shop/store").catch(() => ({ data: null })),
          api.get("/kafou-shop/products"),
        ]);
        setStore(storeRes.data);
        setProducts(productsRes.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <FullLoader />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start gap-4 border-b pb-6 mb-6">
        {store?.logo ? (
          <img src={store.logo} alt={store.name} className="w-16 h-16 rounded-xl object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Store className="w-8 h-8 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{store?.name || "Kafou Shop"}</h1>
          {store?.description && <p className="text-muted-foreground mt-1">{store.description}</p>}
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {store?.contact_phone && (
              <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {store.contact_phone}</span>
            )}
            {store?.pickup_location && (
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {store.pickup_location}</span>
            )}
          </div>
        </div>
      </div>

      {store?.status === "suspended" ? (
        <p className="text-center text-muted-foreground py-12">Magazen sa a sispann pou kounye a.</p>
      ) : store?.status === "temporarily_unavailable" ? (
        <p className="text-center text-muted-foreground py-12">Magazen sa a pa disponib kounye a. Tounen pita.</p>
      ) : products.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Pa gen pwodwi disponib kounye a.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/kafou-shop/product/${p.slug}`}
              className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-muted">
                {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
              </div>
              <div className="p-3">
                <p className="font-medium line-clamp-2 text-sm">{p.title}</p>
                <p className="text-primary font-bold mt-1">{formatPrice(p.price)}</p>
                {p.quantity <= 0 && <p className="text-xs text-destructive mt-1">Pa gen stock</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

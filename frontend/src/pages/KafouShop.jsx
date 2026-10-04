import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Store, Phone, MapPin, Clock, ShieldCheck, Truck, Search, Filter, ShoppingCart, MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { FullLoader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Debounced search — avoids a request on every keystroke (spec §4).
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function KafouShop() {
  const [store, setStore] = useState(null);
  const [storeError, setStoreError] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [activeCategory, setActiveCategory] = useState(null);
  const [sort, setSort] = useState("newest");

  // Store profile + category list load once.
  useEffect(() => {
    api.get("/kafou-shop/store").then(({ data }) => setStore(data)).catch(() => setStoreError(true));
    api.get("/kafou-shop/categories").then(({ data }) => setCategories(data)).catch(() => undefined);
  }, []);

  const loadProducts = useCallback(() => {
    setLoading(true);
    setProductsError(false);
    const params = { sort };
    if (debouncedSearch) params.q = debouncedSearch;
    if (activeCategory) params.category = activeCategory;
    api
      .get("/kafou-shop/products", { params })
      .then(({ data }) => setProducts(data))
      .catch(() => setProductsError(true))
      .finally(() => setLoading(false));
  }, [debouncedSearch, activeCategory, sort]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  if (storeError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Kafou Shop pa disponib kounye a. Tanpri eseye ankò pita.</p>
      </div>
    );
  }
  if (!store) return <FullLoader />;

  const isOpen = store.status === "active";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* ── Store banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 border mb-6">
        <div className="flex flex-col md:flex-row">
          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-start gap-4">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-900 flex flex-col items-center justify-center flex-shrink-0">
                  <Store className="w-7 h-7 text-white" />
                  <span className="text-[9px] font-bold text-amber-400 mt-0.5">SHOP</span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{store.name}</h1>
                  {/* Only an operational status indicator (real data), never
                      a fabricated "verified" trust badge (spec §2.B). */}
                  {isOpen && <ShieldCheck className="w-5 h-5 text-blue-600" />}
                </div>
                {store.description && <p className="text-muted-foreground mt-1 max-w-lg">{store.description}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-5 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="w-4 h-4 text-primary" /> Pwodwi orijinal</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="w-4 h-4 text-primary" /> Bon kalite</span>
              {(store.pickup_location || store.whatsapp_number) && (
                <span className="flex items-center gap-1.5 text-muted-foreground"><Truck className="w-4 h-4 text-primary" /> Livrezon & Retire lokal</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-6">
        {/* ── Category sidebar ── */}
        <aside className="hidden lg:block">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Filter className="w-4 h-4" /> Kategori</h2>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!activeCategory ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
            >
              Tout pwodwi
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                onClick={() => setActiveCategory(c.category)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between ${activeCategory === c.category ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
              >
                <span>{c.category}</span>
                <span className="text-xs opacity-60">{c.count}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main product area ── */}
        <main>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chèche nan Kafou Shop..."
                className="pl-9"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Pi resan</SelectItem>
                <SelectItem value="price_asc">Pri: Piba a Pi Wo</SelectItem>
                <SelectItem value="price_desc">Pri: Pi Wo a Piba</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile category chips — the sidebar is desktop-only (lg:), so
              small screens need another way to filter by category. */}
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-3 mb-2 -mt-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${!activeCategory ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
            >
              Tout
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                onClick={() => setActiveCategory(c.category)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${activeCategory === c.category ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
              >
                {c.category}
              </button>
            ))}
          </div>

          {loading ? (
            <FullLoader />
          ) : productsError ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-3">Nou pa t ka chaje pwodwi yo.</p>
              <Button variant="outline" onClick={loadProducts}>Eseye Ankò</Button>
            </div>
          ) : store.status !== "active" ? (
            <p className="text-center text-muted-foreground py-12">
              {store.status === "suspended" ? "Magazen sa a sispann pou kounye a." : "Magazen sa a pa disponib kounye a. Tounen pita."}
            </p>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {debouncedSearch || activeCategory ? "Pa gen pwodwi ki matche rechèch ou a." : "Pa gen pwodwi disponib kounye a."}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </main>

        {/* ── Store info panel ── */}
        <aside className="space-y-4">
          <div className="border rounded-xl p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Store className="w-4 h-4" /> Enfòmasyon Boutik la</h2>
            <p className="font-medium">{store.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{store.description}</p>
            <div className="mt-3 space-y-2 text-sm">
              {store.contact_phone && (
                <a href={`tel:${store.contact_phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Phone className="w-4 h-4" /> {store.contact_phone}
                </a>
              )}
              {store.pickup_location && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {store.pickup_location}
                </p>
              )}
              {store.business_hours && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" /> {store.business_hours}
                </p>
              )}
            </div>
          </div>

          {store.pickup_location && (
            <div className="border rounded-xl p-4 space-y-3 text-sm">
              <div className="flex gap-2">
                <Truck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Livrezon</p>
                  <p className="text-muted-foreground">Chwazi livrezon lè ou kòmande.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Store className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Retire Lokal</p>
                  <p className="text-muted-foreground">Ranmase kòmand ou nan boutik la.</p>
                </div>
              </div>
            </div>
          )}

          {/* Only rendered when a real WhatsApp number is configured —
              never an invented contact method (spec §2.E / §4). */}
          {store.whatsapp_number ? (
            <a
              href={`https://wa.me/${store.whatsapp_number.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-medium text-sm"
            >
              <MessageCircle className="w-4 h-4" /> Ekri sou WhatsApp
            </a>
          ) : (
            store.contact_phone && (
              <a href={`tel:${store.contact_phone}`} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm">
                <Phone className="w-4 h-4" /> Kontakte Boutik la
              </a>
            )
          )}
        </aside>
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const [added, setAdded] = useState(false);
  const outOfStock = product.quantity <= 0;

  return (
    <div className="border rounded-xl overflow-hidden flex flex-col">
      <Link to={`/kafou-shop/product/${product.slug}`} className="aspect-square bg-muted block">
        {product.images?.[0] && <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />}
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <Link to={`/kafou-shop/product/${product.slug}`}>
          <p className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{product.title}</p>
        </Link>
        {(product.specs?.brand || product.specs?.model) && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {[product.specs.brand, product.specs.model].filter(Boolean).join(" ")}
          </p>
        )}
        <p className="text-primary font-bold mt-1">{formatPrice(product.price)}</p>
        <p className={`text-xs mt-0.5 flex items-center gap-1 ${outOfStock ? "text-destructive" : "text-green-600"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${outOfStock ? "bg-destructive" : "bg-green-600"}`} />
          {outOfStock ? "San stòk" : "Nan stòk"}
        </p>
        <Link to={`/kafou-shop/product/${product.slug}`} className="mt-auto pt-2">
          <Button size="sm" className="w-full" disabled={outOfStock}>
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Kòmande
          </Button>
        </Link>
      </div>
    </div>
  );
}

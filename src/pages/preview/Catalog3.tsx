import { useState, useMemo } from "react";
import { Search, Heart, Plus, Minus, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  sampleProducts, getPartnerPrice, getSaving, getStockStatus, formatUSD, getFamilies,
  type SampleProduct,
} from "./sampleProducts";

export default function Catalog3() {
  const [search, setSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<SampleProduct | null>(null);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [qty, setQtyVal] = useState(1);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const families = useMemo(() => ["all", ...Array.from(getFamilies().keys())], []);

  const filtered = useMemo(() => {
    let items = sampleProducts;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (selectedFamily !== "all") items = items.filter(p => p.family === selectedFamily);
    return items;
  }, [search, selectedFamily]);

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return sampleProducts.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 3);
  }, [selectedProduct]);

  const toggleFav = (id: string) => {
    setFavourites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleAdd = (id: string) => {
    setAddedItems(prev => new Set(prev).add(id));
    setTimeout(() => setAddedItems(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
  };

  return (
    <div className="flex flex-1 min-h-0" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left: list */}
      <div className="w-full md:w-1/2 flex flex-col border-r bg-white overflow-hidden">
        <div className="p-4 space-y-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={selectedFamily} onValueChange={setSelectedFamily}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All families" />
            </SelectTrigger>
            <SelectContent>
              {families.map(f => (
                <SelectItem key={f} value={f}>{f === "all" ? "All Families" : f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map(p => {
            const stock = getStockStatus(p.stock_qty);
            const active = selectedProduct?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setSelectedProduct(p); setQtyVal(1); }}
                className={`w-full text-left px-4 py-3.5 border-b flex items-center gap-3 transition-colors ${
                  active ? "bg-[#1B3A6B]/5 border-l-4 border-l-[#1B3A6B]" : "border-l-4 border-l-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                  <p className="font-semibold text-sm truncate text-foreground">{p.name}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="font-bold text-sm text-[#1B3A6B]">{formatUSD(getPartnerPrice(p.list_price_usd))}</p>
                  <span className={`h-2 w-2 rounded-full inline-block ${stock.dot}`} />
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No products found.</div>
          )}
        </div>
      </div>

      {/* Right: detail */}
      <div className="hidden md:flex md:w-1/2 flex-col overflow-y-auto bg-[#F8F9FA]">
        {!selectedProduct ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <span className="text-4xl font-bold text-[#1B3A6B]/10 tracking-tight">TF USA</span>
            <p className="text-sm">Select a product to view details</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-foreground">{selectedProduct.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="font-mono text-xs">{selectedProduct.sku}</Badge>
                <Badge variant="outline" className="text-xs text-[#1B3A6B] border-[#1B3A6B]/30">{selectedProduct.category}</Badge>
              </div>
            </div>

            {/* Stock */}
            {(() => {
              const stock = getStockStatus(selectedProduct.stock_qty);
              return (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${stock.bg} ${stock.color}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${stock.dot}`} />
                  {stock.label} {selectedProduct.stock_qty > 0 && `(${selectedProduct.stock_qty} units)`}
                </div>
              );
            })()}

            {/* Pricing */}
            <div className="bg-white rounded-xl p-5 border space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">List price</span>
                <span className="text-muted-foreground line-through">{formatUSD(selectedProduct.list_price_usd)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-[#1B3A6B]">Your price — 25% discount applied</span>
                <span className="text-[32px] font-bold text-[#1B3A6B]">{formatUSD(getPartnerPrice(selectedProduct.list_price_usd))}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-green-600">You save per unit</span>
                <span className="text-green-600 font-semibold">{formatUSD(getSaving(selectedProduct.list_price_usd))}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedProduct.description}</p>
            </div>

            {/* Qty + Add */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg bg-white">
                  <button onClick={() => setQtyVal(Math.max(1, qty - 1))} className="h-12 w-12 flex items-center justify-center hover:bg-muted">
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="w-14 text-center text-lg font-semibold">{qty}</span>
                  <button onClick={() => setQtyVal(qty + 1)} className="h-12 w-12 flex items-center justify-center hover:bg-muted">
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {addedItems.has(selectedProduct.id) ? (
                <Button className="w-full h-12 bg-green-600 hover:bg-green-600 text-base" disabled>
                  <ShoppingCart className="h-5 w-5 mr-2" /> Added to basket!
                </Button>
              ) : (
                <Button
                  className="w-full h-12 bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-base"
                  onClick={() => handleAdd(selectedProduct.id)}
                  disabled={selectedProduct.stock_qty === 0}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" /> Add to basket
                </Button>
              )}

              <button onClick={() => toggleFav(selectedProduct.id)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#CC2027] transition-colors">
                <Heart className={`h-4 w-4 ${favourites.has(selectedProduct.id) ? "fill-[#CC2027] text-[#CC2027]" : ""}`} />
                {favourites.has(selectedProduct.id) ? "Remove from favourites" : "Add to favourites"}
              </button>
            </div>

            {/* Related */}
            {relatedProducts.length > 0 && (
              <div className="border-t pt-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Related products</h3>
                <div className="grid grid-cols-3 gap-3">
                  {relatedProducts.map(rp => (
                    <button
                      key={rp.id}
                      onClick={() => { setSelectedProduct(rp); setQtyVal(1); }}
                      className="bg-white border rounded-lg p-3 text-left hover:shadow-md transition-shadow"
                    >
                      <p className="font-mono text-[10px] text-muted-foreground">{rp.sku}</p>
                      <p className="text-xs font-medium mt-1 line-clamp-2">{rp.name}</p>
                      <p className="text-sm font-bold text-[#1B3A6B] mt-1">{formatUSD(getPartnerPrice(rp.list_price_usd))}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

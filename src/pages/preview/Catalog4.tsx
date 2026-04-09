import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Heart, Plus, Minus, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  sampleProducts, getPartnerPrice, getSaving, getStockStatus, formatUSD, getFamilies,
} from "./sampleProducts";

const familyColors: Record<string, string> = {
  "Filter Cartridges": "bg-blue-500",
  "Membranes": "bg-purple-500",
  "Housings & Systems": "bg-amber-500",
  "UV & Sterilisation": "bg-teal-500",
  "Testing & Monitoring": "bg-rose-500",
};

export default function Catalog4() {
  const [search, setSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const families = useMemo(() => getFamilies(), []);

  const showResults = search.length > 0 || selectedFamily !== null;

  const filtered = useMemo(() => {
    let items = sampleProducts;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    if (selectedFamily) items = items.filter(p => p.family === selectedFamily);
    return items;
  }, [search, selectedFamily]);

  // Family counts for filter chips
  const familyCounts = useMemo(() => {
    const base = search
      ? sampleProducts.filter(p => {
          const q = search.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
        })
      : sampleProducts;
    const map: Record<string, number> = {};
    base.forEach(p => { map[p.family] = (map[p.family] || 0) + 1; });
    return map;
  }, [search]);

  const toggleFav = (id: string) => {
    setFavourites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const getQty = (id: string) => quantities[id] || 1;
  const setQty = (id: string, v: number) => setQuantities(prev => ({ ...prev, [id]: Math.max(1, v) }));

  const handleAdd = (id: string) => {
    setAddedItems(prev => new Set(prev).add(id));
    setTimeout(() => setAddedItems(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
  };

  // Keyboard handling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearch(""); setSelectedFamily(null); inputRef.current?.blur(); }
      if (e.key === "/" && document.activeElement !== inputRef.current) { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex-1 bg-white pb-24">
      <div className="max-w-[900px] mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B3A6B]">What are you looking for?</h1>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={search}
              onChange={e => { setSearch(e.target.value); }}
              className="w-full h-14 pl-14 pr-4 rounded-2xl border-2 border-muted text-lg focus:outline-none focus:border-[#1B3A6B] transition-colors bg-white shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm">
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Press <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">/</kbd> to search · <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">Esc</kbd> to clear</p>
        </div>

        {!showResults ? (
          /* Category overview */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from(families.entries()).map(([family, cats]) => {
              const count = sampleProducts.filter(p => p.family === family).length;
              return (
                <button
                  key={family}
                  onClick={() => setSelectedFamily(family)}
                  className="text-left bg-white border-2 border-muted rounded-xl p-5 hover:border-[#1B3A6B] hover:shadow-md transition-all group"
                >
                  <div className={`h-1.5 w-10 rounded-full ${familyColors[family] || "bg-gray-400"} mb-3`} />
                  <h3 className="font-bold text-foreground group-hover:text-[#1B3A6B] transition-colors">{family}</h3>
                  <p className="text-muted-foreground text-sm">{count} products</p>
                  <p className="text-xs text-muted-foreground mt-2">{Array.from(cats).join(", ")}</p>
                </button>
              );
            })}
          </div>
        ) : (
          /* Results */
          <div className="space-y-4">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(familyCounts).map(([fam, count]) => (
                <button
                  key={fam}
                  onClick={() => setSelectedFamily(selectedFamily === fam ? null : fam)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedFamily === fam
                      ? "bg-[#1B3A6B] text-white"
                      : "bg-muted text-foreground hover:bg-[#1B3A6B]/10"
                  }`}
                >
                  {fam} ({count})
                </button>
              ))}
              {selectedFamily && (
                <button onClick={() => setSelectedFamily(null)} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Clear filter
                </button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{filtered.length} results</p>

            {/* Results list */}
            <div className="space-y-1">
              {filtered.map(p => {
                const stock = getStockStatus(p.stock_qty);
                const justAdded = addedItems.has(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-[#F8F9FA] transition-colors group"
                  >
                    {/* Family bar */}
                    <div className={`w-1 h-10 rounded-full shrink-0 ${familyColors[p.family] || "bg-gray-400"}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground shrink-0 w-20">{p.sku}</span>
                      <span className="font-semibold text-sm truncate">{p.name}</span>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stock.bg} ${stock.color}`}>{stock.label}</span>
                      <span className="text-sm text-muted-foreground line-through hidden sm:inline">{formatUSD(p.list_price_usd)}</span>
                      <span className="font-bold text-[#1B3A6B]">{formatUSD(getPartnerPrice(p.list_price_usd))}</span>

                      {/* Favourite */}
                      <button onClick={() => toggleFav(p.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Heart className={`h-4 w-4 ${favourites.has(p.id) ? "fill-[#CC2027] text-[#CC2027] opacity-100" : "text-muted-foreground"}`} />
                      </button>

                      {/* Add */}
                      {justAdded ? (
                        <span className="text-green-600 text-xs font-medium w-16 text-center">Added!</span>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={p.stock_qty === 0}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-3 space-y-2" align="end">
                            <p className="text-xs font-medium">Quantity</p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center border rounded">
                                <button onClick={() => setQty(p.id, getQty(p.id) - 1)} className="h-8 w-8 flex items-center justify-center hover:bg-muted">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-8 text-center text-sm">{getQty(p.id)}</span>
                                <button onClick={() => setQty(p.id, getQty(p.id) + 1)} className="h-8 w-8 flex items-center justify-center hover:bg-muted">
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="w-full h-8 bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-xs"
                              onClick={() => handleAdd(p.id)}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" /> Add to basket
                            </Button>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">No products match your search.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

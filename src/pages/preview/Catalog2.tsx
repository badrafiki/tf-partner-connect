import { useState, useMemo } from "react";
import { Search, Heart, Plus, Minus, ShoppingCart, Filter as FilterIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  sampleProducts, getPartnerPrice, getSaving, getStockStatus, formatUSD, getFamilies,
} from "./sampleProducts";

type SortKey = "name-asc" | "price-low" | "price-high";

export default function Catalog2() {
  const [search, setSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const families = useMemo(() => Array.from(getFamilies().keys()), []);
  const categories = useMemo(() => {
    if (!selectedFamily) return [];
    return Array.from(getFamilies().get(selectedFamily) || []);
  }, [selectedFamily]);

  const filtered = useMemo(() => {
    let items = [...sampleProducts];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (selectedFamily) items = items.filter(p => p.family === selectedFamily);
    if (selectedCategory) items = items.filter(p => p.category === selectedCategory);
    if (inStockOnly) items = items.filter(p => p.stock_qty > 0);
    items.sort((a, b) => {
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "price-low") return getPartnerPrice(a.list_price_usd) - getPartnerPrice(b.list_price_usd);
      return getPartnerPrice(b.list_price_usd) - getPartnerPrice(a.list_price_usd);
    });
    return items;
  }, [search, selectedFamily, selectedCategory, inStockOnly, sort]);

  const toggleFav = (id: string) => {
    setFavourites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleAdd = (id: string) => {
    setAddedItems(prev => new Set(prev).add(id));
    setAddingCard(null);
    setTimeout(() => setAddedItems(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
  };

  const getQty = (id: string) => quantities[id] || 1;
  const setQty = (id: string, v: number) => setQuantities(prev => ({ ...prev, [id]: Math.max(1, v) }));

  return (
    <div className="flex-1 bg-[#F8F9FA] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Search */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-12 h-12 text-base rounded-xl shadow-sm border-muted bg-white"
          />
        </div>

        {/* Family pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => { setSelectedFamily(null); setSelectedCategory(null); }}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !selectedFamily ? "bg-[#1B3A6B] text-white shadow-md" : "bg-white text-foreground border hover:border-[#1B3A6B]"
            }`}
          >
            All
          </button>
          {families.map(f => (
            <button
              key={f}
              onClick={() => { setSelectedFamily(f); setSelectedCategory(null); }}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedFamily === f ? "bg-[#1B3A6B] text-white shadow-md" : "bg-white text-foreground border hover:border-[#1B3A6B]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Category chips + controls */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 0 && categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === c ? "bg-[#1B3A6B]/15 text-[#1B3A6B] border border-[#1B3A6B]/30" : "bg-white text-muted-foreground border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={inStockOnly} onCheckedChange={setInStockOnly} />
              In stock
            </label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[160px] h-9 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="price-low">Price: Low–High</SelectItem>
                <SelectItem value="price-high">Price: High–Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground">Showing {filtered.length} products</p>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => {
            const stock = getStockStatus(p.stock_qty);
            const isAdding = addingCard === p.id;
            const justAdded = addedItems.has(p.id);
            return (
              <div key={p.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden">
                {/* Top */}
                <div className="p-4 pb-2 flex items-start justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                  <button onClick={() => toggleFav(p.id)} className="absolute top-4 right-4">
                    <Heart className={`h-5 w-5 transition-colors ${favourites.has(p.id) ? "fill-[#CC2027] text-[#CC2027]" : "text-muted-foreground hover:text-[#CC2027]"}`} />
                  </button>
                </div>

                {/* Body */}
                <div className="px-4 flex-1 space-y-2">
                  <h3 className="font-semibold text-base leading-tight line-clamp-2 text-foreground">{p.name}</h3>
                  <Badge variant="outline" className="text-xs text-[#1B3A6B] border-[#1B3A6B]/30 bg-[#1B3A6B]/5">{p.category}</Badge>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${stock.dot}`} />
                    <span className={`text-xs font-medium ${stock.color}`}>{stock.label}</span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="px-4 pt-3 mt-2 border-t space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground text-sm line-through">{formatUSD(p.list_price_usd)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[#1B3A6B] text-[22px] font-bold">{formatUSD(getPartnerPrice(p.list_price_usd))}</span>
                    <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-0.5 rounded-full">Save {formatUSD(getSaving(p.list_price_usd))}</span>
                  </div>
                </div>

                {/* Action */}
                <div className="p-4 pt-3">
                  {justAdded ? (
                    <div className="h-10 flex items-center justify-center text-green-600 font-medium text-sm gap-1">
                      <ShoppingCart className="h-4 w-4" /> Added to basket!
                    </div>
                  ) : isAdding ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-lg">
                        <button onClick={() => setQty(p.id, getQty(p.id) - 1)} className="h-10 w-10 flex items-center justify-center hover:bg-muted">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center font-medium">{getQty(p.id)}</span>
                        <button onClick={() => setQty(p.id, getQty(p.id) + 1)} className="h-10 w-10 flex items-center justify-center hover:bg-muted">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <Button className="flex-1 h-10 bg-[#1B3A6B] hover:bg-[#1B3A6B]/90" onClick={() => handleAdd(p.id)}>
                        Add to basket
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full h-10 bg-[#1B3A6B] hover:bg-[#1B3A6B]/90"
                      onClick={() => setAddingCard(p.id)}
                      disabled={p.stock_qty === 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" /> Add to basket
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No products match your filters.</div>
        )}
      </div>
    </div>
  );
}

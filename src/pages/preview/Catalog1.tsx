import { useState, useMemo } from "react";
import { Search, Heart, Plus, Minus, ShoppingCart, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  sampleProducts, getPartnerPrice, getSaving, getStockStatus, formatUSD, getFamilies,
  type SampleProduct,
} from "./sampleProducts";

export default function Catalog1() {
  const [search, setSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [addingRow, setAddingRow] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const families = useMemo(() => getFamilies(), []);

  const filtered = useMemo(() => {
    let items = sampleProducts;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (selectedFamily) items = items.filter(p => p.family === selectedFamily);
    if (selectedCategory) items = items.filter(p => p.category === selectedCategory);
    if (inStockOnly) items = items.filter(p => p.stock_qty > 0);
    if (favouritesOnly) items = items.filter(p => favourites.has(p.id));
    return items;
  }, [search, selectedFamily, selectedCategory, inStockOnly, favouritesOnly, favourites]);

  const toggleFav = (id: string) => {
    setFavourites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = (id: string) => {
    setAddedItems(prev => new Set(prev).add(id));
    setAddingRow(null);
    setTimeout(() => setAddedItems(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
  };

  const getQty = (id: string) => quantities[id] || 1;
  const setQty = (id: string, v: number) => setQuantities(prev => ({ ...prev, [id]: Math.max(1, v) }));

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] border-r bg-white shrink-0 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <button
            onClick={() => { setSelectedFamily(null); setSelectedCategory(null); }}
            className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
              !selectedFamily ? "bg-[#1B3A6B]/10 text-[#1B3A6B] border-l-[3px] border-[#1B3A6B]" : "text-foreground hover:bg-muted"
            }`}
          >
            All Products <span className="text-muted-foreground">({sampleProducts.length})</span>
          </button>

          <div className="space-y-1">
            {Array.from(families.entries()).map(([family, cats]) => {
              const count = sampleProducts.filter(p => p.family === family).length;
              const isActive = selectedFamily === family && !selectedCategory;
              return (
                <div key={family}>
                  <button
                    onClick={() => { setSelectedFamily(family); setSelectedCategory(null); }}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                      isActive ? "bg-[#1B3A6B]/10 text-[#1B3A6B] border-l-[3px] border-[#1B3A6B]" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {family} <span className="text-muted-foreground font-normal">({count})</span>
                  </button>
                  {selectedFamily === family && (
                    <div className="ml-4 space-y-0.5 mt-0.5">
                      {Array.from(cats).map(cat => {
                        const catCount = sampleProducts.filter(p => p.category === cat).length;
                        const catActive = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full text-left px-3 py-1 rounded text-sm transition-colors ${
                              catActive ? "text-[#1B3A6B] font-medium border-l-[3px] border-[#1B3A6B] bg-[#1B3A6B]/5" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {cat} <span className="text-muted-foreground">({catCount})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t pt-4 space-y-3">
            <label className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Heart className="h-4 w-4" /> Favourites only</span>
              <Switch checked={favouritesOnly} onCheckedChange={setFavouritesOnly} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> In stock only</span>
              <Switch checked={inStockOnly} onCheckedChange={setInStockOnly} />
            </label>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {/* Mobile search */}
        <div className="md:hidden p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b flex items-center justify-between text-sm text-muted-foreground bg-white">
          <span>
            Showing {filtered.length} of {sampleProducts.length} products
            {selectedFamily && <span className="ml-1">in <strong className="text-foreground">{selectedCategory || selectedFamily}</strong></span>}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">List</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">Your Price</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24 hidden md:table-cell">Saving</th>
                <th className="px-4 py-3 w-36"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const stock = getStockStatus(p.stock_qty);
                const expanded = expandedRow === p.id;
                const isAdding = addingRow === p.id;
                const justAdded = addedItems.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${i % 2 === 1 ? "bg-[#FAFAFA]" : "bg-white"}`}
                    onClick={() => setExpandedRow(expanded ? null : p.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground align-top">{p.sku}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-foreground">{p.name}</div>
                      {expanded && <p className="text-muted-foreground text-xs mt-1 max-w-md">{p.description}</p>}
                      {!expanded && <p className="text-muted-foreground text-xs mt-0.5 truncate max-w-xs">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell align-top">{p.category}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${stock.color}`}>
                        <span className={`h-2 w-2 rounded-full ${stock.dot}`} />
                        {stock.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground line-through align-top">{formatUSD(p.list_price_usd)}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#1B3A6B] align-top">{formatUSD(getPartnerPrice(p.list_price_usd))}</td>
                    <td className="px-4 py-3 text-right text-green-600 text-xs hidden md:table-cell align-top">-{formatUSD(getSaving(p.list_price_usd))}</td>
                    <td className="px-4 py-3 align-top" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        {justAdded ? (
                          <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                            <ShoppingCart className="h-3.5 w-3.5" /> Added!
                          </span>
                        ) : isAdding ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => setQty(p.id, getQty(p.id) - 1)} className="h-7 w-7 flex items-center justify-center rounded border hover:bg-muted">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">{getQty(p.id)}</span>
                            <button onClick={() => setQty(p.id, getQty(p.id) + 1)} className="h-7 w-7 flex items-center justify-center rounded border hover:bg-muted">
                              <Plus className="h-3 w-3" />
                            </button>
                            <Button size="sm" className="h-7 text-xs bg-[#1B3A6B] hover:bg-[#1B3A6B]/90" onClick={() => handleAdd(p.id)}>
                              Add
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setAddingRow(p.id)}
                            disabled={p.stock_qty === 0}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add
                          </Button>
                        )}
                        <button onClick={() => toggleFav(p.id)} className="ml-1">
                          <Heart className={`h-4 w-4 transition-colors ${favourites.has(p.id) ? "fill-[#CC2027] text-[#CC2027]" : "text-muted-foreground hover:text-[#CC2027]"}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">No products match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

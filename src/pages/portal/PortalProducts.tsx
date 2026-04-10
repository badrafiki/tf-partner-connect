import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Heart, Plus, Minus, ShoppingCart, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useBasket } from "@/contexts/BasketContext";

type SortKey = "name-asc" | "price-low" | "price-high" | "stock-first";
const PAGE_SIZE = 24;

function getStockStatus(qty: number | null) {
  const q = qty ?? 0;
  if (q > 10) return { label: "In stock", color: "text-green-600", dot: "bg-green-500" };
  return { label: "Low stock", color: "text-amber-600", dot: "bg-amber-500" };
}

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function PortalProducts() {
  const { discountPercentage, user } = useAuth();
  const queryClient = useQueryClient();
  const discount = discountPercentage / 100;

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch families/categories from all products (lightweight)
  const { data: allProducts = [] } = useQuery({
    queryKey: ["products-families"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products_partner_view")
        .select("family, category");
      return data || [];
    },
  });

  const families = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allProducts.forEach((p) => {
      if (!p.family) return;
      if (!map.has(p.family)) map.set(p.family, new Set());
      if (p.category) map.get(p.family)!.add(p.category);
    });
    return map;
  }, [allProducts]);

  const familyNames = useMemo(() => Array.from(families.keys()).sort(), [families]);
  const categories = useMemo(() => {
    if (!selectedFamily) return [];
    return Array.from(families.get(selectedFamily) || []).sort();
  }, [selectedFamily, families]);

  // Server-side paginated products
  const sortCol = sort === "price-low" || sort === "price-high" ? "list_price_usd" : sort === "stock-first" ? "stock_qty" : "name";
  const sortAsc = sort === "name-asc" || sort === "price-low";

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
  } = useInfiniteQuery({
    queryKey: ["products-grid", debouncedSearch, selectedFamily, selectedCategory, favouritesOnly, sort, favouriteIds],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("products_partner_view")
        .select("*", { count: "exact" });

      if (selectedFamily) query = query.eq("family", selectedFamily);
      if (selectedCategory) query = query.eq("category", selectedCategory);
      if (debouncedSearch) query = query.or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%`);
      if (favouritesOnly && favouriteIds.length > 0) query = query.in("id", favouriteIds);

      query = query
        .order(sortCol, { ascending: sortAsc })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      const { data: rows, count, error } = await query;
      if (error) throw error;
      return { rows: rows || [], count: count || 0, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage * PAGE_SIZE < lastPage.count ? nextPage : undefined;
    },
    initialPageParam: 0,
  });

  const products = data?.pages.flatMap((p) => p.rows) || [];
  const totalCount = data?.pages[0]?.count || 0;
  const remaining = totalCount - products.length;

  // Favourites
  const { data: favouriteIds = [] } = useQuery({
    queryKey: ["favourites"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("partner_favourites").select("product_id").eq("user_id", user.id);
      return (data || []).map((f) => f.product_id);
    },
    enabled: !!user,
  });

  const favourites = useMemo(() => new Set(favouriteIds), [favouriteIds]);

  const toggleFavMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) return;
      if (favourites.has(productId)) {
        await supabase.from("partner_favourites").delete().eq("user_id", user.id).eq("product_id", productId);
      } else {
        await supabase.from("partner_favourites").insert({ user_id: user.id, product_id: productId });
      }
    },
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ["favourites"] });
      const prev = queryClient.getQueryData<string[]>(["favourites"]) || [];
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      queryClient.setQueryData(["favourites"], next);
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(["favourites"], context.prev);
      toast.error("Failed to update favourite");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["favourites"] }),
  });

  const getPartnerPrice = (list: number | null) => (list ?? 0) * (1 - discount);
  const getSaving = (list: number | null) => (list ?? 0) * discount;

  const { addItem } = useBasket();

  const handleAdd = useCallback((p: any) => {
    const qty = quantities[p.id] || 1;
    addItem({
      product_id: p.id,
      sku: p.sku ?? "",
      name: p.name ?? "",
      category: p.category,
      list_price_usd: p.list_price_usd ?? 0,
    }, qty);
    setAddedItems((prev) => new Set(prev).add(p.id));
    setAddingCard(null);
    setQuantities((prev) => ({ ...prev, [p.id]: 1 }));
    toast.success("Added to basket");
    setTimeout(() => setAddedItems((prev) => { const n = new Set(prev); n.delete(p.id); return n; }), 1500);
  }, [addItem, quantities]);

  const getQty = (id: string) => quantities[id] || 1;
  const setQty = (id: string, v: number) => setQuantities((prev) => ({ ...prev, [id]: Math.max(1, v) }));

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <Skeleton className="h-12 max-w-2xl mx-auto rounded-xl" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-32 rounded-full" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-muted/30 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">Browse and order from the TF USA catalogue.</p>
        </div>

        {/* Search */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-12 h-12 text-base rounded-xl shadow-sm border-muted bg-background"
          />
        </div>

        {/* Family pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => { setSelectedFamily(null); setSelectedCategory(null); }}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !selectedFamily ? "bg-primary text-primary-foreground shadow-md" : "bg-background text-foreground border hover:border-primary"
            }`}
          >
            All
          </button>
          {familyNames.map((f) => (
            <button
              key={f}
              onClick={() => { setSelectedFamily(f); setSelectedCategory(null); }}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedFamily === f ? "bg-primary text-primary-foreground shadow-md" : "bg-background text-foreground border hover:border-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Category chips + controls */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 0 && categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === c ? "bg-primary/15 text-primary border border-primary/30" : "bg-background text-muted-foreground border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={favouritesOnly} onCheckedChange={setFavouritesOnly} />
              Favourites
            </label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[170px] h-9 text-sm bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="price-low">Price: Low–High</SelectItem>
                <SelectItem value="price-high">Price: High–Low</SelectItem>
                <SelectItem value="stock-first">In stock first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground">Showing {products.length} of {totalCount} products</p>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            {debouncedSearch ? (
              <>
                <p className="text-muted-foreground">No products matching '{debouncedSearch}'</p>
                <Button variant="outline" onClick={() => { setSearchInput(""); setDebouncedSearch(""); }}>Clear search</Button>
              </>
            ) : selectedCategory ? (
              <p className="text-muted-foreground">No products in this category yet.</p>
            ) : (
              <p className="text-muted-foreground">No products match your filters.</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => {
                const stock = getStockStatus(p.stock_qty);
                const isAdding = addingCard === p.id;
                const justAdded = addedItems.has(p.id!);
                return (
                  <div
                    key={p.id}
                    className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden"
                  >
                    <div className="p-4 pb-2 flex items-start justify-between">
                      <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                      <button onClick={() => toggleFavMutation.mutate(p.id!)} className="absolute top-4 right-4">
                        <Heart className={`h-5 w-5 transition-colors ${
                          favourites.has(p.id!) ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"
                        }`} />
                      </button>
                    </div>

                    <div className="px-4 flex-1 space-y-2">
                      <h3 className="font-semibold text-base leading-tight line-clamp-2 text-foreground">{p.name}</h3>
                      {p.category && (
                        <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">{p.category}</Badge>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${stock.dot}`} />
                        <span className={`text-xs font-medium ${stock.color}`}>{stock.label}</span>
                      </div>
                    </div>

                    <div className="px-4 pt-3 mt-2 border-t space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground text-sm line-through">{formatUSD(p.list_price_usd ?? 0)}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-primary text-[22px] font-bold">{formatUSD(getPartnerPrice(p.list_price_usd))}</span>
                        <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-0.5 rounded-full">
                          Save {formatUSD(getSaving(p.list_price_usd))}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 pt-3">
                      {justAdded ? (
                        <div className="h-10 flex items-center justify-center text-green-600 font-medium text-sm gap-1">
                          <Check className="h-4 w-4" /> Added to basket!
                        </div>
                      ) : isAdding ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border rounded-lg">
                            <button onClick={() => setQty(p.id!, getQty(p.id!) - 1)} className="h-10 w-10 flex items-center justify-center hover:bg-muted">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center font-medium">{getQty(p.id!)}</span>
                            <button onClick={() => setQty(p.id!, getQty(p.id!) + 1)} className="h-10 w-10 flex items-center justify-center hover:bg-muted">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <Button className="flex-1 h-10 bg-primary hover:bg-primary/90" onClick={() => handleAdd(p)}>
                            Add to basket
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full h-10 bg-primary hover:bg-primary/90"
                          onClick={() => setAddingCard(p.id!)}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" /> Add to basket
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasNextPage && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Loading..." : `Load more (${remaining} remaining)`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

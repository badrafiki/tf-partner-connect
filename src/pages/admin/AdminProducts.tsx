import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Eye, EyeOff, Download, Package, RefreshCw, Info, Link, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
const formatUSD = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function calcMargin(list: number, cost: number | null) {
  if (!cost || cost <= 0 || list <= 0) return null;
  return ((list - cost) / list) * 100;
}

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visFilter, setVisFilter] = useState<"all" | "visible" | "hidden">("all");
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: async () => {
      let q = supabase.from("products").select("*").order("name");
      if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Product[];
    },
  });

  // Last product sync timestamp
  const { data: lastSyncEntry } = useQuery({
    queryKey: ["last-product-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("erp_sync_log")
        .select("*")
        .eq("event_type", "product_sync")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const families = useMemo(() => [...new Set(products.map(p => p.family).filter(Boolean))] as string[], [products]);
  const categories = useMemo(() => {
    let list = products;
    if (familyFilter !== "all") list = list.filter(p => p.family === familyFilter);
    return [...new Set(list.map(p => p.category).filter(Boolean))] as string[];
  }, [products, familyFilter]);

  const filtered = useMemo(() => {
    let list = products;
    if (familyFilter !== "all") list = list.filter(p => p.family === familyFilter);
    if (categoryFilter !== "all") list = list.filter(p => p.category === categoryFilter);
    if (visFilter === "visible") list = list.filter(p => !p.hidden);
    if (visFilter === "hidden") list = list.filter(p => p.hidden);
    return list;
  }, [products, familyFilter, categoryFilter, visFilter]);

  const toggleHidden = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase.from("products").update({ hidden: !p.hidden }).eq("id", p.id);
      if (error) throw error;
      return !p.hidden;
    },
    onSuccess: (nowHidden) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(nowHidden ? "Product hidden from catalog" : "Product visible in catalog");
    },
  });

  const updateUrl = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const { error } = await supabase.from("products").update({ product_url: url || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product URL updated");
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("pull-products-from-modusys", {
        method: "POST",
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(`Sync failed: ${data.error}`);
      } else {
        const upserted = data?.upserted ?? 0;
        const hidden = data?.hidden ?? 0;
        toast.success(`Synced ${upserted} products, hidden ${hidden}`);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["last-product-sync"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to sync products");
    } finally {
      setSyncing(false);
    }
  };

  const exportCSV = async () => {
    let allProducts: Product[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      let q = supabase.from("products").select("*").order("name").range(page * pageSize, (page + 1) * pageSize - 1);
      if (familyFilter !== "all") q = q.eq("family", familyFilter);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      if (visFilter === "visible") q = q.eq("hidden", false);
      if (visFilter === "hidden") q = q.eq("hidden", true);
      const { data } = await q;
      if (!data || data.length === 0) break;
      allProducts = [...allProducts, ...data];
      if (data.length < pageSize) break;
      page++;
    }

    const headers = ["sku", "name", "description", "family", "category", "list_price_usd", "cost_price_usd", "stock_qty", "hidden"];
    const csvRows = [
      headers.join(","),
      ...allProducts.map(p =>
        headers.map(h => {
          const val = (p as any)[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tf-usa-products.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const visFilters = [
    { value: "all" as const, label: "All" },
    { value: "visible" as const, label: "Visible" },
    { value: "hidden" as const, label: "Hidden" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">Product catalog synced from ModuSys.</p>
        </div>
        <div className="flex gap-2 items-center">
          {lastSyncEntry?.created_at && (
            <span className="text-xs text-muted-foreground">
              Last synced {formatDistanceToNow(new Date(lastSyncEntry.created_at))} ago
            </span>
          )}
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          <Button onClick={handleSync} disabled={syncing} className="bg-[#1B3A6B] hover:bg-[#15305a]">
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync from ModuSys"}
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        Products are managed in ModuSys. Changes made there sync to this catalog automatically. Use "Sync from ModuSys" to pull the latest data manually.
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={familyFilter} onValueChange={v => { setFamilyFilter(v); setCategoryFilter("all"); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Family" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Families</SelectItem>
            {families.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {visFilters.map(f => (
            <Button key={f.value} variant={visFilter === f.value ? "default" : "outline"} size="sm" onClick={() => setVisFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold">No products in the catalog</h2>
          <p className="text-muted-foreground mt-1">Click "Sync from ModuSys" to pull the product catalog.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Family</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">List Price</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>ModuSys ID</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Visibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const margin = calcMargin(p.list_price_usd, p.cost_price_usd);
                const stockColor = (p.stock_qty ?? 0) > 10 ? "text-green-600" : (p.stock_qty ?? 0) > 0 ? "text-amber-600" : "text-red-600";
                const modusysId = (p as any).modusys_product_id;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.family || "—"}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${stockColor}`}>{p.stock_qty ?? 0}</TableCell>
                    <TableCell className="text-right text-sm">{formatUSD(p.list_price_usd)}</TableCell>
                    <TableCell className="text-right text-sm">{p.cost_price_usd ? formatUSD(p.cost_price_usd) : "—"}</TableCell>
                    <TableCell className="text-right text-sm">
                      {margin !== null ? <span className="text-green-600">{margin.toFixed(1)}%</span> : "—"}
                    </TableCell>
                    <TableCell>
                      {modusysId ? (
                        <span className="font-mono text-xs text-muted-foreground">{String(modusysId).slice(0, 8)}</span>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ProductUrlCell product={p} onSave={(url) => updateUrl.mutate({ id: p.id, url })} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.hidden ? "outline" : "default"} className={!p.hidden ? "bg-green-100 text-green-800 border-green-200" : ""}>
                        {p.hidden ? "Hidden" : "Visible"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleHidden.mutate(p)}>
                        {p.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

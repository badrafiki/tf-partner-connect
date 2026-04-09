import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Plus, Pencil, Eye, EyeOff, Download, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
const formatUSD = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function calcMargin(list: number, cost: number | null) {
  if (!cost || cost <= 0 || list <= 0) return null;
  return ((list - cost) / list) * 100;
}

/* ───── Product Form ───── */
function ProductForm({
  initial,
  families,
  categories,
  onSave,
  saving,
  onCancel,
}: {
  initial: Partial<Product>;
  families: string[];
  categories: string[];
  onSave: (data: Partial<Product>) => void;
  saving: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>({ ...initial });
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const margin = calcMargin(Number(form.list_price_usd) || 0, Number(form.cost_price_usd) || null);
  const marginAmount = (Number(form.list_price_usd) || 0) - (Number(form.cost_price_usd) || 0);

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>SKU *</Label><Input value={form.sku || ""} onChange={e => set("sku", e.target.value)} className="font-mono" /></div>
        <div><Label>Name *</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} /></div>
      </div>
      <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={3} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Family</Label>
          <Select value={form.family || ""} onValueChange={v => set("family", v)}>
            <SelectTrigger><SelectValue placeholder="Select or type" /></SelectTrigger>
            <SelectContent>
              {families.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category || ""} onValueChange={v => set("category", v)}>
            <SelectTrigger><SelectValue placeholder="Select or type" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>List Price (USD) *</Label><Input type="number" min={0.01} step={0.01} value={form.list_price_usd ?? ""} onChange={e => set("list_price_usd", parseFloat(e.target.value) || 0)} /></div>
        <div><Label>Cost Price (USD)</Label><Input type="number" min={0} step={0.01} value={form.cost_price_usd ?? ""} onChange={e => set("cost_price_usd", e.target.value ? parseFloat(e.target.value) : null)} /></div>
      </div>

      {margin !== null && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
          Margin: {margin.toFixed(1)}% ({formatUSD(marginAmount)} per unit)
        </div>
      )}

      <div><Label>Stock Qty</Label><Input type="number" min={0} step={1} value={form.stock_qty ?? 0} onChange={e => set("stock_qty", parseInt(e.target.value) || 0)} /></div>

      <div className="flex items-center gap-2">
        <Switch checked={form.hidden ?? false} onCheckedChange={v => set("hidden", v)} />
        <Label>Hidden from catalog</Label>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" disabled={saving || !form.sku || !form.name || !(Number(form.list_price_usd) > 0)} onClick={() => onSave(form)}>
          {saving ? "Saving..." : "Save Product"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

/* ───── Main Page ───── */
export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visFilter, setVisFilter] = useState<"all" | "visible" | "hidden">("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [addOpen, setAddOpen] = useState(false);
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

  const saveMutation = useMutation({
    mutationFn: async ({ data, isNew }: { data: Partial<Product>; isNew: boolean }) => {
      if (isNew) {
        const { error } = await supabase.from("products").insert({
          sku: data.sku!,
          name: data.name!,
          description: data.description || null,
          family: data.family || null,
          category: data.category || null,
          list_price_usd: data.list_price_usd!,
          cost_price_usd: data.cost_price_usd ?? null,
          stock_qty: data.stock_qty ?? 0,
          hidden: data.hidden ?? false,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").update({
          sku: data.sku,
          name: data.name,
          description: data.description || null,
          family: data.family || null,
          category: data.category || null,
          list_price_usd: data.list_price_usd,
          cost_price_usd: data.cost_price_usd ?? null,
          stock_qty: data.stock_qty ?? 0,
          hidden: data.hidden ?? false,
        }).eq("id", data.id!);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(vars.isNew ? "Product added" : "Product updated");
      setEditProduct(null);
      setAddOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportCSV = async () => {
    // Fetch all products in pages of 1000
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
          <p className="text-muted-foreground text-sm mt-1">Manage the product catalog.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Product</Button>
        </div>
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
          <p className="text-muted-foreground mt-1">Add your first product to get started.</p>
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
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const margin = calcMargin(p.list_price_usd, p.cost_price_usd);
                const stockColor = (p.stock_qty ?? 0) > 10 ? "text-green-600" : (p.stock_qty ?? 0) > 0 ? "text-amber-600" : "text-red-600";
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
                      <Badge variant={p.hidden ? "outline" : "default"} className={!p.hidden ? "bg-green-100 text-green-800 border-green-200" : ""}>
                        {p.hidden ? "Hidden" : "Visible"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditProduct(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleHidden.mutate(p)}>
                          {p.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Sheet */}
      <Sheet open={addOpen} onOpenChange={v => { if (!v) setAddOpen(false); }}>
        <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
          <SheetHeader><SheetTitle>Add Product</SheetTitle></SheetHeader>
          <ProductForm
            initial={{ hidden: false, stock_qty: 0 }}
            families={families}
            categories={categories}
            onSave={data => saveMutation.mutate({ data, isNew: true })}
            saving={saveMutation.isPending}
            onCancel={() => setAddOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editProduct} onOpenChange={v => { if (!v) setEditProduct(null); }}>
        <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
          <SheetHeader><SheetTitle>Edit Product</SheetTitle></SheetHeader>
          {editProduct && (
            <ProductForm
              initial={editProduct}
              families={families}
              categories={categories}
              onSave={data => saveMutation.mutate({ data: { ...data, id: editProduct.id }, isNew: false })}
              saving={saveMutation.isPending}
              onCancel={() => setEditProduct(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

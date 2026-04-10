import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Search, X, Check, Eye, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Partner = Tables<"partners">;

interface AccessRule {
  id: string;
  partner_id: string;
  family: string | null;
  category: string | null;
  product_id: string | null;
  access: string;
}

type FamilyAccess = "default" | "allowed" | "denied";

const accessColors: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  allowed: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
};

export default function ProductAccessTab({ partner }: { partner: Partner }) {
  const queryClient = useQueryClient();
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [addSkuOpen, setAddSkuOpen] = useState(false);
  const [skuSearch, setSkuSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch access rules
  const { data: rules = [] } = useQuery({
    queryKey: ["partner-access-rules", partner.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_product_access" as any)
        .select("*")
        .eq("partner_id", partner.id);
      return (data || []) as unknown as AccessRule[];
    },
  });

  // Fetch all product families with counts
  const { data: familyData = [] } = useQuery({
    queryKey: ["all-product-families"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, family, category, sku, name")
        .eq("hidden", false)
        .order("family")
        .order("name");
      return data || [];
    },
  });

  // Group products by family
  const familyGroups = useMemo(() => {
    const map = new Map<string, typeof familyData>();
    familyData.forEach(p => {
      if (!p.family) return;
      if (!map.has(p.family)) map.set(p.family, []);
      map.get(p.family)!.push(p);
    });
    return map;
  }, [familyData]);

  const familyNames = useMemo(() => Array.from(familyGroups.keys()).sort(), [familyGroups]);

  // Derive family rules and SKU overrides
  const familyRules = useMemo(() => {
    const map = new Map<string, FamilyAccess>();
    rules.forEach(r => {
      if (r.family && !r.product_id) {
        map.set(r.family, r.access as FamilyAccess);
      }
    });
    return map;
  }, [rules]);

  const skuOverrides = useMemo(() => {
    return rules.filter(r => r.product_id != null);
  }, [rules]);

  const familyRestrictionCount = familyRules.size;
  const skuOverrideCount = skuOverrides.length;
  const hasRules = rules.length > 0;

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // Upsert family rule
  const upsertFamilyMutation = useMutation({
    mutationFn: async ({ family, access }: { family: string; access: FamilyAccess }) => {
      if (access === "default") {
        // Delete rule
        await supabase
          .from("partner_product_access" as any)
          .delete()
          .eq("partner_id", partner.id)
          .eq("family", family)
          .is("product_id", null);
      } else {
        // Check existing
        const { data: existing } = await supabase
          .from("partner_product_access" as any)
          .select("id")
          .eq("partner_id", partner.id)
          .eq("family", family)
          .is("product_id", null)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("partner_product_access" as any)
            .update({ access })
            .eq("id", (existing as any).id);
        } else {
          await supabase
            .from("partner_product_access" as any)
            .insert({ partner_id: partner.id, family, access });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-access-rules", partner.id] });
      queryClient.invalidateQueries({ queryKey: ["partner-access-summary"] });
      showSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Upsert SKU override
  const upsertSkuMutation = useMutation({
    mutationFn: async ({ product_id, access }: { product_id: string; access: string | null }) => {
      if (access === null) {
        // Remove override
        await supabase
          .from("partner_product_access" as any)
          .delete()
          .eq("partner_id", partner.id)
          .eq("product_id", product_id);
      } else {
        const { data: existing } = await supabase
          .from("partner_product_access" as any)
          .select("id")
          .eq("partner_id", partner.id)
          .eq("product_id", product_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("partner_product_access" as any)
            .update({ access })
            .eq("id", (existing as any).id);
        } else {
          await supabase
            .from("partner_product_access" as any)
            .insert({ partner_id: partner.id, product_id, access });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-access-rules", partner.id] });
      queryClient.invalidateQueries({ queryKey: ["partner-access-summary"] });
      showSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cycleFamilyAccess = (family: string) => {
    const current = familyRules.get(family) || "default";
    const next: FamilyAccess = current === "default" ? "denied" : current === "denied" ? "allowed" : "default";
    upsertFamilyMutation.mutate({ family, access: next });
  };

  const getSkuOverride = (productId: string) => {
    return skuOverrides.find(r => r.product_id === productId);
  };

  // Preview catalog
  const { data: previewProducts = [], isLoading: previewLoading } = useQuery({
    queryKey: ["preview-catalog", partner.id],
    queryFn: async () => {
      const { data: ids } = await supabase.rpc("get_partner_visible_products", { p_partner_id: partner.id });
      if (!ids || ids.length === 0) return [];
      const { data } = await supabase
        .from("products")
        .select("id, sku, name, family, category, list_price_usd")
        .in("id", ids as string[])
        .order("family")
        .order("name");
      return data || [];
    },
    enabled: previewOpen,
  });

  // SKU search for adding overrides
  const { data: skuSearchResults = [] } = useQuery({
    queryKey: ["sku-search", skuSearch],
    queryFn: async () => {
      if (!skuSearch || skuSearch.length < 2) return [];
      const { data } = await supabase
        .from("products")
        .select("id, sku, name, family")
        .eq("hidden", false)
        .or(`name.ilike.%${skuSearch}%,sku.ilike.%${skuSearch}%`)
        .limit(10);
      return data || [];
    },
    enabled: skuSearch.length >= 2,
  });

  return (
    <div className="space-y-5 py-4">
      {/* Status banner */}
      <div className="flex items-center gap-2">
        {!hasRules ? (
          <>
            <Badge className="bg-green-100 text-green-800">Full catalog access</Badge>
            <span className="text-sm text-muted-foreground">This distributor can see all products. Add restrictions below.</span>
          </>
        ) : (
          <>
            <Badge className="bg-amber-100 text-amber-800">Restricted access</Badge>
            <span className="text-sm text-muted-foreground">
              {familyRestrictionCount} family rule{familyRestrictionCount !== 1 ? "s" : ""}, {skuOverrideCount} SKU override{skuOverrideCount !== 1 ? "s" : ""}
            </span>
          </>
        )}
        {saved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Saved</span>}
      </div>

      {/* Family access section */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Product families</p>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Family</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {familyNames.map(family => {
                const products = familyGroups.get(family) || [];
                const access = familyRules.get(family) || "default";
                const isExpanded = expandedFamily === family;
                const showExpand = access === "denied" || access === "allowed";

                return (
                  <>
                    <TableRow key={family}>
                      <TableCell className="w-8 px-2">
                        {showExpand && (
                          <button onClick={() => setExpandedFamily(isExpanded ? null : family)} className="p-1 hover:bg-muted rounded">
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{family}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{products.length}</TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => cycleFamilyAccess(family)}
                          disabled={upsertFamilyMutation.isPending}
                        >
                          <Badge className={`cursor-pointer ${accessColors[access]}`}>
                            {access === "default" ? "Default" : access === "allowed" ? "Allowed" : "Denied"}
                          </Badge>
                        </button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && products.map(p => {
                      const override = getSkuOverride(p.id);
                      return (
                        <TableRow key={p.id} className="bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell className="text-sm" colSpan={1}>
                            <span className="font-mono text-xs text-muted-foreground mr-2">{p.sku}</span>
                            {p.name}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {override ? "" : `Inherits: ${access}`}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {override ? (
                                <>
                                  <Badge className={accessColors[override.access]}>{override.access}</Badge>
                                  <button
                                    onClick={() => upsertSkuMutation.mutate({ product_id: p.id, access: null })}
                                    className="p-1 hover:bg-muted rounded"
                                    title="Remove override"
                                  >
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                </>
                              ) : (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => upsertSkuMutation.mutate({ product_id: p.id, access: access === "denied" ? "allowed" : "denied" })}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {access === "denied" ? "Allow" : "Deny"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SKU overrides section */}
      {skuOverrides.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Individual product overrides</p>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead className="text-right">Override</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skuOverrides.map(rule => {
                  const product = familyData.find(p => p.id === rule.product_id);
                  if (!product) return null;
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs text-muted-foreground mr-2">{product.sku}</span>
                        {product.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{product.family}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={accessColors[rule.access]}>{rule.access}</Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => upsertSkuMutation.mutate({ product_id: rule.product_id!, access: null })}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => setAddSkuOpen(true)}>
        + Add SKU override
      </Button>

      {/* Preview button */}
      <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="ml-2">
        <Eye className="h-3.5 w-3.5 mr-1" /> Preview catalog as this distributor →
      </Button>

      {/* Add SKU override dialog */}
      <Dialog open={addSkuOpen} onOpenChange={setAddSkuOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add SKU override</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU or name..."
                value={skuSearch}
                onChange={e => setSkuSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {skuSearchResults.map(p => {
                const existing = getSkuOverride(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded hover:bg-muted text-sm">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{p.sku}</span>
                      {p.name}
                      <span className="text-xs text-muted-foreground ml-2">({p.family})</span>
                    </div>
                    {existing ? (
                      <Badge className={accessColors[existing.access]}>{existing.access}</Badge>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-green-700" onClick={() => {
                          upsertSkuMutation.mutate({ product_id: p.id, access: "allowed" });
                        }}>Allow</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-700" onClick={() => {
                          upsertSkuMutation.mutate({ product_id: p.id, access: "denied" });
                        }}>Deny</Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {skuSearch.length >= 2 && skuSearchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catalog preview — {partner.company_name}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : previewProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No products visible to this distributor.</p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">{previewProducts.length} products visible</p>
              <div className="border rounded-md max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Family</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewProducts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="text-sm">{p.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.family}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.category}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

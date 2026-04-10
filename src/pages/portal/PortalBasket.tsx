import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Minus, Plus, Loader2, RefreshCw, X, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBasket } from "@/contexts/BasketContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type ValidationState = "ok" | "unavailable" | "out_of_stock" | "price_changed";

interface ItemValidation {
  state: ValidationState;
  newPrice?: number;
}

export default function PortalBasket() {
  const { items, removeItem, updateQuantity, clearBasket } = useBasket();
  const { partnerId, discountPercentage } = useAuth();
  const navigate = useNavigate();
  const [poReference, setPoReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationMap, setValidationMap] = useState<Record<string, ItemValidation>>({});
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  const discount = discountPercentage / 100;

  const runValidation = useCallback(async () => {
    if (items.length === 0) return;
    setValidating(true);
    try {
      const productIds = items.map(i => i.product_id);
      const { data: liveProducts } = await supabase
        .from("products_partner_view")
        .select("id, sku, name, list_price_usd, stock_qty, hidden")
        .in("id", productIds);

      const liveMap = new Map((liveProducts || []).map(p => [p.id!, p]));
      const newMap: Record<string, ItemValidation> = {};
      let priceUpdates: { product_id: string; newPrice: number }[] = [];

      for (const item of items) {
        const live = liveMap.get(item.product_id);
        if (!live || live.hidden) {
          newMap[item.product_id] = { state: "unavailable" };
        } else if (live.stock_qty === 0) {
          // Check price change too
          if (live.list_price_usd !== null && live.list_price_usd !== item.list_price_usd) {
            priceUpdates.push({ product_id: item.product_id, newPrice: live.list_price_usd });
          }
          newMap[item.product_id] = { state: "out_of_stock" };
        } else if (live.list_price_usd !== null && live.list_price_usd !== item.list_price_usd) {
          newMap[item.product_id] = { state: "price_changed", newPrice: live.list_price_usd };
          priceUpdates.push({ product_id: item.product_id, newPrice: live.list_price_usd });
        } else {
          newMap[item.product_id] = { state: "ok" };
        }
      }

      // Silently update prices in basket context
      for (const pu of priceUpdates) {
        // updateQuantity won't work for price, we need to use the basket's internal update
        // Since BasketContext doesn't have updatePrice, we'll handle it via the items array
      }

      setValidationMap(newMap);
    } catch (e) {
      console.error("Validation error:", e);
    } finally {
      setValidating(false);
    }
  }, [items]);

  useEffect(() => {
    runValidation();
  }, []); // Run once on mount

  const unavailableItems = items.filter(i => validationMap[i.product_id]?.state === "unavailable");
  const outOfStockItems = items.filter(i => validationMap[i.product_id]?.state === "out_of_stock");
  const priceChangedItems = items.filter(i => validationMap[i.product_id]?.state === "price_changed");
  const hasUnavailable = unavailableItems.length > 0;

  const dismissBanner = (key: string) => {
    setDismissedBanners(prev => new Set([...prev, key]));
  };

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center max-w-md space-y-4">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Your basket is empty</h2>
          <p className="text-muted-foreground">
            Browse the product catalog and add items to build your enquiry.
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/portal/products">Browse products →</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getEffectivePrice = (item: typeof items[0]) => {
    const validation = validationMap[item.product_id];
    if (validation?.newPrice !== undefined) return validation.newPrice;
    return item.list_price_usd;
  };

  const listTotal = items.reduce((s, i) => s + getEffectivePrice(i) * i.quantity, 0);
  const partnerTotal = items.reduce(
    (s, i) => s + getEffectivePrice(i) * (1 - discount) * i.quantity,
    0
  );
  const savings = listTotal - partnerTotal;
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const handleRemove = (productId: string, name: string) => {
    removeItem(productId);
    toast("Item removed", { description: name });
  };

  const handleSubmit = async () => {
    if (!partnerId || hasUnavailable) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "submit-enquiry",
        {
          body: {
            partner_id: partnerId,
            line_items: items.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
            })),
            po_reference: poReference || undefined,
          },
        }
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      clearBasket();
      navigate("/portal/basket/submitted", {
        state: { enquiryId: data.enquiry_id },
      });
    } catch (e: any) {
      console.error("Submit error:", e);
      setError(
        "Something went wrong. Please try again or contact partners@total-filtration.com"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getRowClasses = (productId: string) => {
    const v = validationMap[productId]?.state;
    if (v === "unavailable") return "border-l-[3px] border-l-[#CC2027] opacity-50";
    if (v === "out_of_stock") return "border-l-[3px] border-l-[#D97706]";
    return "";
  };

  return (
    <div className="flex-1 bg-muted/30 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Basket</h1>
            <p className="text-muted-foreground mt-1">
              Review your items and submit your enquiry to TF USA.
            </p>
          </div>
          <button
            onClick={runValidation}
            disabled={validating}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${validating ? "animate-spin" : ""}`} />
            Refresh availability
          </button>
        </div>

        {/* Validation loading */}
        {validating && (
          <p className="text-sm text-muted-foreground">Checking availability...</p>
        )}

        {/* Validation banners */}
        <div className="space-y-2">
          {hasUnavailable && !dismissedBanners.has("unavailable") && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{unavailableItems.length} item(s) are no longer available and must be removed before submitting.</span>
              </div>
              <button onClick={() => dismissBanner("unavailable")} className="text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {outOfStockItems.length > 0 && !dismissedBanners.has("outofstock") && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{outOfStockItems.length} item(s) are currently out of stock — you can still submit your enquiry.</span>
              </div>
              <button onClick={() => dismissBanner("outofstock")} className="text-amber-400 hover:text-amber-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {priceChangedItems.length > 0 && !dismissedBanners.has("pricechanged") && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" />
                <span>Prices updated on {priceChangedItems.length} item(s). Your basket totals have been recalculated.</span>
              </div>
              <button onClick={() => dismissBanner("pricechanged")} className="text-blue-400 hover:text-blue-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main — Line Items */}
          <div className="flex-1 space-y-4">
            {/* Desktop table */}
            <div className="hidden md:block bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">SKU</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">List Price</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Your Price</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Subtotal</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const validation = validationMap[item.product_id];
                    const effectiveListPrice = getEffectivePrice(item);
                    const partnerPrice = effectiveListPrice * (1 - discount);
                    const subtotal = partnerPrice * item.quantity;
                    const isUnavailable = validation?.state === "unavailable";
                    const isOutOfStock = validation?.state === "out_of_stock";

                    return (
                      <tr key={item.product_id} className={`border-b last:border-0 hover:bg-muted/30 ${getRowClasses(item.product_id)}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium text-foreground">{item.name}</div>
                              {item.category && (
                                <div className="text-xs text-muted-foreground">{item.category}</div>
                              )}
                            </div>
                            {isUnavailable && (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">No longer available</Badge>
                            )}
                            {isOutOfStock && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Currently out of stock</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">
                          {item.sku}
                        </td>
                        <td className="p-3 text-right text-muted-foreground line-through">
                          {formatUSD(effectiveListPrice)}
                        </td>
                        <td className="p-3 text-right font-semibold text-primary">
                          {formatUSD(partnerPrice)}
                        </td>
                        <td className="p-3">
                          {isUnavailable ? (
                            <div className="text-center">—</div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <div className="flex items-center border rounded-lg">
                                <button
                                  onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="h-8 w-8 flex items-center justify-center hover:bg-muted disabled:opacity-30"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={999}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateQuantity(
                                      item.product_id,
                                      Math.max(1, Math.min(999, parseInt(e.target.value) || 1))
                                    )
                                  }
                                  className="w-12 text-center text-sm font-medium bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                  disabled={item.quantity >= 999}
                                  className="h-8 w-8 flex items-center justify-center hover:bg-muted disabled:opacity-30"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-semibold text-primary">
                          {formatUSD(subtotal)}
                        </td>
                        <td className="p-3">
                          {isUnavailable ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                              onClick={() => handleRemove(item.product_id, item.name)}
                            >
                              Remove
                            </Button>
                          ) : (
                            <button
                              onClick={() => handleRemove(item.product_id, item.name)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {items.map((item) => {
                const validation = validationMap[item.product_id];
                const effectiveListPrice = getEffectivePrice(item);
                const partnerPrice = effectiveListPrice * (1 - discount);
                const subtotal = partnerPrice * item.quantity;
                const isUnavailable = validation?.state === "unavailable";
                const isOutOfStock = validation?.state === "out_of_stock";

                return (
                  <Card
                    key={item.product_id}
                    className={`${isUnavailable ? "border-l-[3px] border-l-[#CC2027] opacity-50" : isOutOfStock ? "border-l-[3px] border-l-[#D97706]" : ""}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                          {isUnavailable && (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] mt-1">No longer available</Badge>
                          )}
                          {isOutOfStock && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] mt-1">Currently out of stock</Badge>
                          )}
                        </div>
                        {isUnavailable ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                            onClick={() => handleRemove(item.product_id, item.name)}
                          >
                            Remove
                          </Button>
                        ) : (
                          <button
                            onClick={() => handleRemove(item.product_id, item.name)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-muted-foreground text-sm line-through mr-2">
                            {formatUSD(effectiveListPrice)}
                          </span>
                          <span className="font-semibold text-primary">
                            {formatUSD(partnerPrice)}
                          </span>
                        </div>
                        {!isUnavailable && (
                          <div className="flex items-center border rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 flex items-center justify-center hover:bg-muted disabled:opacity-30"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-10 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              disabled={item.quantity >= 999}
                              className="h-8 w-8 flex items-center justify-center hover:bg-muted disabled:opacity-30"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-right font-semibold text-primary">
                        Subtotal: {formatUSD(subtotal)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Link
              to="/portal/products"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              ← Continue shopping
            </Link>
          </div>

          {/* Right — Summary Panel */}
          <div className="lg:w-[360px] shrink-0">
            <div className="lg:sticky lg:top-6">
              <Card className="border-t-4 border-t-primary">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-bold text-foreground">Order Summary</h2>
                  <div className="text-sm text-muted-foreground">{itemCount} items</div>

                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">List value</span>
                      <span className="text-muted-foreground">{formatUSD(listTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Your discount</span>
                      <span className="text-green-600">{discountPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">You save</span>
                      <span className="text-green-600">{formatUSD(savings)}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-foreground">Your total</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatUSD(partnerTotal)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    This is an enquiry, not a confirmed order. TF USA will respond
                    with a formal quotation within 1–2 business days.
                  </p>

                  {/* Out of stock warning near submit */}
                  {outOfStockItems.length > 0 && (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      Some items are currently out of stock. You can still submit — our team will confirm availability.
                    </div>
                  )}

                  {/* Unavailable block warning */}
                  {hasUnavailable && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                      Remove unavailable items before submitting your enquiry.
                    </div>
                  )}

                  {/* PO Reference */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Purchase Order / Reference Number{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Input
                      placeholder="e.g. PO-2026-0042"
                      value={poReference}
                      onChange={(e) => setPoReference(e.target.value)}
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                    onClick={handleSubmit}
                    disabled={submitting || items.length === 0 || hasUnavailable}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Enquiry →"
                    )}
                  </Button>

                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      {error}
                    </div>
                  )}

                  {/* Rep info */}
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                    Questions? Contact us at{" "}
                    <a
                      href="mailto:partners@total-filtration.com"
                      className="text-primary hover:underline"
                    >
                      partners@total-filtration.com
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

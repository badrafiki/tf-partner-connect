import { useState } from "react";
import { ExternalLink, ShoppingCart, Plus, Minus, Check, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
} from "@/components/ui/drawer";

interface ProductDetailDrawerProps {
  product: {
    id: string;
    sku: string | null;
    name: string | null;
    description: string | null;
    category: string | null;
    family: string | null;
    list_price_usd: number | null;
    stock_qty: number | null;
    product_url: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerPrice: number;
  saving: number;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  onAddToBasket: (qty: number) => void;
}

function getStockStatus(qty: number | null) {
  const q = qty ?? 0;
  if (q === 0) return { label: "Stock due imminently", color: "text-amber-600", dot: "bg-amber-500" };
  if (q > 10) return { label: "In stock", color: "text-emerald-600", dot: "bg-emerald-500" };
  return { label: `Low stock (${q} left)`, color: "text-amber-600", dot: "bg-amber-500" };
}

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function ProductDetailDrawer({
  product, open, onOpenChange, partnerPrice, saving, isFavourite, onToggleFavourite, onAddToBasket,
}: ProductDetailDrawerProps) {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  if (!product) return null;

  const stock = getStockStatus(product.stock_qty);

  const handleAdd = () => {
    onAddToBasket(qty);
    setJustAdded(true);
    setQty(1);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-lg overflow-y-auto">
          <DrawerHeader className="text-left">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-mono text-xs text-muted-foreground mb-1">{product.sku}</p>
                <DrawerTitle className="text-xl">{product.name}</DrawerTitle>
              </div>
              <button onClick={onToggleFavourite} className="mt-1" aria-label="Toggle favourite">
                <Heart className={`h-5 w-5 transition-colors ${isFavourite ? "fill-accent text-accent" : "text-muted-foreground/40 hover:text-accent"}`} />
              </button>
            </div>
            <DrawerDescription className="sr-only">Product details for {product.name}</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4 pb-2">
            {/* Family & Category */}
            <div className="flex items-center gap-2 flex-wrap">
              {product.family && (
                <Badge variant="secondary" className="text-xs">{product.family}</Badge>
              )}
              {product.category && (
                <Badge variant="outline" className="text-xs text-primary border-primary/20 bg-tf-navy-light">{product.category}</Badge>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${stock.dot}`} />
              <span className={`text-sm font-medium ${stock.color}`}>{stock.label}</span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-foreground mb-1">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Pricing */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground text-sm">List Price</span>
                <span className="text-muted-foreground text-sm line-through">{formatUSD(product.list_price_usd ?? 0)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-foreground font-medium">Your Price</span>
                <span className="text-primary text-2xl font-semibold">{formatUSD(partnerPrice)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-emerald-600 text-sm">You save</span>
                <span className="text-emerald-600 text-sm font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                  {formatUSD(saving)}
                </span>
              </div>
            </div>

            {/* Website link */}
            {product.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <ExternalLink className="h-4 w-4" />
                View on TF USA website
              </a>
            )}
          </div>

          <DrawerFooter>
            {justAdded ? (
              <div className="h-11 flex items-center justify-center text-emerald-600 font-medium text-sm gap-1">
                <Check className="h-4 w-4" /> Added to basket!
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-border rounded-lg">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-11 w-11 flex items-center justify-center hover:bg-muted">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-medium">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="h-11 w-11 flex items-center justify-center hover:bg-muted">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button className="flex-1 h-11 bg-primary hover:bg-primary/90 font-medium" onClick={handleAdd}>
                  <ShoppingCart className="h-4 w-4 mr-2" /> Add to basket
                </Button>
              </div>
            )}
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

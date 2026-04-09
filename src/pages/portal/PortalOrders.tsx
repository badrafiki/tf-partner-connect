import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Package, Truck, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_STEPS = ["confirmed", "in_progress", "shipped", "delivered"];
const STEP_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  in_progress: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

const borderColors: Record<string, string> = {
  confirmed: "#9ca3af",
  in_progress: "#2E5FA3",
  shipped: "#d97706",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

const statusBadgeColors: Record<string, string> = {
  confirmed: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  shipped: "bg-amber-100 text-amber-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function getTrackingUrl(carrier: string | null, trackingNumber: string): string {
  if (!carrier) return `https://www.google.com/search?q=tracking+${trackingNumber}`;
  const c = carrier.toLowerCase();
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  return `https://www.google.com/search?q=${encodeURIComponent(carrier)}+tracking+${trackingNumber}`;
}

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STATUS_STEPS.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-0 w-full py-2">
      {STATUS_STEPS.map((step, i) => {
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`h-3.5 w-3.5 rounded-full border-2 ${
                  isCompleted
                    ? "bg-[#1B3A6B] border-[#1B3A6B]"
                    : "bg-white border-gray-300"
                }`}
              />
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${
                  isCurrent ? "font-bold text-[#1B3A6B]" : isCompleted ? "text-[#1B3A6B]" : "text-gray-400"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mt-[-12px] ${
                  i < currentIdx ? "bg-[#1B3A6B]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PortalOrders() {
  const { partnerId } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["portal-orders", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders_partner_view" as any)
        .select("*")
        .eq("partner_id", partnerId!)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!partnerId,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Orders</h1>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Package className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-lg font-medium">No orders yet.</p>
            <p className="text-sm text-muted-foreground">
              Orders appear here once you accept a quotation.
            </p>
            <Button asChild variant="outline">
              <Link to="/portal/quotations">View quotations →</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Card
              key={order.id}
              className="overflow-hidden"
              style={{ borderLeft: `4px solid ${borderColors[order.status] || "#9ca3af"}` }}
            >
              <CardContent className="pt-5 space-y-3">
                {/* Top row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      ORD-{order.modusys_order_number || order.id?.slice(0, 8)}
                    </span>
                    <Badge className={statusBadgeColors[order.status] || ""}>
                      {order.status === "in_progress" ? "Processing" : order.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}
                  </span>
                </div>

                {/* Quotation ref */}
                {order.quotation_id && (
                  <p className="text-sm text-muted-foreground">
                    From quotation <span className="font-mono">QT-{order.quotation_id.slice(0, 8)}</span>
                  </p>
                )}

                {/* Status timeline or cancelled badge */}
                {order.status === "cancelled" ? (
                  <div className="space-y-2">
                    <Badge className="bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" /> Cancelled
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      This order was cancelled. Contact{" "}
                      <a href="mailto:partners@total-filtration.com" className="underline">
                        partners@total-filtration.com
                      </a>
                    </p>
                  </div>
                ) : (
                  <StatusTimeline currentStatus={order.status} />
                )}

                {/* Shipping info */}
                {order.status === "shipped" && order.tracking_number && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">
                        {order.carrier || "Carrier"} — {order.tracking_number}
                      </span>
                    </div>
                    <a
                      href={getTrackingUrl(order.carrier, order.tracking_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium flex items-center gap-1 hover:underline"
                      style={{ color: "#1B3A6B" }}
                    >
                      Track shipment <ExternalLink className="h-3 w-3" />
                    </a>
                    {order.shipped_date && (
                      <p className="text-xs text-muted-foreground">
                        Shipped {new Date(order.shipped_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Delivered */}
                {order.status === "delivered" && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Delivered{order.delivered_date ? ` ${new Date(order.delivered_date).toLocaleDateString()}` : ""}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

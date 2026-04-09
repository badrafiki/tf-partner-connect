import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  FileText, ShoppingCart, DollarSign, Percent, Tag, Package, Bell,
  Mail, Truck
} from "lucide-react";

const tierColors: Record<string, { bg: string; text: string }> = {
  Bronze: { bg: "#CD7F32", text: "#FFFFFF" },
  Silver: { bg: "#C0C0C0", text: "#1B3A6B" },
  Gold: { bg: "#FFD700", text: "#1B3A6B" },
  Platinum: { bg: "#E5E4E2", text: "#1B3A6B" },
  Diamond: { bg: "#B9F2FF", text: "#1B3A6B" },
};

const notifIcons: Record<string, { icon: typeof Bell; color: string }> = {
  price_change: { icon: Tag, color: "text-amber-500" },
  stock_update: { icon: Package, color: "text-blue-500" },
  quotation_issued: { icon: FileText, color: "text-green-500" },
  general: { icon: Bell, color: "text-muted-foreground" },
};

const statusColors: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800",
  reviewed: "bg-blue-100 text-blue-800",
  quoted: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

function formatUSD(v: number | null) {
  if (v == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function PortalDashboard() {
  const { partnerId, contactName, companyName, discountPercentage, tierLabel, assignedRep } = useAuth();
  const queryClient = useQueryClient();
  const tier = tierLabel || "Bronze";
  const tc = tierColors[tier] || tierColors.Bronze;

  // KPI data
  const { data: enquiries = [] } = useQuery({
    queryKey: ["partner-enquiries", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("enquiries")
        .select("id, status, submitted_at, line_items, total_list_usd, total_partner_usd")
        .eq("partner_id", partnerId!)
        .order("submitted_at", { ascending: false });
      return data || [];
    },
    enabled: !!partnerId,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ["partner-quotations", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotations")
        .select("id, status, issued_at, expires_at, notes")
        .eq("partner_id", partnerId!);
      return data || [];
    },
    enabled: !!partnerId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["partner-orders-dashboard", partnerId],
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

  const { data: notifications = [] } = useQuery({
    queryKey: ["partner-notifications", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("partner_id", partnerId!)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!partnerId,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read: true }).eq("partner_id", partnerId!).eq("read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-notifications"] }),
  });

  const pendingQuotations = quotations.filter((q) => q.status === "pending");
  const totalEnquiries = enquiries.length;
  const totalValue = enquiries.reduce((s, e) => s + (Number(e.total_partner_usd) || 0), 0);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const recentEnquiries = enquiries.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ backgroundColor: "#1B3A6B" }}>
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {contactName || "Partner"}</h1>
          <p className="text-white/70 text-sm mt-1">{companyName}</p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: tc.bg, color: tc.text }}>
            {tier} Partner
          </span>
          <p className="text-white/60 text-xs mt-1">Your discount: {discountPercentage}% off list price</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <FileText className="h-5 w-5 mb-2" style={{ color: "#1B3A6B" }} />
            <p className="text-xs text-muted-foreground">Total Enquiries</p>
            <p className="text-2xl font-bold" style={{ color: "#1B3A6B" }}>{totalEnquiries}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <ShoppingCart className="h-5 w-5 mb-2" style={{ color: "#1B3A6B" }} />
            <p className="text-xs text-muted-foreground">Pending Quotations</p>
            <p className={`text-2xl font-bold ${pendingQuotations.length > 0 ? "text-destructive" : ""}`} style={pendingQuotations.length === 0 ? { color: "#1B3A6B" } : {}}>
              {pendingQuotations.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="h-5 w-5 mb-2" style={{ color: "#1B3A6B" }} />
            <p className="text-xs text-muted-foreground">Total Value Enquired</p>
            <p className="text-2xl font-bold" style={{ color: "#1B3A6B" }}>{formatUSD(totalValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Partner price, all time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Percent className="h-5 w-5 mb-2" style={{ color: "#1B3A6B" }} />
            <p className="text-xs text-muted-foreground">Your Discount</p>
            <p className="text-2xl font-bold" style={{ color: "#1B3A6B" }}>{discountPercentage}%</p>
            <p className="text-xs text-muted-foreground mt-1">Applied to all products</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          {unreadCount > 0 && (
            <button onClick={() => markAllReadMutation.mutate()} className="text-sm text-muted-foreground hover:text-foreground">
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
            No notifications yet. We'll let you know when prices change, stock updates or a quotation is ready.
          </CardContent></Card>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => {
              const cfg = notifIcons[n.type] || notifIcons.general;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markReadMutation.mutate(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 rounded-md cursor-pointer transition-colors ${
                    !n.read ? "bg-primary/5 border-l-[3px]" : "border-l-[3px] border-transparent"
                  }`}
                  style={!n.read ? { borderLeftColor: "#1B3A6B" } : {}}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <span className={`flex-1 text-sm ${!n.read ? "font-semibold" : ""}`}>{n.message}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{relativeTime(n.created_at || "")}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Quotations */}
      {pendingQuotations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Action required — quotations awaiting your response</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingQuotations.map((q) => {
              const days = q.expires_at ? daysUntil(q.expires_at) : null;
              return (
                <Card key={q.id}>
                  <CardContent className="pt-5 space-y-1">
                    <p className="text-sm font-mono text-muted-foreground">{q.id.slice(0, 8)}</p>
                    <p className="text-sm">Issued: {new Date(q.issued_at || "").toLocaleDateString()}</p>
                    {days != null && (
                      <p className={`text-sm font-medium ${days <= 2 ? "text-destructive" : days <= 7 ? "text-amber-600" : "text-muted-foreground"}`}>
                        Expires in {days} day{days !== 1 ? "s" : ""}
                      </p>
                    )}
                    <Link to="/portal/quotations" className="text-sm font-medium hover:underline" style={{ color: "#1B3A6B" }}>
                      View &amp; respond →
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Enquiries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Recent enquiries</h2>
          <Link to="/portal/enquiries" className="text-sm hover:underline" style={{ color: "#1B3A6B" }}>View all →</Link>
        </div>
        {recentEnquiries.length === 0 ? (
          <Card><CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground text-sm">No enquiries yet. Browse the catalog and submit your first enquiry.</p>
            <Button asChild><Link to="/portal/products">Browse products →</Link></Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {recentEnquiries.map((e) => {
              const items = Array.isArray(e.line_items) ? e.line_items : [];
              // Find quotation for this enquiry
              const linkedQt = quotations.find((q) => q.id && e.id && quotations.some((qq: any) => qq.enquiry_id === e.id));
              const acceptedQt = quotations.find((q: any) => q.enquiry_id === e.id && q.status === "accepted");
              const linkedOrder = acceptedQt ? orders.find((o: any) => o.quotation_id === acceptedQt.id) : null;

              return (
                <Card key={e.id}>
                  <CardContent className="pt-5 space-y-1">
                    <p className="text-sm font-mono text-muted-foreground">{e.id.slice(0, 8)}</p>
                    <p className="text-sm">{new Date(e.submitted_at || "").toLocaleDateString()}</p>
                    <p className="text-sm">{items.length} product{items.length !== 1 ? "s" : ""}</p>
                    <p className="text-sm font-medium">{formatUSD(Number(e.total_partner_usd))}</p>
                    <Badge className={statusColors[e.status] || "bg-gray-100 text-gray-600"}>{e.status}</Badge>
                    {e.status === "quoted" && (
                      <Link to="/portal/quotations" className="block text-sm font-medium hover:underline mt-1" style={{ color: "#1B3A6B" }}>
                        Quotation ready →
                      </Link>
                    )}
                    {linkedOrder && (
                      <div className="mt-1 text-xs space-y-0.5">
                        <p className="font-medium">
                          Order ORD-{linkedOrder.modusys_order_number || linkedOrder.id?.slice(0, 8)}: {linkedOrder.status === "in_progress" ? "Processing" : linkedOrder.status}
                        </p>
                        {linkedOrder.status === "shipped" && linkedOrder.tracking_number && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Truck className="h-3 w-3" /> {linkedOrder.tracking_number}
                          </p>
                        )}
                        <Link to="/portal/orders" className="text-xs hover:underline" style={{ color: "#1B3A6B" }}>
                          View order →
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Rep Contact Card */}
      <Card className="bg-muted">
        <CardContent className="pt-5 flex items-start gap-3">
          <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            {assignedRep ? (
              <>
                <p className="text-sm font-medium">Your TF USA contact</p>
                <p className="text-sm">{assignedRep}</p>
              </>
            ) : (
              <p className="text-sm font-medium">Questions? Contact the TF USA team</p>
            )}
            <a href="mailto:partners@total-filtration.com" className="text-sm hover:underline" style={{ color: "#1B3A6B" }}>
              partners@total-filtration.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

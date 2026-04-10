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
  Bronze: { bg: "bg-[#CD7F32]", text: "text-white" },
  Silver: { bg: "bg-muted-foreground", text: "text-white" },
  Gold: { bg: "bg-amber-400", text: "text-white" },
  Platinum: { bg: "bg-indigo-500", text: "text-white" },
  Diamond: { bg: "bg-cyan-500", text: "text-white" },
};

const notifIcons: Record<string, { icon: typeof Bell; color: string }> = {
  price_change: { icon: Tag, color: "text-amber-500" },
  stock_update: { icon: Package, color: "text-blue-500" },
  quotation_issued: { icon: FileText, color: "text-green-500" },
  order_update: { icon: Truck, color: "text-purple-500" },
  general: { icon: Bell, color: "text-muted-foreground" },
};

const statusColors: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800",
  reviewed: "bg-blue-100 text-blue-800",
  quoted: "bg-green-100 text-green-800",
  closed: "bg-muted text-muted-foreground",
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
        .select("id, status, issued_at, expires_at, notes, enquiry_id")
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

  const kpis = [
    { icon: FileText, label: "Total Enquiries", value: String(totalEnquiries), context: "All time", highlight: false },
    { icon: ShoppingCart, label: "Pending Quotations", value: String(pendingQuotations.length), context: "Awaiting response", highlight: pendingQuotations.length > 0 },
    { icon: DollarSign, label: "Total Value Enquired", value: formatUSD(totalValue), context: "Partner price, all time", highlight: false },
    { icon: Percent, label: "Your Discount", value: `${discountPercentage}%`, context: "Applied to all products", highlight: false },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-primary px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-white">
            Welcome back, {contactName || "Partner"}
          </h1>
          <p className="text-white/60 text-sm mt-0.5">{companyName}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${tc.bg} ${tc.text}`}>
            {tier} Partner
          </span>
          <p className="text-white/60 text-xs mt-1">{discountPercentage}% partner discount</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border border-border rounded-xl">
            <CardContent className="pt-5 pb-4">
              <div className="h-10 w-10 rounded-full bg-tf-navy-light flex items-center justify-center mb-3">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-[13px] text-muted-foreground">{kpi.label}</p>
              <p className={`text-[28px] font-semibold mt-0.5 ${kpi.highlight ? "text-accent" : "text-primary"}`}>
                {kpi.value}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{kpi.context}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notifications Feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-primary">Notifications</h2>
          {unreadCount > 0 && (
            <button onClick={() => markAllReadMutation.mutate()} className="text-sm text-muted-foreground hover:text-foreground">
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <Card className="border border-border"><CardContent className="py-8 text-center text-muted-foreground text-sm">
            No notifications yet. We'll let you know when prices change, stock updates or a quotation is ready.
          </CardContent></Card>
        ) : (
          <div className="space-y-0.5">
            {notifications.map((n) => {
              const cfg = notifIcons[n.type] || notifIcons.general;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markReadMutation.mutate(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                    !n.read ? "bg-tf-navy-light border-l-[3px] border-l-primary" : "hover:bg-muted/50 border-l-[3px] border-l-transparent"
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <span className={`flex-1 text-sm ${!n.read ? "font-semibold text-foreground" : "text-foreground"}`}>{n.message}</span>
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
            <span className="h-2 w-2 rounded-full bg-accent" />
            <h2 className="text-sm font-medium text-accent">Action required</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingQuotations.map((q) => {
              const days = q.expires_at ? daysUntil(q.expires_at) : null;
              return (
                <Card key={q.id} className="border-l-[3px] border-l-accent">
                  <CardContent className="pt-5 space-y-1">
                    <p className="text-sm font-mono text-muted-foreground">{q.id.slice(0, 8)}</p>
                    <p className="text-sm">Issued: {new Date(q.issued_at || "").toLocaleDateString()}</p>
                    {days != null && (
                      <p className={`text-sm font-medium ${days <= 2 ? "text-accent" : days <= 7 ? "text-amber-600" : "text-muted-foreground"}`}>
                        Expires in {days} day{days !== 1 ? "s" : ""}
                      </p>
                    )}
                    <Link to="/portal/quotations" className="text-sm font-medium text-primary hover:underline block pt-1">
                      View & respond →
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
          <h2 className="text-base font-semibold text-primary">Recent enquiries</h2>
          <Link to="/portal/enquiries" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {recentEnquiries.length === 0 ? (
          <Card className="border border-border"><CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground text-sm">No enquiries yet. Browse the catalog and submit your first enquiry.</p>
            <Button asChild><Link to="/portal/products">Browse products →</Link></Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {recentEnquiries.map((e) => {
              const items = Array.isArray(e.line_items) ? e.line_items : [];
              const acceptedQt = quotations.find((q: any) => q.enquiry_id === e.id && q.status === "accepted");
              const linkedOrder = acceptedQt ? orders.find((o: any) => o.quotation_id === acceptedQt.id) : null;

              return (
                <Card key={e.id} className="border border-border rounded-xl">
                  <CardContent className="pt-5 space-y-1">
                    <p className="text-sm font-mono text-muted-foreground">{e.id.slice(0, 8)}</p>
                    <p className="text-sm text-foreground">{new Date(e.submitted_at || "").toLocaleDateString()}</p>
                    <p className="text-sm text-foreground">{items.length} product{items.length !== 1 ? "s" : ""}</p>
                    <p className="text-sm font-medium text-primary">{formatUSD(Number(e.total_partner_usd))}</p>
                    <Badge className={statusColors[e.status] || "bg-muted text-muted-foreground"}>{e.status}</Badge>
                    {e.status === "quoted" && (
                      <Link to="/portal/quotations" className="block text-sm font-medium text-primary hover:underline mt-1">
                        Quotation ready →
                      </Link>
                    )}
                    {linkedOrder && (
                      <div className="mt-1 text-xs space-y-0.5">
                        <p className="font-medium text-foreground">
                          Order ORD-{linkedOrder.modusys_order_number || linkedOrder.id?.slice(0, 8)}: {linkedOrder.status === "in_progress" ? "Processing" : linkedOrder.status}
                        </p>
                        {linkedOrder.status === "shipped" && linkedOrder.tracking_number && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Truck className="h-3 w-3" /> {linkedOrder.tracking_number}
                          </p>
                        )}
                        <Link to="/portal/orders" className="text-xs text-primary hover:underline">View order →</Link>
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
      <Card className="bg-tf-navy-light border border-border">
        <CardContent className="pt-5 flex items-start gap-3">
          <Mail className="h-5 w-5 text-primary mt-0.5" />
          <div>
            {assignedRep ? (
              <>
                <p className="text-sm font-medium text-foreground">Your TF USA contact</p>
                <p className="text-sm text-foreground">{assignedRep}</p>
              </>
            ) : (
              <p className="text-sm font-medium text-foreground">Questions? Contact the TF USA team</p>
            )}
            <a href="mailto:partners@total-filtration.com" className="text-sm text-primary hover:underline">
              partners@total-filtration.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RefreshCw, Copy, ArrowRight, CheckCircle2, XCircle, Clock, ChevronDown, Loader2, AlertCircle, Users, Package } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Partner = Tables<"partners">;

export default function AdminErpSync() {
  const [pulling, setPulling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking");
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [unsyncedOpen, setUnsyncedOpen] = useState(false);

  // Check connection status
  useEffect(() => {
    setConnectionStatus("connected");
  }, []);

  // Fetch sync log
  const { data: syncLog, refetch: refetchLog } = useQuery({
    queryKey: ["erp-sync-log", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("erp_sync_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Get last successful stock sync
  const { data: lastSync, refetch: refetchLastSync } = useQuery({
    queryKey: ["last-stock-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("erp_sync_log")
        .select("*")
        .eq("event_type", "stock_sync")
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lastPullSync, refetch: refetchLastPull } = useQuery({
    queryKey: ["last-stock-pull-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("erp_sync_log")
        .select("*")
        .eq("event_type", "stock_sync_pull")
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch partners for customer sync section
  const { data: partners = [], refetch: refetchPartners } = useQuery({
    queryKey: ["erp-partners-sync"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("company_name");
      if (error) throw error;
      return data as Partner[];
    },
  });

  const syncedCount = partners.filter(p => p.modusys_customer_id).length;
  const unsyncedPartners = partners.filter(p => !p.modusys_customer_id);

  // Order sync stats
  const { data: orderStats } = useQuery({
    queryKey: ["erp-order-stats"],
    queryFn: async () => {
      const { count: totalOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      const { count: syncedOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .not("modusys_order_id", "is", null);
      const { count: unsyncedOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .is("modusys_order_id", null);
      const { data: lastOrderEvent } = await supabase
        .from("erp_sync_log")
        .select("*")
        .in("event_type", ["order_created", "order_status_synced"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        total: totalOrders ?? 0,
        synced: syncedOrders ?? 0,
        unsynced: unsyncedOrders ?? 0,
        lastEvent: lastOrderEvent,
      };
    },
  });

  const lastSyncEntry = (() => {
    if (!lastSync && !lastPullSync) return null;
    if (!lastSync) return lastPullSync;
    if (!lastPullSync) return lastSync;
    return new Date(lastSync.created_at!) > new Date(lastPullSync.created_at!)
      ? lastSync : lastPullSync;
  })();

  const handlePullStock = async () => {
    setPulling(true);
    try {
      const { data, error } = await supabase.functions.invoke("pull-stock-from-modusys", {
        method: "POST",
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(`Stock pull failed: ${data.error}`);
      } else {
        toast.success(`Updated ${data.updated} products`);
      }
      refetchLog();
      refetchLastSync();
      refetchLastPull();
    } catch (err: any) {
      toast.error(err.message || "Failed to pull stock");
    } finally {
      setPulling(false);
    }
  };

  const handleSyncOne = async (partnerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-modusys-customer", {
        body: { partner_id: partnerId },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(`Sync failed: ${data.error}`);
      } else {
        toast.success("Customer synced to ModuSys");
      }
      refetchPartners();
      refetchLog();
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    }
  };

  const handleSyncAll = async () => {
    if (unsyncedPartners.length === 0) return;
    setSyncingAll(true);
    setSyncProgress({ current: 0, total: unsyncedPartners.length });

    for (let i = 0; i < unsyncedPartners.length; i++) {
      setSyncProgress({ current: i + 1, total: unsyncedPartners.length });
      try {
        await supabase.functions.invoke("create-modusys-customer", {
          body: { partner_id: unsyncedPartners[i].id },
        });
      } catch (e) {
        console.error(`Failed to sync ${unsyncedPartners[i].company_name}:`, e);
      }
    }

    toast.success(`Sync complete — processed ${unsyncedPartners.length} partners`);
    setSyncingAll(false);
    refetchPartners();
    refetchLog();
  };

  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sync-stock`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  const formatEventType = (type: string) => {
    const map: Record<string, string> = {
      stock_sync: "Stock sync",
      stock_sync_pull: "Stock pull",
      customer_created: "Customer created",
      customer_updated: "Customer updated",
      quote_created: "Quote created",
      order_created: "Order created",
      order_updated: "Order updated",
    };
    return map[type] || type;
  };

  const getProductsSynced = (entry: any) => {
    const payload = entry?.payload as any;
    if (!payload) return "—";
    if (payload.updated !== undefined) return payload.updated;
    if (payload.items_received !== undefined) return payload.items_received;
    return "—";
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ERP Integration</h1>
          <p className="text-muted-foreground text-sm mt-1">
            ModuSys ERP synchronisation status and controls
          </p>
        </div>
        <Badge
          variant={connectionStatus === "connected" ? "default" : "destructive"}
          className={connectionStatus === "connected" ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {connectionStatus === "checking" ? "Checking..." : connectionStatus === "connected" ? "Connected" : "Error"}
        </Badge>
      </div>

      {/* Customer Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="text-sm text-muted-foreground">Synced to ModuSys</div>
                <div className="text-xl font-bold text-green-700">{syncedCount}</div>
              </div>
              <div className={`rounded-md p-3 border ${unsyncedPartners.length > 0 ? "bg-amber-50 border-amber-200" : "bg-muted border-border"}`}>
                <div className="text-sm text-muted-foreground">Not synced</div>
                <div className={`text-xl font-bold ${unsyncedPartners.length > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                  {unsyncedPartners.length}
                </div>
              </div>
            </div>
            {unsyncedPartners.length > 0 && (
              <Button
                onClick={handleSyncAll}
                disabled={syncingAll}
                className="bg-[#1B3A6B] hover:bg-[#15305a]"
              >
                {syncingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing {syncProgress.current} of {syncProgress.total}…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync all unsynced
                  </>
                )}
              </Button>
            )}
          </div>

          {unsyncedPartners.length > 0 && (
            <Collapsible open={unsyncedOpen} onOpenChange={setUnsyncedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${unsyncedOpen ? "rotate-180" : ""}`} />
                  {unsyncedOpen ? "Hide" : "Show"} unsynced partners
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-md border mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-32">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unsyncedPartners.map(p => (
                        <UnsyncedPartnerRow key={p.id} partner={p} onSync={() => handleSyncOne(p.id)} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Stock Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stock Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="space-y-1 flex-1">
              <div className="text-sm text-muted-foreground">Last synced</div>
              <div className="text-sm font-medium">
                {lastSyncEntry ? `${formatDistanceToNow(new Date(lastSyncEntry.created_at!))} ago` : "Never"}
              </div>
            </div>
            <div className="space-y-1 flex-1">
              <div className="text-sm text-muted-foreground">Products synced</div>
              <div className="text-sm font-medium">
                {lastSyncEntry ? getProductsSynced(lastSyncEntry) : "—"}
              </div>
            </div>
            <Button onClick={handlePullStock} disabled={pulling} className="bg-[#1B3A6B] hover:bg-[#15305a]">
              <RefreshCw className={`h-4 w-4 mr-2 ${pulling ? "animate-spin" : ""}`} />
              {pulling ? "Pulling..." : "Pull latest stock now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Order Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-muted rounded-md p-3">
              <div className="text-sm text-muted-foreground">Total orders</div>
              <div className="text-xl font-bold">{orderStats?.total ?? 0}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="text-sm text-muted-foreground">Synced to ModuSys</div>
              <div className="text-xl font-bold text-green-700">{orderStats?.synced ?? 0}</div>
            </div>
            <div className={`rounded-md p-3 border ${(orderStats?.unsynced ?? 0) > 0 ? "bg-amber-50 border-amber-200" : "bg-muted border-border"}`}>
              <div className="text-sm text-muted-foreground">Pending sync</div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${(orderStats?.unsynced ?? 0) > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                  {orderStats?.unsynced ?? 0}
                </span>
                {(orderStats?.unsynced ?? 0) > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">!</Badge>
                )}
              </div>
            </div>
            <div className="bg-muted rounded-md p-3">
              <div className="text-sm text-muted-foreground">Last order event</div>
              <div className="text-sm font-medium">
                {orderStats?.lastEvent?.created_at
                  ? formatDistanceToNow(new Date(orderStats.lastEvent.created_at), { addSuffix: true })
                  : "Never"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Sync Log</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLog && syncLog.length > 0 ? (
                  syncLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm whitespace-nowrap" title={entry.created_at ? format(new Date(entry.created_at), "PPpp") : ""}>
                        {entry.created_at ? formatDistanceToNow(new Date(entry.created_at), { addSuffix: true }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{formatEventType(entry.event_type)}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {entry.direction === "modusys_to_portal" ? (
                            <>ModuSys <ArrowRight className="h-3 w-3" /> Portal</>
                          ) : (
                            <>Portal <ArrowRight className="h-3 w-3" /> ModuSys</>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.entity_type}
                        {entry.entity_id && (
                          <span className="text-muted-foreground ml-1 text-xs">({String(entry.entity_id).slice(0, 8)})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={entry.status === "success" ? "default" : "destructive"}
                          className={entry.status === "success" ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {entry.status === "success" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : entry.status === "error" ? <XCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {entry.status === "error" ? entry.error_message || "Unknown error" : entry.payload ? JSON.stringify(entry.payload).slice(0, 60) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No sync events recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integration Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">ModuSys URL</div>
              <div className="text-sm font-mono mt-1 truncate">https://wrmstanilfjlerbcrqcn.supabase.co</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Integration secret</div>
              <div className="text-sm font-mono mt-1">●●●●●●●●</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Webhook endpoint</div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded truncate flex-1">{webhookUrl}</code>
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                <Copy className="h-4 w-4 mr-1" />Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───── Unsynced Partner Row ───── */
function UnsyncedPartnerRow({ partner, onSync }: { partner: Partner; onSync: () => void }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await onSync();
    setSyncing(false);
  };

  return (
    <TableRow>
      <TableCell className="text-sm font-medium">{partner.company_name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{partner.contact_email}</TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
          {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Sync now
        </Button>
      </TableCell>
    </TableRow>
  );
}

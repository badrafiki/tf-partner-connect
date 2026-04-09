import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { Inbox, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApplicationDetailSheet } from "@/components/admin/ApplicationDetailSheet";

type Application = Tables<"applications">;
type StatusFilter = "all" | "pending" | "approved" | "rejected" | "info_requested";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
  info_requested: { label: "Info requested", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "info_requested", label: "Info Requested" },
];

export default function AdminApplications() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admin-applications", statusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("applications")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (search.trim()) {
        query = query.or(
          `legal_business_name.ilike.%${search.trim()}%,contact_email.ilike.%${search.trim()}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Application[];
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["admin-applications-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const pendingCount = useQuery({
    queryKey: ["admin-applications-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
    queryClient.invalidateQueries({ queryKey: ["admin-applications-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-applications-pending-count"] });
  }, [queryClient]);

  const handleQuickApprove = (app: Application) => {
    setSelectedApp(app);
  };

  const handleQuickReject = async (app: Application) => {
    if (!confirm(`Reject application from ${app.legal_business_name}?`)) return;

    const { error } = await supabase
      .from("applications")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", app.id);

    if (error) {
      toast.error("Failed to reject application");
      return;
    }

    supabase.functions.invoke("notify-rejection", {
      body: { application_id: app.id },
    }).catch(console.error);

    toast.success("Application rejected");
    refreshAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Applications</h1>
        {(pendingCount.data ?? 0) > 0 && (
          <Badge className="bg-accent text-accent-foreground">{pendingCount.data}</Badge>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Showing {applications.length} of {totalCount}
          </span>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">No applications yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            New partner applications submitted via partners.total-filtration.com/apply will appear here.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden lg:table-cell">Volume</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium">{app.legal_business_name}</p>
                      {app.trading_name && app.trading_name !== app.legal_business_name && (
                        <p className="text-xs text-muted-foreground">{app.trading_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{app.contact_first_name} {app.contact_last_name}</p>
                      <p className="text-xs text-muted-foreground">{app.contact_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{app.reg_address_state || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm">{app.annual_volume_estimate || "—"}</span>
                  </TableCell>
                  <TableCell>
                    {app.submitted_at ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-sm">{formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true })}</span>
                        </TooltipTrigger>
                        <TooltipContent>{format(new Date(app.submitted_at), "PPpp")}</TooltipContent>
                      </Tooltip>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_CONFIG[app.status]?.className ?? ""}>
                      {STATUS_CONFIG[app.status]?.label ?? app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setSelectedApp(app)}>
                        Review
                      </Button>
                      {app.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300 hover:bg-green-50 hidden group-hover:inline-flex"
                            onClick={() => handleQuickApprove(app)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-300 hover:bg-red-50 hidden group-hover:inline-flex"
                            onClick={() => handleQuickReject(app)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ApplicationDetailSheet
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onRefresh={refreshAll}
      />
    </div>
  );
}

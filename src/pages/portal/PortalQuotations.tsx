import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { Download, Check, X, FileText } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-800",
};

const borderColors: Record<string, string> = {
  pending: "#1B3A6B",
  accepted: "#22c55e",
  declined: "#9ca3af",
  expired: "#ef4444",
};

function formatUSD(v: number | null) {
  if (v == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

type StatusFilter = "all" | "pending" | "accepted" | "declined" | "expired";

export default function PortalQuotations() {
  const { partnerId } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [acceptId, setAcceptId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["portal-quotations", partnerId],
    queryFn: async () => {
      // Use the partner view to exclude admin_notes
      const { data } = await supabase
        .from("quotations_partner_view" as any)
        .select("*")
        .eq("partner_id", partnerId!)
        .order("issued_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!partnerId,
  });

  // Fetch linked enquiries for summaries
  const enquiryIds = [...new Set(quotations.map((q: any) => q.enquiry_id).filter(Boolean))];
  const { data: enquiries = [] } = useQuery({
    queryKey: ["portal-quotation-enquiries", enquiryIds],
    queryFn: async () => {
      if (enquiryIds.length === 0) return [];
      const { data } = await supabase
        .from("enquiries")
        .select("id, line_items, total_partner_usd, total_list_usd")
        .in("id", enquiryIds);
      return data || [];
    },
    enabled: enquiryIds.length > 0,
  });

  const enquiryMap = Object.fromEntries(enquiries.map((e: any) => [e.id, e]));

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("quotations").update({ status: "accepted" }).eq("id", id);
      await supabase.functions.invoke("notify-quotation-response", {
        body: { quotation_id: id, response: "accepted" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-quotations"] });
      toast.success("Quotation accepted. The TF USA team has been notified.");
      setAcceptId(null);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const qt = quotations.find((q: any) => q.id === id);
      const existingNotes = qt?.notes || "";
      const newNotes = existingNotes + (existingNotes ? "\n" : "") + "[DECLINED]: " + (reason || "No reason provided");
      await supabase.from("quotations").update({ status: "declined", notes: newNotes }).eq("id", id);
      await supabase.functions.invoke("notify-quotation-response", {
        body: { quotation_id: id, response: "declined", reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-quotations"] });
      toast.success("Quotation declined.");
      setDeclineId(null);
      setDeclineReason("");
    },
  });

  const filtered = filter === "all" ? quotations : quotations.filter((q: any) => q.status === filter);
  const filters: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Accepted", value: "accepted" },
    { label: "Declined", value: "declined" },
    { label: "Expired", value: "expired" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Quotations</h1>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Quotation Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground text-sm">
              {filter === "all"
                ? "No quotations yet. Submit an enquiry and our team will respond with a formal quotation."
                : `No ${filter} quotations.`}
            </p>
            {filter === "all" && (
              <Button asChild><Link to="/portal/products">Browse products →</Link></Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q: any) => {
            const enq = enquiryMap[q.enquiry_id];
            const items = enq ? (Array.isArray(enq.line_items) ? enq.line_items : []) : [];
            const partnerTotal = enq ? Number(enq.total_partner_usd) : 0;
            const days = q.expires_at ? daysUntil(q.expires_at) : null;

            return (
              <Card key={q.id} className="overflow-hidden" style={{ borderLeft: `4px solid ${borderColors[q.status] || "#9ca3af"}` }}>
                <CardContent className="pt-5 space-y-2">
                  {/* Top row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">QT-{q.id.slice(0, 8)}</span>
                      <Badge className={statusColors[q.status] || ""}>{q.status}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{new Date(q.issued_at || "").toLocaleDateString()}</span>
                  </div>

                  {/* Enquiry ref */}
                  {q.enquiry_id && (
                    <p className="text-sm text-muted-foreground">
                      In response to enquiry <span className="font-mono">ENQ-{q.enquiry_id.slice(0, 8)}</span>
                    </p>
                  )}

                  {/* Summary */}
                  <p className="text-sm">{items.length} product{items.length !== 1 ? "s" : ""} — {formatUSD(partnerTotal)} your price</p>

                  {/* Expiry */}
                  {q.expires_at && (
                    <p className={`text-sm font-medium ${
                      days != null && days <= 2 ? "text-destructive" : days != null && days <= 7 ? "text-amber-600" : "text-muted-foreground"
                    }`}>
                      Valid until {new Date(q.expires_at).toLocaleDateString()}
                      {days != null && days > 0 ? ` (${days} day${days !== 1 ? "s" : ""})` : ""}
                    </p>
                  )}

                  {/* Admin notes */}
                  {q.notes && !q.notes.includes("[DECLINED]") && (
                    <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded">
                      {q.notes.split("\n").filter((l: string) => !l.startsWith("[DECLINED]")).join("\n")}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {q.pdf_url ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={q.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-1" /> Download PDF
                        </a>
                      </Button>
                    ) : (
                      <span className="text-sm italic text-muted-foreground">PDF being prepared...</span>
                    )}

                    {q.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setAcceptId(q.id)}>
                          <Check className="h-4 w-4 mr-1" /> Accept Quotation
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => setDeclineId(q.id)}>
                          <X className="h-4 w-4 mr-1" /> Decline
                        </Button>
                      </>
                    )}
                    {q.status === "accepted" && (
                      <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                        <Check className="h-4 w-4" /> Accepted
                      </span>
                    )}
                    {q.status === "declined" && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <X className="h-4 w-4" /> Declined
                      </span>
                    )}
                    {q.status === "expired" && (
                      <span className="text-sm text-destructive">
                        This quotation has expired. Contact your rep to request a new one.
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Accept Dialog */}
      <Dialog open={!!acceptId} onOpenChange={(o) => !o && setAcceptId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept this quotation?</DialogTitle>
            <DialogDescription>
              By accepting, you confirm you'd like to proceed with this order. TF USA will be in touch to arrange fulfilment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptId(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => acceptId && acceptMutation.mutate(acceptId)} disabled={acceptMutation.isPending}>
              Confirm acceptance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={!!declineId} onOpenChange={(o) => { if (!o) { setDeclineId(null); setDeclineReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this quotation?</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="e.g. price, timing, found alternative..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeclineId(null); setDeclineReason(""); }}>Cancel</Button>
            <Button variant="outline" className="text-destructive border-destructive" onClick={() => declineId && declineMutation.mutate({ id: declineId, reason: declineReason })} disabled={declineMutation.isPending}>
              Confirm decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

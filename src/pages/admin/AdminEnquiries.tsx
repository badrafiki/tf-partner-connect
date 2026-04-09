import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, MessageSquare, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type Enquiry = Tables<"enquiries">;
type Partner = Tables<"partners">;

const formatUSD = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const statusColor: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800 border-amber-200",
  reviewed: "bg-blue-100 text-blue-800 border-blue-200",
  quoted: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

type LineItem = {
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  list_price_usd: number;
  partner_price_usd: number;
  line_total_list: number;
  line_total_partner: number;
};

/* ───── Raise Quotation Dialog ───── */
function RaiseQuotationDialog({
  open,
  onClose,
  enquiry,
  partnerName,
}: {
  open: boolean;
  onClose: () => void;
  enquiry: Enquiry;
  partnerName: string;
}) {
  const [notes, setNotes] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const expires = new Date();
      expires.setDate(expires.getDate() + expiryDays);
      const { error: qError } = await supabase.from("quotations").insert({
        enquiry_id: enquiry.id,
        partner_id: enquiry.partner_id,
        status: "pending",
        expires_at: expires.toISOString(),
        notes: notes || null,
      });
      if (qError) throw qError;
      const { error: eError } = await supabase.from("enquiries").update({ status: "quoted" }).eq("id", enquiry.id);
      if (eError) throw eError;
    },
    onSuccess: () => {
      toast.success("Quotation created — go to Quotations to add a PDF and send.");
      queryClient.invalidateQueries({ queryKey: ["admin-enquiries"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise quotation for {partnerName}</DialogTitle>
          <DialogDescription>This will create a quotation record. You can add a PDF and notes before sending.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Expiry (days from today)</Label>
            <Input type="number" min={1} max={365} value={expiryDays} onChange={e => setExpiryDays(parseInt(e.target.value) || 30)} />
          </div>
          <div>
            <Label>Notes (visible to partner)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Detail Sheet ───── */
function EnquiryDetailSheet({
  enquiry,
  partner,
  open,
  onClose,
}: {
  enquiry: Enquiry | null;
  partner: Partner | null;
  open: boolean;
  onClose: () => void;
}) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [notes, setNotes] = useState(enquiry?.notes || "");
  const queryClient = useQueryClient();

  const lineItems = (enquiry?.line_items as unknown as LineItem[]) || [];
  const poRef = enquiry?.notes?.startsWith("PO Reference:") ? enquiry.notes.replace("PO Reference: ", "") : null;

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("enquiries").update({ status }).eq("id", enquiry!.id);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      toast.success(`Enquiry marked as ${status}`);
      queryClient.invalidateQueries({ queryKey: ["admin-enquiries"] });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async (newNotes: string) => {
      const { error } = await supabase.from("enquiries").update({ notes: newNotes }).eq("id", enquiry!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-enquiries"] }),
  });

  if (!enquiry) return null;

  const totalList = Number(enquiry.total_list_usd) || 0;
  const totalPartner = Number(enquiry.total_partner_usd) || 0;
  const saving = totalList - totalPartner;
  const savingPct = totalList > 0 ? (saving / totalList) * 100 : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <SheetContent className="w-full sm:max-w-[640px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Enquiry {enquiry.id.slice(0, 8)}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-4">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{partner?.company_name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">
                  {enquiry.submitted_at ? new Date(enquiry.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColor[enquiry.status] || ""}>{enquiry.status}</Badge>
                <Select value={enquiry.status} onValueChange={v => updateStatus.mutate(v)}>
                  <SelectTrigger className="w-8 h-8 p-0 border-0"><ChevronDown className="h-3 w-3" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Partner info */}
            {partner && (
              <div className="bg-muted rounded-lg p-4 text-sm grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Contact:</span> {partner.contact_name}</div>
                <div><span className="text-muted-foreground">Email:</span> {partner.contact_email}</div>
                <div><span className="text-muted-foreground">Discount:</span> <span className="text-green-600 font-medium">{partner.discount_percentage}%</span></div>
                <div><span className="text-muted-foreground">Rep:</span> {partner.assigned_rep || "—"}</div>
              </div>
            )}

            {poRef && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                <strong>PO Reference:</strong> {poRef}
              </div>
            )}

            <Separator />

            {/* Line items */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">List</TableHead>
                    <TableHead className="text-right">Partner</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                      <TableCell className="text-sm font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatUSD(item.list_price_usd)}</TableCell>
                      <TableCell className="text-right text-sm">{formatUSD(item.partner_price_usd)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatUSD(item.line_total_partner)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">List Total</span><span>{formatUSD(totalList)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Partner Total</span><span className="font-semibold text-primary">{formatUSD(totalPartner)}</span></div>
              <div className="flex justify-between text-green-600"><span>Saving</span><span>{formatUSD(saving)} ({savingPct.toFixed(1)}%)</span></div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              {enquiry.status === "submitted" && (
                <Button variant="outline" className="w-full" onClick={() => updateStatus.mutate("reviewed")}>
                  Mark as Reviewed
                </Button>
              )}
              <Button className="w-full" onClick={() => setQuoteOpen(true)}>
                Raise Quotation
              </Button>
              {enquiry.status !== "closed" && (
                <Button variant="outline" className="w-full text-muted-foreground" onClick={() => setCloseConfirm(true)}>
                  Close Enquiry
                </Button>
              )}
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label>Internal Notes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={() => { if (notes !== enquiry.notes) updateNotes.mutate(notes); }}
                placeholder="Add internal notes..."
                rows={3}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {quoteOpen && partner && (
        <RaiseQuotationDialog
          open={quoteOpen}
          onClose={() => setQuoteOpen(false)}
          enquiry={enquiry}
          partnerName={partner.company_name}
        />
      )}

      <AlertDialog open={closeConfirm} onOpenChange={setCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the enquiry as closed. You can reopen it later by changing the status.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { updateStatus.mutate("closed"); setCloseConfirm(false); }}>
              Close Enquiry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ───── Main Page ───── */
export default function AdminEnquiries() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["admin-enquiries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enquiries").select("*").order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as Enquiry[];
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["admin-partners-map"],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("*");
      return (data || []) as Partner[];
    },
  });

  const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p])), [partners]);

  const filtered = useMemo(() => {
    let list = enquiries;

    // Date filter
    if (dateFilter !== "all") {
      const days = dateFilter === "7" ? 7 : dateFilter === "30" ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter(e => e.submitted_at && new Date(e.submitted_at) >= cutoff);
    }

    // Status filter
    if (statusFilter !== "all") list = list.filter(e => e.status === statusFilter);

    // Search by company name
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e => {
        const p = partnerMap.get(e.partner_id);
        return p?.company_name.toLowerCase().includes(s);
      });
    }

    return list;
  }, [enquiries, statusFilter, dateFilter, search, partnerMap]);

  const totalListValue = filtered.reduce((s, e) => s + (Number(e.total_list_usd) || 0), 0);
  const totalPartnerValue = filtered.reduce((s, e) => s + (Number(e.total_partner_usd) || 0), 0);

  const selectedEnquiry = enquiries.find(e => e.id === selectedId) || null;
  const selectedPartner = selectedEnquiry ? partnerMap.get(selectedEnquiry.partner_id) || null : null;

  const statusFilters = [
    { value: "all", label: "All" },
    { value: "submitted", label: "Submitted" },
    { value: "reviewed", label: "Reviewed" },
    { value: "quoted", label: "Quoted" },
    { value: "closed", label: "Closed" },
  ];

  const dateFilters = [
    { value: "7", label: "7 days" },
    { value: "30", label: "30 days" },
    { value: "90", label: "90 days" },
    { value: "all", label: "All time" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Enquiries</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and manage partner enquiries.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search company..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {statusFilters.map(f => (
            <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {dateFilters.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Enquiries</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">List Value</p>
          <p className="text-2xl font-bold">{formatUSD(totalListValue)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Partner Value</p>
          <p className="text-2xl font-bold text-primary">{formatUSD(totalPartnerValue)}</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold">No enquiries yet</h2>
          <p className="text-muted-foreground mt-1">They will appear here when distributors submit their first basket.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">List Value</TableHead>
                <TableHead className="text-right">Partner Value</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => {
                const partner = partnerMap.get(e.partner_id);
                const items = (e.line_items as unknown as LineItem[]) || [];
                return (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelectedId(e.id)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{e.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium text-sm">{partner?.company_name || "Unknown"}</TableCell>
                    <TableCell className="text-center text-sm">{items.length}</TableCell>
                    <TableCell className="text-right text-sm">{formatUSD(Number(e.total_list_usd) || 0)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatUSD(Number(e.total_partner_usd) || 0)}</TableCell>
                    <TableCell className="text-sm" title={e.submitted_at ? new Date(e.submitted_at).toLocaleString() : ""}>
                      {e.submitted_at ? relativeTime(e.submitted_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[e.status] || ""} variant="outline">{e.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <EnquiryDetailSheet
        enquiry={selectedEnquiry}
        partner={selectedPartner}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

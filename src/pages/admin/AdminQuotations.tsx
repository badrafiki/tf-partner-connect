import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Search, Upload, CalendarIcon, Check, ExternalLink, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-800",
};

function formatUSD(v: number | null) {
  if (v == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

type StatusFilter = "all" | "pending" | "accepted" | "declined" | "expired";

export default function AdminQuotations() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const { data: quotations = [] } = useQuery({
    queryKey: ["admin-quotations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotations")
        .select("*")
        .order("issued_at", { ascending: false });
      return data || [];
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["admin-partners-map"],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("id, company_name, contact_name, contact_email, discount_percentage, assigned_rep");
      return data || [];
    },
  });

  const { data: enquiries = [] } = useQuery({
    queryKey: ["admin-enquiries-map"],
    queryFn: async () => {
      const { data } = await supabase.from("enquiries").select("id, line_items, total_partner_usd, total_list_usd");
      return data || [];
    },
  });

  const partnerMap = Object.fromEntries(partners.map((p) => [p.id, p]));
  const enquiryMap = Object.fromEntries(enquiries.map((e) => [e.id, e]));

  const filtered = quotations
    .filter((q) => filter === "all" || q.status === filter)
    .filter((q) => {
      if (!search) return true;
      const p = partnerMap[q.partner_id];
      return p?.company_name?.toLowerCase().includes(search.toLowerCase());
    });

  const pendingCount = quotations.filter((q) => q.status === "pending").length;
  const acceptedValue = quotations
    .filter((q) => q.status === "accepted" && q.enquiry_id)
    .reduce((s, q) => s + (Number(enquiryMap[q.enquiry_id!]?.total_partner_usd) || 0), 0);

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

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
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
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>{filtered.length} quotation{filtered.length !== 1 ? "s" : ""}</span>
        <span>{pendingCount} pending</span>
        <span>Accepted value: {formatUSD(acceptedValue)}</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No quotations found.</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Enquiry</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => {
                const partner = partnerMap[q.partner_id];
                const enq = q.enquiry_id ? enquiryMap[q.enquiry_id] : null;
                const days = q.expires_at ? daysUntil(q.expires_at) : null;
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-sm">QT-{q.id.slice(0, 8)}</TableCell>
                    <TableCell>{partner?.company_name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {q.enquiry_id ? `ENQ-${q.enquiry_id.slice(0, 8)}` : "—"}
                    </TableCell>
                    <TableCell>{new Date(q.issued_at || "").toLocaleDateString()}</TableCell>
                    <TableCell>
                      {q.expires_at ? (
                        <span className={`${
                          days != null && days <= 0 ? "line-through text-muted-foreground" :
                          days != null && days <= 2 ? "text-destructive font-medium" :
                          days != null && days <= 7 ? "text-amber-600 font-medium" : ""
                        }`}>
                          {new Date(q.expires_at).toLocaleDateString()}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{enq ? formatUSD(Number(enq.total_partner_usd)) : "—"}</TableCell>
                    <TableCell>{q.pdf_url ? <Check className="h-4 w-4 text-green-600" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge className={statusColors[q.status] || ""}>{q.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setSelected(q)}>Manage</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Manage Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[640px] overflow-y-auto">
          {selected && (
            <QuotationManageSheet
              quotation={selected}
              partner={partnerMap[selected.partner_id]}
              enquiry={selected.enquiry_id ? enquiryMap[selected.enquiry_id] : null}
              onUpdated={(updated) => {
                setSelected(updated);
                queryClient.invalidateQueries({ queryKey: ["admin-quotations"] });
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function QuotationManageSheet({ quotation, partner, enquiry, onUpdated }: {
  quotation: any; partner: any; enquiry: any; onUpdated: (q: any) => void;
}) {
  const [notes, setNotes] = useState(quotation.notes || "");
  const [adminNotes, setAdminNotes] = useState(quotation.admin_notes || "");
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    quotation.expires_at ? new Date(quotation.expires_at) : undefined
  );
  const [expireConfirm, setExpireConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const items = enquiry ? (Array.isArray(enquiry.line_items) ? enquiry.line_items : []) : [];
  const listTotal = enquiry ? Number(enquiry.total_list_usd) : 0;
  const partnerTotal = enquiry ? Number(enquiry.total_partner_usd) : 0;

  const issuedDaysAgo = quotation.issued_at
    ? Math.floor((Date.now() - new Date(quotation.issued_at).getTime()) / 86400000)
    : 0;

  const saveNotes = async () => {
    await supabase.from("quotations").update({ notes }).eq("id", quotation.id);
    onUpdated({ ...quotation, notes });
    toast.success("Notes saved");
  };

  const saveAdminNotes = async () => {
    await supabase.from("quotations").update({ admin_notes: adminNotes }).eq("id", quotation.id);
    onUpdated({ ...quotation, admin_notes: adminNotes });
    toast.success("Internal notes saved");
  };

  const updateExpiry = async () => {
    if (!expiryDate) return;
    const { data } = await supabase
      .from("quotations")
      .update({ expires_at: expiryDate.toISOString() })
      .eq("id", quotation.id)
      .select()
      .single();
    if (data) onUpdated(data);
    toast.success("Expiry date updated");
  };

  const markExpired = async () => {
    const { data } = await supabase
      .from("quotations")
      .update({ status: "expired" })
      .eq("id", quotation.id)
      .select()
      .single();
    if (data) onUpdated(data);
    toast.success("Quotation marked as expired");
    setExpireConfirm(false);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${quotation.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("quotation-pdfs")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      return;
    }
    // Create signed URL (valid 365 days)
    const { data: urlData } = await supabase.storage
      .from("quotation-pdfs")
      .createSignedUrl(path, 365 * 24 * 60 * 60);
    if (urlData?.signedUrl) {
      const { data } = await supabase
        .from("quotations")
        .update({ pdf_url: urlData.signedUrl })
        .eq("id", quotation.id)
        .select()
        .single();
      if (data) onUpdated(data);
      toast.success("PDF uploaded successfully");
    }
  };

  const sendReminder = async () => {
    await supabase.functions.invoke("notify-quotation-reminder", {
      body: { quotation_id: quotation.id },
    });
    toast.success("Reminder email sent to partner");
  };

  return (
    <div className="space-y-5 pt-2">
      <SheetTitle className="text-lg font-bold">QT-{quotation.id.slice(0, 8)}</SheetTitle>

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={statusColors[quotation.status] || ""}>{quotation.status}</Badge>
        <span className="text-sm text-muted-foreground">
          Issued {new Date(quotation.issued_at || "").toLocaleDateString()}
          {quotation.expires_at && ` • Expires ${new Date(quotation.expires_at).toLocaleDateString()}`}
        </span>
      </div>

      {/* Partner card */}
      {partner && (
        <Card className="bg-muted">
          <CardContent className="pt-4 text-sm space-y-1">
            <p className="font-medium">{partner.company_name}</p>
            <p>{partner.contact_name} — {partner.contact_email}</p>
            <p>Discount: {partner.discount_percentage}% | Rep: {partner.assigned_rep || "—"}</p>
          </CardContent>
        </Card>
      )}

      {/* Enquiry line items */}
      {enquiry && (
        <div>
          <p className="text-sm font-medium mb-2">
            Enquiry <span className="font-mono">ENQ-{enquiry.id.slice(0, 8)}</span>
          </p>
          <div className="rounded-md border text-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">List</TableHead>
                  <TableHead className="text-right">Partner</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.qty}</TableCell>
                    <TableCell className="text-right">{formatUSD(item.listPrice)}</TableCell>
                    <TableCell className="text-right">{formatUSD(item.partnerPrice)}</TableCell>
                    <TableCell className="text-right">{formatUSD(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 border-t text-sm flex justify-between">
              <span className="text-muted-foreground">List: {formatUSD(listTotal)}</span>
              <span className="font-bold" style={{ color: "#1B3A6B" }}>Partner: {formatUSD(partnerTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* PDF Management */}
      <div>
        <p className="text-sm font-medium mb-2">Quotation PDF</p>
        {quotation.pdf_url ? (
          <div className="flex items-center gap-2">
            <a href={quotation.pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex items-center gap-1" style={{ color: "#1B3A6B" }}>
              <ExternalLink className="h-3 w-3" /> View current PDF
            </a>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Replace</Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-md p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">No PDF uploaded yet</p>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Upload PDF
            </Button>
            <p className="text-xs text-muted-foreground mt-1">The partner will be able to download this PDF once uploaded.</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
      </div>

      {/* Expiry editor */}
      <div>
        <p className="text-sm font-medium mb-2">Expiry date</p>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(!expiryDate && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 mr-1" />
                {expiryDate ? format(expiryDate, "PPP") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Button size="sm" onClick={updateExpiry} disabled={!expiryDate}>Update expiry</Button>
        </div>
      </div>

      {/* Notes (visible to partner) */}
      <div>
        <p className="text-sm font-medium mb-1">Notes <span className="text-muted-foreground font-normal">(visible to partner)</span></p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={3} />
      </div>

      {/* Admin notes (internal) */}
      <div>
        <p className="text-sm font-medium mb-1">Internal notes <span className="text-muted-foreground font-normal">(admin only)</span></p>
        <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} onBlur={saveAdminNotes} rows={3} />
      </div>

      {/* ModuSys Section */}
      <div>
        <p className="text-sm font-medium mb-2">ModuSys</p>
        <ModuSysPushSection quotation={quotation} onUpdated={onUpdated} />
      </div>

      {/* Status management */}
      {quotation.status === "pending" && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
          <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => setExpireConfirm(true)}>
            Mark as expired
          </Button>
          {issuedDaysAgo >= 3 && (
            <Button variant="outline" size="sm" onClick={sendReminder} style={{ color: "#1B3A6B", borderColor: "#1B3A6B" }}>
              <Send className="h-4 w-4 mr-1" /> Send reminder email
            </Button>
          )}
        </div>
      )}

      {/* Expire confirmation */}
      <Dialog open={expireConfirm} onOpenChange={setExpireConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as expired?</DialogTitle>
            <DialogDescription>This quotation will be marked as expired and the partner will no longer be able to accept it.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpireConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={markExpired}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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

interface LineItem {
  sku: string;
  name: string;
  qty: number;
  listPrice: number;
  partnerPrice: number;
  lineTotal: number;
  poReference?: string;
}

export default function PortalEnquiries() {
  const { partnerId, discountPercentage } = useAuth();
  const [selected, setSelected] = useState<any>(null);

  const { data: enquiries = [] } = useQuery({
    queryKey: ["portal-enquiries", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("enquiries")
        .select("*")
        .eq("partner_id", partnerId!)
        .order("submitted_at", { ascending: false });
      return data || [];
    },
    enabled: !!partnerId,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Enquiry History</h1>
      <p className="text-muted-foreground mt-1 mb-4">All your submitted enquiries.</p>

      {enquiries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No enquiries yet. Browse the catalog and submit your first enquiry.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>List Value</TableHead>
                <TableHead>Your Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((e) => {
                const items = Array.isArray(e.line_items) ? e.line_items : [];
                return (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                    <TableCell className="font-mono text-muted-foreground">{e.id.slice(0, 8)}</TableCell>
                    <TableCell>{new Date(e.submitted_at || "").toLocaleDateString()}</TableCell>
                    <TableCell>{items.length}</TableCell>
                    <TableCell>{formatUSD(Number(e.total_list_usd))}</TableCell>
                    <TableCell className="font-medium">{formatUSD(Number(e.total_partner_usd))}</TableCell>
                    <TableCell><Badge className={statusColors[e.status] || ""}>{e.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
          {selected && <EnquiryDetail enquiry={selected} discount={discountPercentage} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EnquiryDetail({ enquiry, discount }: { enquiry: any; discount: number }) {
  const items: LineItem[] = Array.isArray(enquiry.line_items) ? (enquiry.line_items as any[]) : [];
  const listTotal = Number(enquiry.total_list_usd) || 0;
  const partnerTotal = Number(enquiry.total_partner_usd) || 0;
  const saving = listTotal - partnerTotal;
  const savingPct = listTotal > 0 ? ((saving / listTotal) * 100).toFixed(1) : "0";

  // Check for PO reference
  const poRef = items.length > 0 ? (items[0] as any).poReference : undefined;

  return (
    <div className="space-y-4 pt-2">
      <SheetTitle className="text-lg font-bold">Enquiry {enquiry.id.slice(0, 8)}</SheetTitle>
      <div className="flex items-center gap-2">
        <Badge className={statusColors[enquiry.status] || ""}>{enquiry.status}</Badge>
        <span className="text-sm text-muted-foreground">{new Date(enquiry.submitted_at || "").toLocaleDateString()}</span>
      </div>

      {poRef && <p className="text-sm"><span className="font-medium">PO Reference:</span> {poRef}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Your Price</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-right">{item.qty}</TableCell>
                <TableCell className="text-right">{formatUSD(item.partnerPrice)}</TableCell>
                <TableCell className="text-right">{formatUSD(item.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>List total</span><span>{formatUSD(listTotal)}</span>
        </div>
        <div className="flex justify-between font-bold" style={{ color: "#1B3A6B" }}>
          <span>Your total</span><span>{formatUSD(partnerTotal)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>You save</span><span>{formatUSD(saving)} ({savingPct}%)</span>
        </div>
      </div>

      {enquiry.status === "quoted" && (
        <a href="/portal/quotations" className="block text-sm font-medium hover:underline" style={{ color: "#1B3A6B" }}>
          A quotation has been issued. View it →
        </a>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        Need to make changes? Contact us at{" "}
        <a href="mailto:partners@total-filtration.com" className="underline">partners@total-filtration.com</a>
      </p>
    </div>
  );
}

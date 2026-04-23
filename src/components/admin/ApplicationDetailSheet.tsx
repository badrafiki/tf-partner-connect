import { useState, useCallback } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

type Application = Tables<"applications">;

interface Props {
  application: Application | null;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
  info_requested: { label: "Info requested", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mb-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <>
      <Separator className="my-4" />
      <h3 className="text-sm font-semibold text-primary mb-3">{title}</h3>
    </>
  );
}

export function ApplicationDetailSheet({ application, onClose, onRefresh }: Props) {
  const [notes, setNotes] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Approve dialog state
  const [discount, setDiscount] = useState(0);
  const [tier, setTier] = useState("Bronze");
  const [rep, setRep] = useState("");

  // Info request
  const [infoMessage, setInfoMessage] = useState("");

  // Reject
  const [rejectReason, setRejectReason] = useState("");

  // Sync notes when app changes
  const app = application;
  useState(() => {
    if (app) setNotes(app.reviewer_notes || "");
  });

  const saveNotes = useCallback(async () => {
    if (!app) return;
    await supabase
      .from("applications")
      .update({ reviewer_notes: notes })
      .eq("id", app.id);
  }, [app, notes]);

  const handleApprove = async () => {
    if (!app) return;
    setLoading(true);

    try {
      // 1. Create partner
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .insert({
          company_name: app.legal_business_name,
          contact_name: `${app.contact_first_name} ${app.contact_last_name}`,
          contact_email: app.contact_email,
          phone: app.contact_direct_phone,
          state: app.reg_address_state,
          ein: app.ein,
          discount_percentage: discount,
          tier_label: tier,
          assigned_rep: rep || null,
          active: true,
        })
        .select("id")
        .single();

      if (partnerError || !partner) throw new Error(partnerError?.message || "Failed to create partner");

      // 2. Sync to ModuSys (non-blocking)
      let modusysSynced = false;
      try {
        const moduSysResult = await supabase.functions.invoke("create-modusys-customer", {
          body: { partner_id: partner.id },
        });
        modusysSynced = !!moduSysResult.data?.modusys_customer_id;
      } catch (e) {
        console.error("ModuSys sync failed:", e);
      }

      // 3. Call invite-partner
      const { error: inviteError } = await supabase.functions.invoke("invite-partner", {
        body: {
          email: app.contact_email,
          partner_id: partner.id,
          company_name: app.legal_business_name,
        },
      });

      if (inviteError) throw new Error(inviteError.message || "Invite failed");

      // 4. Update application status
      await supabase
        .from("applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes,
        })
        .eq("id", app.id);

      // 5. Send branded "You're approved — get your login" email (in addition
      //    to the magic-link from invite-partner). Non-blocking.
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "application-approved",
          recipientEmail: app.contact_email,
          idempotencyKey: `approved-${app.id}`,
          templateData: {
            companyName: app.legal_business_name,
            contactName: app.contact_first_name,
            tier,
            discountPercentage: discount,
            loginUrl: "https://partners.total-filtration.com/reset-password",
          },
        },
      }).catch((e) => console.error("Approval email failed:", e));

      if (modusysSynced) {
        toast.success("Partner approved. Welcome email sent. Customer record created in ModuSys.");
      } else {
        toast.success("Partner approved. Welcome email sent.");
        toast.warning("ModuSys sync failed — retry from ERP Sync page.");
      }
      setShowApproveDialog(false);
      onClose();
      onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInfoRequest = async () => {
    if (!app || !infoMessage.trim()) return;
    setLoading(true);

    try {
      const updatedNotes = (notes ? notes + "\n" : "") + `[INFO REQUEST]: ${infoMessage}`;

      await supabase
        .from("applications")
        .update({
          status: "info_requested",
          reviewed_at: new Date().toISOString(),
          reviewer_notes: updatedNotes,
        })
        .eq("id", app.id);

      supabase.functions.invoke("notify-info-request", {
        body: { application_id: app.id, message: infoMessage },
      }).catch(console.error);

      toast.success(`Information request sent to ${app.contact_email}`);
      setShowInfoDialog(false);
      setInfoMessage("");
      onClose();
      onRefresh();
    } catch {
      toast.error("Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!app) return;
    setLoading(true);

    try {
      const updatedNotes = rejectReason
        ? (notes ? notes + "\n" : "") + `[REJECTION]: ${rejectReason}`
        : notes;

      await supabase
        .from("applications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewer_notes: updatedNotes,
        })
        .eq("id", app.id);

      supabase.functions.invoke("notify-rejection", {
        body: { application_id: app.id },
      }).catch(console.error);

      toast.success("Application rejected");
      setShowRejectDialog(false);
      setRejectReason("");
      onClose();
      onRefresh();
    } catch {
      toast.error("Failed to reject application");
    } finally {
      setLoading(false);
    }
  };

  if (!app) return null;


  return (
    <>
      <Sheet open={!!application} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-xl text-primary">{app.legal_business_name}</SheetTitle>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className={STATUS_CONFIG[app.status]?.className ?? ""}>
                {STATUS_CONFIG[app.status]?.label ?? app.status}
              </Badge>
              {app.submitted_at && (
                <span className="text-xs text-muted-foreground">
                  Submitted {format(new Date(app.submitted_at), "PPp")}
                </span>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* S1 — Business */}
            <h3 className="text-sm font-semibold text-primary mb-3">Business Information</h3>
            <div className="grid grid-cols-2 gap-x-4">
              <ReadOnlyField label="Legal Business Name" value={app.legal_business_name} />
              <ReadOnlyField label="Trading Name" value={app.trading_name} />
              <ReadOnlyField label="Date Established" value={app.date_established} />
              <ReadOnlyField label="EIN" value={app.ein} />
              <ReadOnlyField label="Business Type" value={app.business_type} />
              <ReadOnlyField label="Years in Business" value={app.years_in_business} />
            </div>
            <ReadOnlyField label="Registration Address" value={[app.reg_address_street, app.reg_address_city, app.reg_address_state, app.reg_address_zip].filter(Boolean).join(", ") || null} />
            <ReadOnlyField label="Primary Address" value={[app.primary_address_street, app.primary_address_city, app.primary_address_state, app.primary_address_zip].filter(Boolean).join(", ") || "Same as registration"} />
            <div className="grid grid-cols-2 gap-x-4">
              <ReadOnlyField label="Website" value={app.website} />
              <ReadOnlyField label="Primary Phone" value={app.primary_phone} />
              <ReadOnlyField label="General Email" value={app.general_email} />
            </div>

            {/* S2 — Contact */}
            <SectionHeader title="Primary Contact" />
            <div className="grid grid-cols-2 gap-x-4">
              <ReadOnlyField label="Name" value={`${app.contact_first_name} ${app.contact_last_name}`} />
              <ReadOnlyField label="Title" value={app.contact_title} />
              <ReadOnlyField label="Department" value={app.contact_department} />
              <ReadOnlyField label="Direct Phone" value={app.contact_direct_phone} />
              <ReadOnlyField label="Mobile" value={app.contact_mobile} />
              <ReadOnlyField label="Email" value={app.contact_email} />
            </div>

            {/* S3 — AP */}
            <SectionHeader title="Accounts Payable Contact" />
            {app.ap_same_as_primary ? (
              <p className="text-sm text-muted-foreground">Same as primary contact</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4">
                <ReadOnlyField label="Name" value={[app.ap_first_name, app.ap_last_name].filter(Boolean).join(" ") || null} />
                <ReadOnlyField label="Title" value={app.ap_title} />
                <ReadOnlyField label="Phone" value={app.ap_phone} />
                <ReadOnlyField label="Email" value={app.ap_email} />
              </div>
            )}

            {/* S4 — Shipping */}
            <SectionHeader title="Shipping & Delivery" />
            {app.ship_same_as_business ? (
              <p className="text-sm text-muted-foreground mb-2">Same as business address</p>
            ) : (
              <ReadOnlyField label="Ship-To Address" value={[app.ship_address_street, app.ship_address_city, app.ship_address_state, app.ship_address_zip].filter(Boolean).join(", ") || null} />
            )}
            <div className="grid grid-cols-2 gap-x-4">
              <ReadOnlyField label="Additional Locations" value={app.ship_additional_locations ? "Yes" : "No"} />
              <ReadOnlyField label="Preferred Method" value={app.ship_preferred_method} />
              <ReadOnlyField label="Carrier" value={app.ship_carrier_name} />
              <ReadOnlyField label="Carrier Account" value={app.ship_carrier_account} />
            </div>
            <ReadOnlyField label="Special Instructions" value={app.ship_special_instructions} />

            {/* S5 — Credit */}
            <SectionHeader title="Credit & Payment" />
            <div className="grid grid-cols-2 gap-x-4">
              <ReadOnlyField label="Credit Limit" value={app.requested_credit_limit} />
              <ReadOnlyField label="Payment Terms" value={app.requested_payment_terms} />
              <ReadOnlyField label="Payment Method" value={app.preferred_payment_method} />
              <ReadOnlyField label="Annual Volume" value={app.annual_volume_estimate} />
            </div>

            {/* S6 — Tax */}
            <SectionHeader title="Tax & Compliance" />
            <div className="grid grid-cols-2 gap-x-4">
              <ReadOnlyField label="Tax Status" value={app.tax_exempt ? "Tax Exempt" : "Taxable"} />
              <ReadOnlyField label="Resale Certificate" value={app.resale_certificate_status} />
              <ReadOnlyField label="Resale States" value={app.resale_states} />
            </div>

            {/* S7 — Distribution */}
            <SectionHeader title="Distribution Profile" />
            <div className="grid grid-cols-2 gap-x-4">
              <ReadOnlyField label="Geographic Coverage" value={app.geographic_coverage} />
              <ReadOnlyField label="Sales Channels" value={app.sales_channels} />
              <ReadOnlyField label="Monthly Order Frequency" value={app.monthly_order_frequency} />
              <ReadOnlyField label="How Heard" value={app.how_heard} />
            </div>
            <ReadOnlyField label="Industries / Markets Served" value={app.industries_served} />
          </div>

          {/* Sticky action panel */}
          <div className="border-t bg-card px-6 py-4 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Internal notes (not visible to applicant)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Add notes about this application..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowApproveDialog(true)} className="flex-1">
                Approve & Invite
              </Button>
              <Button variant="outline" onClick={() => setShowInfoDialog(true)} className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50">
                Request Info
              </Button>
              <Button variant="outline" onClick={() => setShowRejectDialog(true)} className="flex-1 border-red-300 text-red-700 hover:bg-red-50">
                Reject
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve and invite {app.contact_first_name} {app.contact_last_name}?</DialogTitle>
            <DialogDescription>
              This will create a partner account for {app.legal_business_name} and send an invitation email to {app.contact_email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount percentage</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Bronze", "Silver", "Gold", "Platinum", "Diamond"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Assigned rep (optional)</Label>
              <Input value={rep} onChange={(e) => setRep(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm & Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Request Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request additional information</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>Message to applicant</Label>
            <Textarea
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="Please describe what additional information you need..."
              rows={4}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInfoDialog(false)}>Cancel</Button>
            <Button onClick={handleInfoRequest} disabled={loading || !infoMessage.trim()} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this application?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Reason (optional — not sent to applicant, internal only)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

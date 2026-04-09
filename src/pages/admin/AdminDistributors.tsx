import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Plus, Pencil, ToggleLeft, ToggleRight, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { US_STATES } from "@/lib/us-states";
import type { Tables } from "@/integrations/supabase/types";

type Partner = Tables<"partners">;

const TIER_OPTIONS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
const formatUSD = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ───── Add / Edit Form ───── */
function PartnerForm({
  initial,
  onSave,
  saving,
}: {
  initial: Partial<Partner>;
  onSave: (data: Partial<Partner>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Partner>>({ ...initial });
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label>Company Name *</Label>
        <Input value={form.company_name || ""} onChange={e => set("company_name", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Contact Name</Label><Input value={form.contact_name || ""} onChange={e => set("contact_name", e.target.value)} /></div>
        <div><Label>Contact Email</Label><Input type="email" value={form.contact_email || ""} onChange={e => set("contact_email", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Phone</Label><Input type="tel" value={form.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
        <div>
          <Label>State</Label>
          <Select value={form.state || ""} onValueChange={v => set("state", v)}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>EIN</Label><Input value={form.ein || ""} onChange={e => set("ein", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Discount %</Label>
          <Input type="number" min={0} max={100} step={0.5} value={form.discount_percentage ?? 0} onChange={e => set("discount_percentage", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label>Tier</Label>
          <Select value={form.tier_label || "Bronze"} onValueChange={v => set("tier_label", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIER_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Assigned Rep</Label><Input value={form.assigned_rep || ""} onChange={e => set("assigned_rep", e.target.value)} /></div>
      <div className="flex items-center gap-2">
        <Switch checked={form.active ?? false} onCheckedChange={v => set("active", v)} />
        <Label>Active</Label>
      </div>
      <Button className="w-full" disabled={saving || !form.company_name} onClick={() => onSave(form)}>
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}

/* ───── Detail Sheet ───── */
function DistributorDetailSheet({
  partner,
  open,
  onClose,
  onPartnerUpdated,
}: {
  partner: Partner | null;
  open: boolean;
  onClose: () => void;
  onPartnerUpdated?: (p: Partner) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch enquiry stats
  const { data: enquiries } = useQuery({
    queryKey: ["admin-partner-enquiries", partner?.id],
    enabled: !!partner?.id && open,
    queryFn: async () => {
      const { data } = await supabase.from("enquiries").select("*").eq("partner_id", partner!.id).order("submitted_at", { ascending: false });
      return data || [];
    },
  });

  const totalValue = enquiries?.reduce((s, e) => s + (Number(e.total_partner_usd) || 0), 0) ?? 0;
  const recentEnquiries = enquiries?.slice(0, 3) ?? [];

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Partner>) => {
      const { data: updated, error } = await supabase.from("partners").update(data as any).eq("id", partner!.id).select().single();
      if (error) throw error;
      return updated as Partner;
    },
    onSuccess: (updated) => {
      toast.success("Partner updated");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-partner-enquiries", partner?.id] });
      onPartnerUpdated?.(updated);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleResetPassword = async () => {
    if (!partner?.user_id) return;
    try {
      const { data, error } = await supabase.functions.invoke("invite-partner", {
        body: { email: partner.contact_email, partner_id: partner.id, company_name: partner.company_name },
      });
      if (error) throw error;
      toast.success("Recovery link generated — the partner will receive an email to reset their password.");
      setResetLink(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate reset link");
    }
  };

  const handleResendInvite = async () => {
    if (!partner) return;
    try {
      const { error } = await supabase.functions.invoke("invite-partner", {
        body: { email: partner.contact_email, partner_id: partner.id, company_name: partner.company_name },
      });
      if (error) throw error;
      toast.success(`Invite resent to ${partner.contact_email}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to resend invite");
    }
  };

  if (!partner) return null;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { setEditing(false); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{partner.company_name}</span>
            {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>}
          </SheetTitle>
        </SheetHeader>

        {editing ? (
          <PartnerForm
            initial={partner}
            onSave={data => updateMutation.mutate(data)}
            saving={updateMutation.isPending}
          />
        ) : (
          <div className="space-y-5 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={partner.company_logo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(partner.company_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{partner.company_name}</p>
                <Badge variant="secondary">{partner.tier_label}</Badge>
                <Badge className="ml-1" variant={partner.active ? "default" : "outline"}>
                  {partner.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Contact</p><p className="font-medium">{partner.contact_name}</p></div>
              <div><p className="text-muted-foreground">Email</p><p className="font-medium">{partner.contact_email}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{partner.phone || "—"}</p></div>
              <div><p className="text-muted-foreground">State</p><p className="font-medium">{partner.state || "—"}</p></div>
              <div><p className="text-muted-foreground">EIN</p><p className="font-medium">{partner.ein || "—"}</p></div>
              <div><p className="text-muted-foreground">Rep</p><p className="font-medium">{partner.assigned_rep || "—"}</p></div>
              <div><p className="text-muted-foreground">Discount</p><p className="font-medium text-green-600">{partner.discount_percentage}%</p></div>
              <div><p className="text-muted-foreground">Account linked</p><p className="font-medium">{partner.user_id ? "Yes" : "No"}</p></div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-semibold mb-2">Enquiry Stats</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted rounded-md p-3">
                  <p className="text-muted-foreground">Total Enquiries</p>
                  <p className="text-lg font-bold">{enquiries?.length ?? 0}</p>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <p className="text-muted-foreground">Total Value</p>
                  <p className="text-lg font-bold">{formatUSD(totalValue)}</p>
                </div>
              </div>
            </div>

            {recentEnquiries.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Recent Enquiries</p>
                <div className="space-y-2">
                  {recentEnquiries.map(e => (
                    <div key={e.id} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
                      <div>
                        <p className="font-medium">{new Date(e.submitted_at!).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">{(e.line_items as any[]).length} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatUSD(Number(e.total_partner_usd) || 0)}</p>
                        <Badge variant="secondary" className="text-xs">{e.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              {partner.user_id && (
                <Button variant="outline" className="w-full" onClick={handleResetPassword}>
                  Reset Password
                </Button>
              )}
              {!partner.user_id && (
                <Button variant="outline" className="w-full" onClick={handleResendInvite}>
                  Resend Invite
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ───── Add Sheet ───── */
function AddDistributorSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [sendInvite, setSendInvite] = useState(true);
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (data: Partial<Partner>) => {
      const { data: inserted, error } = await supabase.from("partners").insert({
        company_name: data.company_name!,
        contact_name: data.contact_name || "",
        contact_email: data.contact_email || "",
        phone: data.phone || null,
        state: data.state || null,
        ein: data.ein || null,
        discount_percentage: data.discount_percentage ?? 0,
        tier_label: data.tier_label || "Bronze",
        assigned_rep: data.assigned_rep || null,
        active: data.active ?? false,
      }).select().single();
      if (error) throw error;

      if (sendInvite && data.contact_email) {
        const { error: invErr } = await supabase.functions.invoke("invite-partner", {
          body: { email: data.contact_email, partner_id: inserted.id, company_name: data.company_name },
        });
        if (invErr) console.error("Invite error:", invErr);
      }

      return { inserted, invited: sendInvite && !!data.contact_email };
    },
    onSuccess: (result) => {
      toast.success(`${result.inserted.company_name} added${result.invited ? ` — invite sent to ${result.inserted.contact_email}` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Distributor</SheetTitle>
        </SheetHeader>
        <div className="py-2">
          <div className="flex items-center gap-2 mb-4">
            <Checkbox id="sendInvite" checked={sendInvite} onCheckedChange={v => setSendInvite(!!v)} />
            <Label htmlFor="sendInvite">Send invite immediately</Label>
          </div>
          <PartnerForm
            initial={{ active: false, tier_label: "Bronze", discount_percentage: 0 }}
            onSave={data => addMutation.mutate(data)}
            saving={addMutation.isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ───── Main Page ───── */
export default function AdminDistributors() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<Partner | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("company_name");
      if (error) throw error;
      return data as Partner[];
    },
  });

  const filtered = useMemo(() => {
    let list = partners;
    if (statusFilter === "active") list = list.filter(p => p.active);
    if (statusFilter === "inactive") list = list.filter(p => !p.active);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.company_name.toLowerCase().includes(s) || p.contact_email.toLowerCase().includes(s));
    }
    return list;
  }, [partners, statusFilter, search]);

  const toggleActive = useMutation({
    mutationFn: async (p: Partner) => {
      const { error } = await supabase.from("partners").update({ active: !p.active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      toast.success("Status updated");
    },
  });

  const statusFilters = [
    { value: "all" as const, label: "All" },
    { value: "active" as const, label: "Active" },
    { value: "inactive" as const, label: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Distributors</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage partner distributor accounts.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Distributor</Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search company or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {statusFilters.map(f => (
            <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold">No distributors yet</h2>
          <p className="text-muted-foreground mt-1">Approve an application or add one manually.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={p.company_logo_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(p.company_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{p.company_name}</p>
                        <p className="text-xs text-muted-foreground">{p.contact_name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.contact_email}</TableCell>
                  <TableCell className="text-sm">{p.state || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">{p.discount_percentage}%</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{p.tier_label}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.assigned_rep || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "default" : "outline"} className={p.active ? "bg-green-100 text-green-800 border-green-200" : ""}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive.mutate(p)}>
                        {p.active ? <ToggleRight className="h-3.5 w-3.5 text-green-600" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DistributorDetailSheet partner={selected} open={!!selected} onClose={() => setSelected(null)} />
      <AddDistributorSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

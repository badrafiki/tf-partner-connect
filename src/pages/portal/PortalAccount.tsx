import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Mail, Phone, Globe, Shield, Building2, User } from "lucide-react";
import { toast } from "sonner";

const tierColors: Record<string, { bg: string; text: string }> = {
  Bronze: { bg: "#CD7F32", text: "#FFFFFF" },
  Silver: { bg: "#C0C0C0", text: "#1B3A6B" },
  Gold: { bg: "#FFD700", text: "#1B3A6B" },
  Platinum: { bg: "#E5E4E2", text: "#1B3A6B" },
  Diamond: { bg: "#B9F2FF", text: "#1B3A6B" },
};

export default function PortalAccount() {
  const { user, partnerId, companyName, contactName, tierLabel, discountPercentage, assignedRep } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ contact_name: "", contact_email: "", phone: "" });

  const { data: partner } = useQuery({
    queryKey: ["partner-detail", partnerId],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("*").eq("id", partnerId!).single();
      return data;
    },
    enabled: !!partnerId,
  });

  // Fetch application for compliance docs
  const { data: application } = useQuery({
    queryKey: ["partner-application", partner?.contact_email],
    queryFn: async () => {
      if (!partner?.contact_email) return null;
      const { data } = await supabase
        .from("applications")
        .select("tax_exempt, resale_certificate_status")
        .eq("contact_email", partner.contact_email)
        .maybeSingle();
      return data;
    },
    enabled: !!partner?.contact_email,
  });

  const startEdit = () => {
    if (!partner) return;
    setForm({
      contact_name: partner.contact_name || "",
      contact_email: partner.contact_email || "",
      phone: partner.phone || "",
    });
    setEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!form.contact_email || !/\S+@\S+\.\S+/.test(form.contact_email)) {
        throw new Error("Please enter a valid email address");
      }
      const { data, error } = await supabase
        .from("partners")
        .update({
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          phone: form.phone,
        })
        .eq("id", partnerId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["partner-detail", partnerId], data);
      queryClient.invalidateQueries({ queryKey: ["partner-detail"] });
      toast.success("Contact details updated");
      setEditing(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`A password reset link has been sent to ${user.email}. Check your inbox.`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const tier = tierLabel || "Bronze";
  const tc = tierColors[tier] || tierColors.Bronze;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                {partner?.company_logo_url ? (
                  <img src={partner.company_logo_url} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                    {(companyName || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-foreground">{companyName}</h2>
                  {partner?.ein && <p className="text-sm text-muted-foreground">EIN: {partner.ein}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {partner?.state && <div><span className="text-muted-foreground">State:</span> {partner.state}</div>}
                {partner?.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {partner.phone}</div>}
                {partner?.contact_email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {partner.contact_email}</div>}
              </div>
              <p className="text-xs text-muted-foreground pt-2">To update your company details, contact <a href="mailto:partners@total-filtration.com" className="underline">partners@total-filtration.com</a></p>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Your Contact Details</CardTitle>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={startEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
              )}
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label>Contact name</Label>
                    <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>Save changes</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {partner?.contact_name || "—"}</p>
                  <p><span className="text-muted-foreground">Email:</span> {partner?.contact_email || "—"}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {partner?.phone || "—"}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents on File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded">
                Please ensure your W-9 and any applicable resale certificates are on file with TF USA. Email documents to <a href="mailto:partners@total-filtration.com" className="underline font-medium">partners@total-filtration.com</a> with your company name in the subject line.
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={application?.tax_exempt != null ? "text-green-600" : "text-muted-foreground"}>
                    {application?.tax_exempt != null ? "✓" : "—"}
                  </span>
                  <span>W-9 / Tax information</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={application?.resale_certificate_status ? "text-green-600" : "text-muted-foreground"}>
                    {application?.resale_certificate_status ? "✓" : "—"}
                  </span>
                  <span>Resale Certificate {application?.resale_certificate_status && `(${application.resale_certificate_status})`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">—</span>
                  <span>Business License</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">For document queries, contact <a href="mailto:partners@total-filtration.com" className="underline">partners@total-filtration.com</a></p>
            </CardContent>
          </Card>

          {/* Password & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Password & Security</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handlePasswordReset}>Change password</Button>
            </CardContent>
          </Card>
        </div>

        {/* Right panel - Account Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Your Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tier</p>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: tc.bg, color: tc.text }}>
                  {tier} Partner
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Discount</p>
                <p className="font-semibold">{discountPercentage}% off all list prices</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigned Rep</p>
                {assignedRep ? (
                  <div>
                    <p className="font-medium">{assignedRep}</p>
                    <a href="mailto:partners@total-filtration.com" className="text-sm hover:underline" style={{ color: "#1B3A6B" }}>partners@total-filtration.com</a>
                  </div>
                ) : (
                  <p className="text-sm">Contact <a href="mailto:partners@total-filtration.com" className="underline" style={{ color: "#1B3A6B" }}>partners@total-filtration.com</a></p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Member since</p>
                <p className="text-sm">
                  {partner?.created_at
                    ? new Date(partner.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

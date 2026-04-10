import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import tfLogoImport from "@/assets/tf-usa-logo.svg";
import { CheckCircle, Loader2, Info } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { applicationSchema, type ApplicationFormValues } from "@/lib/application-schema";
import { US_STATES, CA_PROVINCES } from "@/lib/us-states";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ---------- constants ----------
const SECTION_TITLES = [
  "Business Information",
  "Primary Contact",
  "Accounts Payable Contact",
  "Shipping & Delivery",
  "Credit & Payment",
  "Tax & Compliance",
  "Distribution Profile",
];

const SHIPPING_METHODS = ["Ground", "2-Day Air", "Next Day Air", "LTL Freight", "Customer carrier"];
const GEO_OPTIONS = ["Local–Metro", "Regional", "National", "International"];
const CHANNEL_OPTIONS = ["Wholesale–Distribution", "Retail", "E-Commerce", "Industrial–B2B", "Government", "Other"];

// ---------- helpers ----------
function RequiredMark() {
  return <span className="text-accent ml-0.5">*</span>;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-blue-50 border-0 border-l-[3px] border-l-blue-400 p-3 text-sm text-blue-800 mb-4">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function SectionCard({ index, title, children, id }: { index: number; title: string; children: React.ReactNode; id: string }) {
  return (
    <section id={id} className="bg-card rounded-lg border-l-4 border-l-primary border border-border p-7 md:p-8 mb-6 scroll-mt-28 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <p className="text-xs font-medium text-accent uppercase tracking-[0.06em] mb-1">Section {index + 1}</p>
      <h2 className="text-lg font-semibold text-primary mb-6">{title}</h2>
      {children}
    </section>
  );
}

function FieldRow({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const grid = cols === 1 ? "grid-cols-1" : cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2";
  return <div className={`grid ${grid} gap-4 mb-4`}>{children}</div>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

function StateSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select state / province" /></SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">United States</div>
        {US_STATES.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1 border-t border-border pt-2">Canada</div>
        {CA_PROVINCES.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------- checkbox group helper ----------
function useCheckboxGroup(initial = "") {
  const [selected, setSelected] = useState<string[]>(() => initial ? initial.split(", ") : []);
  const toggle = (v: string) => setSelected((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  return { selected, toggle, value: selected.join(", ") };
}

// ---------- main ----------
export default function ApplicationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmailDisplay, setContactEmailDisplay] = useState("");
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const shippingMethods = useCheckboxGroup();
  const geoOptions = useCheckboxGroup();
  const channelOptions = useCheckboxGroup();

  const {
    register, handleSubmit, control, watch, setValue, formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    mode: "onBlur",
    defaultValues: {
      primary_same_as_reg: false,
      ap_same_as_primary: false,
      ship_same_as_business: false,
      ship_additional_locations: false,
      tax_exempt: false,
    },
  });

  const primarySame = watch("primary_same_as_reg");
  const apSame = watch("ap_same_as_primary");
  const shipSame = watch("ship_same_as_business");

  // sync checkbox group values to form
  useEffect(() => { setValue("ship_preferred_method", shippingMethods.value); }, [shippingMethods.value, setValue]);
  useEffect(() => { setValue("geographic_coverage", geoOptions.value); }, [geoOptions.value, setValue]);
  useEffect(() => { setValue("sales_channels", channelOptions.value); }, [channelOptions.value, setValue]);

  // ---------- section completion ----------
  const watchAll = watch();
  const sectionComplete = SECTION_TITLES.map((_, i) => {
    switch (i) {
      case 0: return !!watchAll.legal_business_name;
      case 1: return !!watchAll.contact_first_name && !!watchAll.contact_last_name && !!watchAll.contact_email;
      case 2: return watchAll.ap_same_as_primary || (!!watchAll.ap_first_name && !!watchAll.ap_last_name);
      case 3: return watchAll.ship_same_as_business || !!watchAll.ship_address_street;
      case 4: return !!watchAll.requested_credit_limit || !!watchAll.requested_payment_terms;
      case 5: return watchAll.tax_exempt !== undefined;
      case 6: return !!watchAll.geographic_coverage || !!watchAll.how_heard;
      default: return false;
    }
  });

  // ---------- active section tracking ----------
  const [activeSection, setActiveSection] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = sectionRefs.current.indexOf(entry.target as HTMLElement);
            if (idx >= 0) setActiveSection(idx);
          }
        });
      },
      { rootMargin: "-120px 0px -60% 0px" }
    );
    sectionRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, []);

  // ---------- submit ----------
  const onSubmit = async (data: ApplicationFormValues) => {
    setSubmitting(true);
    setSubmitError("");

    // Copy address fields if "same as" checked
    const payload: Record<string, unknown> = { ...data };
    if (data.primary_same_as_reg) {
      payload.primary_address_street = data.reg_address_street;
      payload.primary_address_city = data.reg_address_city;
      payload.primary_address_state = data.reg_address_state;
      payload.primary_address_zip = data.reg_address_zip;
    }
    if (data.ship_same_as_business) {
      payload.ship_address_street = data.primary_same_as_reg ? data.reg_address_street : data.primary_address_street;
      payload.ship_address_city = data.primary_same_as_reg ? data.reg_address_city : data.primary_address_city;
      payload.ship_address_state = data.primary_same_as_reg ? data.reg_address_state : data.primary_address_state;
      payload.ship_address_zip = data.primary_same_as_reg ? data.reg_address_zip : data.primary_address_zip;
    }

    // Remove UI-only field
    delete payload.primary_same_as_reg;

    // Convert empty strings to null
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });

    const { data: inserted, error } = await supabase
      .from("applications")
      .insert(payload as any)
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("Insert error:", error);
      setSubmitError("Something went wrong. Please try again or email us at partners@total-filtration.com");
      setSubmitting(false);
      return;
    }

    // Fire and forget notification
    supabase.functions.invoke("notify-new-application", {
      body: { application_id: inserted.id },
    }).catch((err) => console.error("Notification error:", err));

    setContactName(data.contact_first_name);
    setContactEmailDisplay(data.contact_email);
    setSubmitted(true);
    setSubmitting(false);
  };

  const onError = () => {
    // Scroll to first error
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      const el = document.querySelector(`[name="${firstErrorKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // ---------- success state ----------
  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-primary">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
            <img src={tfLogoImport} alt="TF USA" className="h-8 brightness-0 invert" />
            <Link to="/login" className="text-sm text-white/80 hover:text-white hover:underline">Sign in →</Link>
          </div>
        </header>
        <div className="flex items-center justify-center px-4 py-24">
          <div className="text-center max-w-md">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-3">Application received</h2>
            <p className="text-muted-foreground mb-6">
              Thank you, {contactName}. We've received your application and our team will review it within 3–5 business days. You'll hear from us at {contactEmailDisplay}.
            </p>
            <a href="https://total-filtration.com" className="text-primary font-medium hover:underline">
              Return to total-filtration.com →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-[60px]">
          <img src={tfLogoImport} alt="TF USA" className="h-8 brightness-0 invert" />
          <Link to="/login" className="text-sm text-white/80 hover:text-white">Already a partner? Sign in →</Link>
        </div>
      </header>

      {/* Sticky progress */}
      <div className="sticky top-[60px] z-40 bg-primary/95 backdrop-blur border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {SECTION_TITLES.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const el = document.getElementById(`section-${i}`);
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${sectionComplete[i]
                  ? "bg-primary text-white border border-white/20"
                  : activeSection === i
                    ? "bg-white text-primary border border-white"
                    : "bg-white/10 text-white/60"
                }
              `}
            >
              <span className="font-bold">S{i + 1}</span>
              <span className="hidden sm:inline">{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-4">
        <p className="text-xs font-medium text-accent uppercase tracking-[0.08em] mb-2">Distributor Application</p>
        <h1 className="text-2xl md:text-[32px] font-semibold text-primary leading-tight mb-3">
          Apply to become a TF USA distribution partner
        </h1>
        <p className="text-muted-foreground text-base mb-5">
          Open to US and Canadian distribution partners. Complete the form below — our team reviews all applications within 3–5 business days.
        </p>
        <InfoBox>
          All information is kept strictly confidential and used solely for account setup and credit assessment.
        </InfoBox>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="max-w-3xl mx-auto px-4 mb-4">
          <div className="bg-destructive/10 border border-destructive text-destructive rounded-md p-3 text-sm">{submitError}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit, onError)} className="max-w-3xl mx-auto px-4 pb-16">

        {/* S1 — Business Information */}
        <SectionCard index={0} title="Business Information" id="section-0">
          <div ref={(el) => { sectionRefs.current[0] = el?.parentElement ?? null; }} />
          <FieldRow>
            <div>
              <Label>Legal Business Name <RequiredMark /></Label>
              <Input {...register("legal_business_name")} />
              <FieldError message={errors.legal_business_name?.message} />
            </div>
            <div>
              <Label>Trading / DBA Name</Label>
              <Input {...register("trading_name")} />
            </div>
          </FieldRow>
          <FieldRow cols={3}>
            <div>
              <Label>Date Business Established</Label>
              <Input {...register("date_established")} placeholder="e.g. 2005" />
            </div>
            <div>
              <Label>Tax ID — EIN (US) or Business Number (Canada)</Label>
              <Input {...register("ein")} placeholder="e.g. 12-3456789 or 123456789" />
            </div>
            <div>
              <Label>Years in Business</Label>
              <Input {...register("years_in_business")} />
            </div>
          </FieldRow>

          <div className="mb-4">
            <Label className="mb-2 block">Business Type</Label>
            <Controller
              control={control}
              name="business_type"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-4">
                  {["Corporation", "LLC", "Partnership", "Sole Proprietor", "Other"].map((bt) => (
                    <div key={bt} className="flex items-center gap-1.5">
                      <RadioGroupItem value={bt} id={`bt-${bt}`} />
                      <Label htmlFor={`bt-${bt}`} className="font-normal cursor-pointer">{bt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          </div>

          <p className="text-sm font-medium text-foreground mb-2 mt-6">Registration Address</p>
          <FieldRow>
            <div>
              <Label>Street</Label>
              <Input {...register("reg_address_street")} />
            </div>
            <div>
              <Label>City</Label>
              <Input {...register("reg_address_city")} />
            </div>
          </FieldRow>
          <FieldRow>
            <div>
              <Label>State</Label>
              <Controller control={control} name="reg_address_state" render={({ field }) => <StateSelect value={field.value || ""} onChange={field.onChange} />} />
            </div>
            <div>
              <Label>ZIP / Postal Code</Label>
              <Input {...register("reg_address_zip")} placeholder="e.g. 34787 or M5V 3A8" />
            </div>
          </FieldRow>

          <div className="flex items-center gap-2 mb-4 mt-4">
            <Controller
              control={control}
              name="primary_same_as_reg"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="primary-same" />
              )}
            />
            <Label htmlFor="primary-same" className="font-normal cursor-pointer">Primary business address same as above</Label>
          </div>

          {!primarySame && (
            <>
              <p className="text-sm font-medium text-foreground mb-2">Primary Business Address</p>
              <FieldRow>
                <div>
                  <Label>Street</Label>
                  <Input {...register("primary_address_street")} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input {...register("primary_address_city")} />
                </div>
              </FieldRow>
              <FieldRow>
                <div>
                  <Label>State</Label>
                  <Controller control={control} name="primary_address_state" render={({ field }) => <StateSelect value={field.value || ""} onChange={field.onChange} />} />
                </div>
                <div>
              <Label>ZIP / Postal Code</Label>
              <Input {...register("primary_address_zip")} placeholder="e.g. 34787 or M5V 3A8" />
                </div>
              </FieldRow>
            </>
          )}

          <FieldRow>
            <div>
              <Label>Website</Label>
              <Input {...register("website")} type="url" placeholder="https://" />
            </div>
            <div>
              <Label>Primary Phone</Label>
              <Input {...register("primary_phone")} type="tel" />
            </div>
          </FieldRow>
          <FieldRow cols={1}>
            <div>
              <Label>General Email</Label>
              <Input {...register("general_email")} type="email" />
              <FieldError message={errors.general_email?.message} />
            </div>
          </FieldRow>
        </SectionCard>

        {/* S2 — Primary Contact */}
        <SectionCard index={1} title="Primary Contact" id="section-1">
          <div ref={(el) => { sectionRefs.current[1] = el?.parentElement ?? null; }} />
          <FieldRow>
            <div>
              <Label>First Name <RequiredMark /></Label>
              <Input {...register("contact_first_name")} />
              <FieldError message={errors.contact_first_name?.message} />
            </div>
            <div>
              <Label>Last Name <RequiredMark /></Label>
              <Input {...register("contact_last_name")} />
              <FieldError message={errors.contact_last_name?.message} />
            </div>
          </FieldRow>
          <FieldRow>
            <div>
              <Label>Title / Position</Label>
              <Input {...register("contact_title")} />
            </div>
            <div>
              <Label>Department</Label>
              <Input {...register("contact_department")} />
            </div>
          </FieldRow>
          <FieldRow>
            <div>
              <Label>Direct Phone</Label>
              <Input {...register("contact_direct_phone")} type="tel" />
            </div>
            <div>
              <Label>Mobile</Label>
              <Input {...register("contact_mobile")} type="tel" />
            </div>
          </FieldRow>
          <FieldRow cols={1}>
            <div>
              <Label>Email Address <RequiredMark /></Label>
              <Input {...register("contact_email")} type="email" />
              <FieldError message={errors.contact_email?.message} />
            </div>
          </FieldRow>
        </SectionCard>

        {/* S3 — Accounts Payable */}
        <SectionCard index={2} title="Accounts Payable Contact" id="section-2">
          <div ref={(el) => { sectionRefs.current[2] = el?.parentElement ?? null; }} />
          <div className="flex items-center gap-2 mb-4">
            <Controller
              control={control}
              name="ap_same_as_primary"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="ap-same" />
              )}
            />
            <Label htmlFor="ap-same" className="font-normal cursor-pointer">Same as Primary Contact</Label>
          </div>
          {!apSame && (
            <>
              <FieldRow>
                <div>
                  <Label>First Name</Label>
                  <Input {...register("ap_first_name")} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input {...register("ap_last_name")} />
                </div>
              </FieldRow>
              <FieldRow>
                <div>
                  <Label>Title / Position</Label>
                  <Input {...register("ap_title")} />
                </div>
                <div>
                  <Label>Direct Phone</Label>
                  <Input {...register("ap_phone")} type="tel" />
                </div>
              </FieldRow>
              <FieldRow cols={1}>
                <div>
                  <Label>Email Address</Label>
                  <Input {...register("ap_email")} type="email" />
                  <FieldError message={errors.ap_email?.message} />
                </div>
              </FieldRow>
            </>
          )}
        </SectionCard>

        {/* S4 — Shipping */}
        <SectionCard index={3} title="Shipping & Delivery" id="section-3">
          <div ref={(el) => { sectionRefs.current[3] = el?.parentElement ?? null; }} />
          <div className="flex items-center gap-2 mb-4">
            <Controller
              control={control}
              name="ship_same_as_business"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="ship-same" />
              )}
            />
            <Label htmlFor="ship-same" className="font-normal cursor-pointer">Ship-to address same as business address</Label>
          </div>
          {!shipSame && (
            <>
              <FieldRow>
                <div>
                  <Label>Street</Label>
                  <Input {...register("ship_address_street")} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input {...register("ship_address_city")} />
                </div>
              </FieldRow>
              <FieldRow>
                <div>
                  <Label>State</Label>
                  <Controller control={control} name="ship_address_state" render={({ field }) => <StateSelect value={field.value || ""} onChange={field.onChange} />} />
                </div>
                <div>
              <Label>ZIP / Postal Code</Label>
              <Input {...register("ship_address_zip")} placeholder="e.g. 34787 or M5V 3A8" />
                </div>
              </FieldRow>
            </>
          )}

          <div className="mb-4">
            <Label className="mb-2 block">Additional ship-to locations?</Label>
            <Controller
              control={control}
              name="ship_additional_locations"
              render={({ field }) => (
                <RadioGroup value={field.value ? "yes" : "no"} onValueChange={(v) => field.onChange(v === "yes")} className="flex gap-4">
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="add-loc-y" /><Label htmlFor="add-loc-y" className="font-normal cursor-pointer">Yes</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="add-loc-n" /><Label htmlFor="add-loc-n" className="font-normal cursor-pointer">No</Label></div>
                </RadioGroup>
              )}
            />
          </div>

          <div className="mb-4">
            <Label className="mb-2 block">Preferred shipping method</Label>
            <div className="flex flex-wrap gap-3">
              {SHIPPING_METHODS.map((m) => (
                <div key={m} className="flex items-center gap-1.5">
                  <Checkbox checked={shippingMethods.selected.includes(m)} onCheckedChange={() => shippingMethods.toggle(m)} id={`ship-${m}`} />
                  <Label htmlFor={`ship-${m}`} className="font-normal cursor-pointer">{m}</Label>
                </div>
              ))}
            </div>
          </div>

          <FieldRow>
            <div>
              <Label>Carrier Name (if own carrier)</Label>
              <Input {...register("ship_carrier_name")} />
            </div>
            <div>
              <Label>Carrier Account #</Label>
              <Input {...register("ship_carrier_account")} />
            </div>
          </FieldRow>
          <FieldRow cols={1}>
            <div>
              <Label>Special delivery instructions</Label>
              <Textarea {...register("ship_special_instructions")} rows={3} />
            </div>
          </FieldRow>
        </SectionCard>

        {/* S5 — Credit & Payment */}
        <SectionCard index={4} title="Credit & Payment" id="section-4">
          <div ref={(el) => { sectionRefs.current[4] = el?.parentElement ?? null; }} />
          <FieldRow>
            <div>
              <Label>Requested Credit Limit</Label>
              <Controller control={control} name="requested_credit_limit" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Under $10K", "$10K–$25K", "$25K–$50K", "$50K–$100K", "Over $100K"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div>
              <Label>Annual Purchasing Volume Estimate</Label>
              <Controller control={control} name="annual_volume_estimate" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Under $50K", "$50K–$150K", "$150K–$500K", "$500K–$1M", "Over $1M"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </FieldRow>

          <div className="mb-4">
            <Label className="mb-2 block">Requested Payment Terms</Label>
            <Controller control={control} name="requested_payment_terms" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-4">
                {["Net 30", "30 Days EOM", "Prepay", "Credit Card"].map((v) => (
                  <div key={v} className="flex items-center gap-1.5"><RadioGroupItem value={v} id={`pt-${v}`} /><Label htmlFor={`pt-${v}`} className="font-normal cursor-pointer">{v}</Label></div>
                ))}
              </RadioGroup>
            )} />
          </div>

          <div className="mb-4">
            <Label className="mb-2 block">Preferred Payment Method</Label>
            <Controller control={control} name="preferred_payment_method" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-4">
                {["Check", "ACH–Wire", "Credit Card", "Other"].map((v) => (
                  <div key={v} className="flex items-center gap-1.5"><RadioGroupItem value={v} id={`pm-${v}`} /><Label htmlFor={`pm-${v}`} className="font-normal cursor-pointer">{v}</Label></div>
                ))}
              </RadioGroup>
            )} />
          </div>
        </SectionCard>

        {/* S6 — Tax & Compliance */}
        <SectionCard index={5} title="Tax & Compliance" id="section-5">
          <div ref={(el) => { sectionRefs.current[5] = el?.parentElement ?? null; }} />
          <div className="mb-4">
            <Label className="mb-2 block">Tax Status</Label>
            <Controller control={control} name="tax_exempt" render={({ field }) => (
              <RadioGroup value={field.value ? "exempt" : "taxable"} onValueChange={(v) => field.onChange(v === "exempt")} className="flex gap-4">
                <div className="flex items-center gap-1.5"><RadioGroupItem value="taxable" id="tax-t" /><Label htmlFor="tax-t" className="font-normal cursor-pointer">Taxable</Label></div>
                <div className="flex items-center gap-1.5"><RadioGroupItem value="exempt" id="tax-e" /><Label htmlFor="tax-e" className="font-normal cursor-pointer">Tax Exempt</Label></div>
              </RadioGroup>
            )} />
          </div>

          <div className="mb-4">
            <Label className="mb-2 block">Resale / Tax Exemption Certificate</Label>
            <Controller control={control} name="resale_certificate_status" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-4">
                {["Will attach", "Will provide within 10 days", "Not applicable"].map((v) => (
                  <div key={v} className="flex items-center gap-1.5"><RadioGroupItem value={v} id={`rc-${v}`} /><Label htmlFor={`rc-${v}`} className="font-normal cursor-pointer">{v}</Label></div>
                ))}
              </RadioGroup>
            )} />
          </div>

          <FieldRow cols={1}>
            <div>
              <Label>State(s) of Resale</Label>
              <Input {...register("resale_states")} placeholder="e.g. TX, CA, NY" />
            </div>
          </FieldRow>

          <InfoBox>
            Please email your W-9 (US) or W-8BEN-E (Canada), along with any applicable resale or GST/HST exemption certificates and your business license to partners@total-filtration.com after submitting this form.
          </InfoBox>
        </SectionCard>

        {/* S7 — Distribution Profile */}
        <SectionCard index={6} title="Distribution Profile" id="section-6">
          <div ref={(el) => { sectionRefs.current[6] = el?.parentElement ?? null; }} />

          <div className="mb-4">
            <Label className="mb-2 block">Geographic Coverage</Label>
            <div className="flex flex-wrap gap-3">
              {GEO_OPTIONS.map((g) => (
                <div key={g} className="flex items-center gap-1.5">
                  <Checkbox checked={geoOptions.selected.includes(g)} onCheckedChange={() => geoOptions.toggle(g)} id={`geo-${g}`} />
                  <Label htmlFor={`geo-${g}`} className="font-normal cursor-pointer">{g}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <Label className="mb-2 block">Primary Sales Channels</Label>
            <div className="flex flex-wrap gap-3">
              {CHANNEL_OPTIONS.map((c) => (
                <div key={c} className="flex items-center gap-1.5">
                  <Checkbox checked={channelOptions.selected.includes(c)} onCheckedChange={() => channelOptions.toggle(c)} id={`ch-${c}`} />
                  <Label htmlFor={`ch-${c}`} className="font-normal cursor-pointer">{c}</Label>
                </div>
              ))}
            </div>
          </div>

          <FieldRow cols={1}>
            <div>
              <Label>Industries / Markets Served</Label>
              <Textarea {...register("industries_served")} rows={3} />
            </div>
          </FieldRow>

          <div className="mb-4">
            <Label className="mb-2 block">Estimated Monthly Order Frequency</Label>
            <Controller control={control} name="monthly_order_frequency" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-4">
                {["1–2/month", "3–5/month", "6–10/month", "10+/month"].map((v) => (
                  <div key={v} className="flex items-center gap-1.5"><RadioGroupItem value={v} id={`mof-${v}`} /><Label htmlFor={`mof-${v}`} className="font-normal cursor-pointer">{v}</Label></div>
                ))}
              </RadioGroup>
            )} />
          </div>

          <FieldRow cols={1}>
            <div>
              <Label>How did you hear about TF USA?</Label>
              <Controller control={control} name="how_heard" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Trade Show", "Sales Rep", "Website", "Referral", "Other"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </FieldRow>
        </SectionCard>

        {/* Submit */}
        <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-medium">
          {submitting ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span>
          ) : (
            "Submit Application →"
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3 mb-8">
          By submitting this form you confirm that all information provided is accurate and you agree to our{" "}
          <a href="/terms" target="_blank" className="underline hover:text-foreground">Terms &amp; Conditions</a>{" "}and{" "}
          <a href="/privacy" target="_blank" className="underline hover:text-foreground">Privacy Policy</a>.
        </p>
      </form>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-8">
        © 2026 Total Filtration USA LLC{" "}
        <span className="mx-1">|</span>{" "}
        <Link to="/privacy" className="hover:text-foreground underline">Privacy Policy</Link>{" "}
        <span className="mx-1">|</span>{" "}
        <Link to="/terms" className="hover:text-foreground underline">Terms &amp; Conditions</Link>
      </footer>
    </div>
  );
}

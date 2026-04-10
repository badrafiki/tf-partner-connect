import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT_LEN = 500;
const MAX_LONG_TEXT_LEN = 2000;

function sanitizeText(val: unknown, maxLen = MAX_TEXT_LEN): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val !== "string") return null;
  return val.trim().slice(0, maxLen) || null;
}

function sanitizeBool(val: unknown): boolean {
  return val === true;
}

const VALID_PAYMENT_TERMS = ["Net 30", "30 Days EOM", "Prepay", "Credit Card"];
const VALID_PAYMENT_METHODS = ["ACH", "Wire Transfer", "Check", "Credit Card"];
const VALID_BUSINESS_TYPES = [
  "Corporation", "LLC", "Partnership", "Sole Proprietorship", "Other",
];
const VALID_SHIPPING_METHODS = [
  "Ground", "2-Day Air", "Next Day Air", "LTL Freight", "Customer carrier",
];

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Required field validation
    const contactEmail = sanitizeText(body.contact_email, 255);
    const contactFirstName = sanitizeText(body.contact_first_name);
    const contactLastName = sanitizeText(body.contact_last_name);
    const legalBusinessName = sanitizeText(body.legal_business_name);

    if (!contactEmail || !contactFirstName || !contactLastName || !legalBusinessName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateEmail(contactEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Rate limiting: max 3 submissions per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("contact_email", contactEmail)
      .gte("submitted_at", oneHourAgo);

    if (countError) {
      console.error("Rate limit check error:", countError);
    } else if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate enum fields
    const requestedPaymentTerms = sanitizeText(body.requested_payment_terms);
    const preferredPaymentMethod = sanitizeText(body.preferred_payment_method);
    const businessType = sanitizeText(body.business_type);
    const shipPreferredMethod = sanitizeText(body.ship_preferred_method);

    if (requestedPaymentTerms && !VALID_PAYMENT_TERMS.includes(requestedPaymentTerms)) {
      return new Response(JSON.stringify({ error: "Invalid payment terms" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build sanitized payload
    const payload: Record<string, unknown> = {
      legal_business_name: legalBusinessName,
      contact_first_name: contactFirstName,
      contact_last_name: contactLastName,
      contact_email: contactEmail,
      trading_name: sanitizeText(body.trading_name),
      date_established: sanitizeText(body.date_established),
      ein: sanitizeText(body.ein, 20),
      business_type: businessType,
      website: sanitizeText(body.website, 255),
      years_in_business: sanitizeText(body.years_in_business, 10),
      primary_phone: sanitizeText(body.primary_phone, 30),
      general_email: sanitizeText(body.general_email, 255),
      reg_address_street: sanitizeText(body.reg_address_street),
      reg_address_city: sanitizeText(body.reg_address_city),
      reg_address_state: sanitizeText(body.reg_address_state, 50),
      reg_address_zip: sanitizeText(body.reg_address_zip, 20),
      primary_address_street: sanitizeText(body.primary_address_street),
      primary_address_city: sanitizeText(body.primary_address_city),
      primary_address_state: sanitizeText(body.primary_address_state, 50),
      primary_address_zip: sanitizeText(body.primary_address_zip, 20),
      contact_title: sanitizeText(body.contact_title),
      contact_department: sanitizeText(body.contact_department),
      contact_direct_phone: sanitizeText(body.contact_direct_phone, 30),
      contact_mobile: sanitizeText(body.contact_mobile, 30),
      ap_same_as_primary: sanitizeBool(body.ap_same_as_primary),
      ap_first_name: sanitizeText(body.ap_first_name),
      ap_last_name: sanitizeText(body.ap_last_name),
      ap_title: sanitizeText(body.ap_title),
      ap_phone: sanitizeText(body.ap_phone, 30),
      ap_email: sanitizeText(body.ap_email, 255),
      ship_same_as_business: sanitizeBool(body.ship_same_as_business),
      ship_address_street: sanitizeText(body.ship_address_street),
      ship_address_city: sanitizeText(body.ship_address_city),
      ship_address_state: sanitizeText(body.ship_address_state, 50),
      ship_address_zip: sanitizeText(body.ship_address_zip, 20),
      ship_additional_locations: sanitizeBool(body.ship_additional_locations),
      ship_preferred_method: shipPreferredMethod,
      ship_carrier_name: sanitizeText(body.ship_carrier_name),
      ship_carrier_account: sanitizeText(body.ship_carrier_account),
      ship_special_instructions: sanitizeText(body.ship_special_instructions, MAX_LONG_TEXT_LEN),
      requested_credit_limit: sanitizeText(body.requested_credit_limit, 50),
      requested_payment_terms: requestedPaymentTerms,
      preferred_payment_method: preferredPaymentMethod,
      annual_volume_estimate: sanitizeText(body.annual_volume_estimate, 50),
      tax_exempt: sanitizeBool(body.tax_exempt),
      resale_certificate_status: sanitizeText(body.resale_certificate_status, 50),
      resale_states: sanitizeText(body.resale_states, MAX_LONG_TEXT_LEN),
      trade_references: body.trade_references ?? null,
      geographic_coverage: sanitizeText(body.geographic_coverage, MAX_LONG_TEXT_LEN),
      sales_channels: sanitizeText(body.sales_channels, MAX_LONG_TEXT_LEN),
      industries_served: sanitizeText(body.industries_served, MAX_LONG_TEXT_LEN),
      monthly_order_frequency: sanitizeText(body.monthly_order_frequency, 50),
      how_heard: sanitizeText(body.how_heard, MAX_LONG_TEXT_LEN),
      status: "pending",
    };

    const { data: inserted, error } = await supabase
      .from("applications")
      .insert(payload)
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to submit application" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire notification (fire and forget)
    supabase.functions.invoke("notify-new-application", {
      body: { application_id: inserted.id },
    }).catch((err: unknown) => console.error("Notification error:", err));

    return new Response(JSON.stringify({ success: true, id: inserted.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in submit-application:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

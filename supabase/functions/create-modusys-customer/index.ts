import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseCreditLimit(value: string | null | undefined): number {
  if (!value) return 0;
  const map: Record<string, number> = {
    "Under $10K": 10000,
    "$10K–$25K": 17500,
    "$25K–$50K": 37500,
    "$50K–$100K": 75000,
    "Over $100K": 100000,
  };
  return map[value] ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", { uid: user.id, r: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { partner_id } = await req.json();
    if (!partner_id) {
      return new Response(JSON.stringify({ error: "partner_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch partner
    const { data: partner, error: partnerErr } = await adminClient
      .from("partners")
      .select("*")
      .eq("id", partner_id)
      .single();
    if (partnerErr || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip test partners — these are portal-only and should not sync to ModuSys
    if (partner.company_name?.toLowerCase().includes("test partner")) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Test partner — not synced to ModuSys" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch linked application by contact_email
    const { data: application } = await adminClient
      .from("applications")
      .select("*")
      .eq("contact_email", partner.contact_email)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build payload
    const payload = {
      company_name: partner.company_name,
      contact_name: partner.contact_name,
      contact_email: partner.contact_email,
      phone: partner.phone || null,
      billing_address_street: application?.reg_address_street || null,
      billing_city: application?.reg_address_city || null,
      billing_state: application?.reg_address_state || partner.state || null,
      billing_zip: application?.reg_address_zip || null,
      payment_terms: application?.requested_payment_terms || "Net 30",
      tax_id: partner.ein || null,
      credit_limit: parseCreditLimit(application?.requested_credit_limit),
      default_discount_percent: partner.discount_percentage,
      is_tax_exempt: application?.tax_exempt || false,
      portal_partner_id: partner.id,
    };

    // Call ModuSys
    const modusysUrl = Deno.env.get("MODUSYS_SUPABASE_URL");
    const integrationSecret = Deno.env.get("INTEGRATION_SECRET");

    if (!modusysUrl || !integrationSecret) {
      throw new Error("Missing MODUSYS_SUPABASE_URL or INTEGRATION_SECRET");
    }

    const response = await fetch(
      `${modusysUrl}/functions/v1/receive-new-customer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-integration-secret": integrationSecret,
        },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      const result = await response.json();
      const modusysCustomerId = result.customer_id;

      // Update partner
      await adminClient
        .from("partners")
        .update({
          modusys_customer_id: modusysCustomerId,
          modusys_synced_at: new Date().toISOString(),
        })
        .eq("id", partner.id);

      // Log success
      await adminClient.from("erp_sync_log").insert({
        event_type: "customer_created",
        direction: "portal_to_modusys",
        entity_type: "partner",
        entity_id: partner.id,
        modusys_entity_id: modusysCustomerId,
        status: "success",
        payload: { company_name: partner.company_name },
      });

      return new Response(
        JSON.stringify({ modusys_customer_id: modusysCustomerId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorText = await response.text();
      const errorMsg = `ModuSys returned ${response.status}: ${errorText.slice(0, 200)}`;

      // Log error
      await adminClient.from("erp_sync_log").insert({
        event_type: "customer_created",
        direction: "portal_to_modusys",
        entity_type: "partner",
        entity_id: partner.id,
        status: "error",
        error_message: errorMsg,
        payload: { company_name: partner.company_name },
      });

      return new Response(
        JSON.stringify({ modusys_customer_id: null, error: errorMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Try to log error
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("erp_sync_log").insert({
        event_type: "customer_created",
        direction: "portal_to_modusys",
        entity_type: "partner",
        status: "error",
        error_message: message,
      });
    } catch {}

    return new Response(
      JSON.stringify({ modusys_customer_id: null, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

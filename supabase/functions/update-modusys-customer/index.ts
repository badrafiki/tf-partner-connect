import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Verify admin
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
    const { data: isAdmin } = await userClient.rpc("has_role", { uid: user.id, r: "admin" });
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

    // If not synced yet, create instead
    if (!partner.modusys_customer_id) {
      const createUrl = `${supabaseUrl}/functions/v1/create-modusys-customer`;
      const createResp = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        },
        body: JSON.stringify({ partner_id }),
      });
      const createResult = await createResp.json();
      return new Response(JSON.stringify(createResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch application for address data
    const { data: application } = await adminClient
      .from("applications")
      .select("*")
      .eq("contact_email", partner.contact_email)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const updatePayload = {
      modusys_customer_id: partner.modusys_customer_id,
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
      default_discount_percent: partner.discount_percentage,
      is_tax_exempt: application?.tax_exempt || false,
    };

    const modusysUrl = Deno.env.get("MODUSYS_SUPABASE_URL");
    const integrationSecret = Deno.env.get("INTEGRATION_SECRET");

    const response = await fetch(
      `${modusysUrl}/functions/v1/update-customer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-integration-secret": integrationSecret!,
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (response.ok) {
      await adminClient
        .from("partners")
        .update({ modusys_synced_at: new Date().toISOString() })
        .eq("id", partner.id);

      await adminClient.from("erp_sync_log").insert({
        event_type: "customer_updated",
        direction: "portal_to_modusys",
        entity_type: "partner",
        entity_id: partner.id,
        modusys_entity_id: partner.modusys_customer_id,
        status: "success",
        payload: { company_name: partner.company_name },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorText = await response.text();
      const errorMsg = `ModuSys returned ${response.status}: ${errorText.slice(0, 200)}`;

      await adminClient.from("erp_sync_log").insert({
        event_type: "customer_updated",
        direction: "portal_to_modusys",
        entity_type: "partner",
        entity_id: partner.id,
        modusys_entity_id: partner.modusys_customer_id,
        status: "error",
        error_message: errorMsg,
        payload: { company_name: partner.company_name },
      });

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

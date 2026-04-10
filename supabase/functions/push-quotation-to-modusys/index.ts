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

    const { quotation_id } = await req.json();
    if (!quotation_id) {
      return new Response(JSON.stringify({ error: "quotation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quotation
    const { data: quotation, error: qtErr } = await adminClient
      .from("quotations")
      .select("*")
      .eq("id", quotation_id)
      .single();
    if (qtErr || !quotation) {
      return new Response(JSON.stringify({ error: "Quotation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch partner
    const { data: partner } = await adminClient
      .from("partners")
      .select("*")
      .eq("id", quotation.partner_id)
      .single();
    if (!partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guard: partner must be synced
    if (!partner.modusys_customer_id) {
      return new Response(
        JSON.stringify({ error: "Partner not synced to ModuSys. Go to Distributors and sync first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch enquiry
    let lineItems: any[] = [];
    if (quotation.enquiry_id) {
      const { data: enquiry } = await adminClient
        .from("enquiries")
        .select("*")
        .eq("id", quotation.enquiry_id)
        .single();
      if (enquiry) {
        lineItems = Array.isArray(enquiry.line_items) ? enquiry.line_items : [];
      }
    }

    // Build payload
    // Generate a quote number: QT-YYYYMMDD-XXXX
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const quoteNumber = `QT-${datePart}-${randPart}`;

    const payload = {
      modusys_customer_id: partner.modusys_customer_id,
      portal_quotation_id: quotation.id,
      quote_number: quoteNumber,
      expires_at: quotation.expires_at,
      discount_percent: partner.discount_percentage,
      notes: quotation.notes || "",
      currency: "USD",
      line_items: lineItems.map((item: any) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.qty || item.quantity,
        list_price_usd: item.listPrice || item.list_price_usd,
        partner_price_usd: item.partnerPrice || item.partner_price_usd,
        line_total_partner: item.lineTotal || item.line_total_partner,
      })),
    };

    // POST to ModuSys
    const modusysUrl = Deno.env.get("MODUSYS_SUPABASE_URL");
    const integrationSecret = Deno.env.get("INTEGRATION_SECRET");

    const targetUrl = `${modusysUrl}/functions/v1/receive-quotation`;
    console.log("Pushing quotation to ModuSys:", targetUrl);
    console.log("Payload:", JSON.stringify(payload));

    const response = await fetch(
      targetUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-integration-secret": integrationSecret!,
        },
        body: JSON.stringify(payload),
      }
    );

    console.log("ModuSys response status:", response.status);

    if (response.ok) {
      const result = await response.json();
      const modusysQuoteId = result.quote_id;

      await adminClient
        .from("quotations")
        .update({
          modusys_quote_id: modusysQuoteId,
          modusys_synced_at: new Date().toISOString(),
        })
        .eq("id", quotation.id);

      await adminClient.from("erp_sync_log").insert({
        event_type: "quotation_pushed",
        direction: "portal_to_modusys",
        entity_type: "quotation",
        entity_id: quotation.id,
        modusys_entity_id: modusysQuoteId,
        status: "success",
        payload: { partner: partner.company_name },
      });

      return new Response(
        JSON.stringify({ modusys_quote_id: modusysQuoteId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorText = await response.text();
      const errorMsg = `ModuSys returned ${response.status}: ${errorText.slice(0, 200)}`;

      await adminClient.from("erp_sync_log").insert({
        event_type: "quotation_pushed",
        direction: "portal_to_modusys",
        entity_type: "quotation",
        entity_id: quotation.id,
        status: "error",
        error_message: errorMsg,
        payload: { partner: partner.company_name },
      });

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

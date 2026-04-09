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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { quotation_id } = await req.json();
    if (!quotation_id) {
      return new Response(JSON.stringify({ error: "quotation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quotation
    const { data: quotation } = await adminClient
      .from("quotations")
      .select("*")
      .eq("id", quotation_id)
      .single();
    if (!quotation) {
      return new Response(JSON.stringify({ error: "Quotation not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch partner
    const { data: partner } = await adminClient
      .from("partners")
      .select("*")
      .eq("id", quotation.partner_id)
      .single();

    if (!partner?.modusys_customer_id) {
      await adminClient.from("erp_sync_log").insert({
        event_type: "order_created",
        direction: "portal_to_modusys",
        entity_type: "order",
        status: "error",
        error_message: "Partner not synced to ModuSys",
        payload: { quotation_id, partner_name: partner?.company_name },
      });
      return new Response(
        JSON.stringify({ error: "Partner not synced" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    const payload = {
      modusys_customer_id: partner.modusys_customer_id,
      modusys_quote_id: quotation.modusys_quote_id || null,
      portal_quotation_id: quotation.id,
      customer_reference: "Portal-" + quotation.id.slice(0, 8).toUpperCase(),
      currency: "USD",
      notes: "Auto-created from TF USA Partner Portal on quotation acceptance.",
      line_items: lineItems.map((item: any) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.qty || item.quantity,
        partner_price_usd: item.partnerPrice || item.partner_price_usd,
        line_total_partner: item.lineTotal || item.line_total_partner,
      })),
    };

    // POST to ModuSys
    const modusysUrl = Deno.env.get("MODUSYS_SUPABASE_URL");
    const integrationSecret = Deno.env.get("INTEGRATION_SECRET");

    const response = await fetch(
      `${modusysUrl}/functions/v1/receive-new-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-integration-secret": integrationSecret!,
        },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      const result = await response.json();

      // Insert portal order
      const { data: order, error: orderErr } = await adminClient
        .from("orders")
        .insert({
          quotation_id: quotation.id,
          partner_id: quotation.partner_id,
          modusys_order_id: result.order_id || null,
          modusys_order_number: result.order_number || null,
          status: "confirmed",
        })
        .select("id")
        .single();

      await adminClient.from("erp_sync_log").insert({
        event_type: "order_created",
        direction: "portal_to_modusys",
        entity_type: "order",
        entity_id: order?.id,
        modusys_entity_id: result.order_id,
        status: "success",
        payload: { partner: partner.company_name, order_number: result.order_number },
      });

      return new Response(
        JSON.stringify({
          portal_order_id: order?.id,
          modusys_order_id: result.order_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorText = await response.text();
      const errorMsg = `ModuSys returned ${response.status}: ${errorText.slice(0, 200)}`;

      // Still create a portal order so the partner can see it
      const { data: order } = await adminClient
        .from("orders")
        .insert({
          quotation_id: quotation.id,
          partner_id: quotation.partner_id,
          status: "confirmed",
        })
        .select("id")
        .single();

      await adminClient.from("erp_sync_log").insert({
        event_type: "order_created",
        direction: "portal_to_modusys",
        entity_type: "order",
        entity_id: order?.id,
        status: "error",
        error_message: errorMsg,
        payload: { partner: partner.company_name },
      });

      return new Response(
        JSON.stringify({ error: errorMsg, portal_order_id: order?.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("erp_sync_log").insert({
        event_type: "order_created",
        direction: "portal_to_modusys",
        entity_type: "order",
        status: "error",
        error_message: message,
      });
    } catch {}

    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

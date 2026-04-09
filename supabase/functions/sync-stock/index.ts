import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-integration-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Step 1: Validate integration secret
  const secret = req.headers.get("x-integration-secret");
  const expected = Deno.env.get("INTEGRATION_SECRET");
  if (!secret || secret !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { items } = await req.json();
    if (!Array.isArray(items)) {
      return new Response(JSON.stringify({ error: "items must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let updated = 0;
    let notFound = 0;

    for (const item of items) {
      const { sku, total_quantity } = item;
      if (!sku || typeof total_quantity !== "number") continue;

      const { data, error } = await supabase
        .from("products")
        .update({ stock_qty: total_quantity, updated_at: new Date().toISOString() })
        .eq("sku", sku)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error(`Error updating SKU ${sku}:`, error.message);
        notFound++;
      } else if (!data) {
        console.warn(`SKU not found in portal: ${sku}`);
        notFound++;
      } else {
        updated++;
      }
    }

    // Log to erp_sync_log
    await supabase.from("erp_sync_log").insert({
      event_type: "stock_sync",
      direction: "modusys_to_portal",
      entity_type: "product",
      status: "success",
      payload: { items, updated, not_found: notFound },
    });

    return new Response(
      JSON.stringify({ updated, not_found: notFound }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("sync-stock error:", err);

    // Try to log error
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("erp_sync_log").insert({
        event_type: "stock_sync",
        direction: "modusys_to_portal",
        entity_type: "product",
        status: "error",
        error_message: err.message,
      });
    } catch (_) { /* best effort */ }

    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

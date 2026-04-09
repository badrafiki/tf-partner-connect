import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    // Step 1: Verify caller is authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleCheck } = await adminClient.rpc("has_role", {
      uid: userId,
      r: "admin",
    });

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Call ModuSys edge function to get stock data
    const modusysUrl = Deno.env.get("MODUSYS_SUPABASE_URL");
    const integrationSecret = Deno.env.get("INTEGRATION_SECRET");

    if (!modusysUrl || !integrationSecret) {
      throw new Error("Missing MODUSYS_SUPABASE_URL or INTEGRATION_SECRET configuration");
    }

    const stockResponse = await fetch(
      `${modusysUrl}/functions/v1/get-stock-levels`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-integration-secret": integrationSecret,
        },
      }
    );

    if (!stockResponse.ok) {
      const errText = await stockResponse.text();
      throw new Error(`ModuSys returned ${stockResponse.status}: ${errText}`);
    }

    const stockData = await stockResponse.json();
    const items: Array<{ sku: string; total_quantity: number }> = stockData.items || [];

    // Step 3: Update portal products by SKU match
    let updated = 0;
    for (const item of items) {
      const { sku, total_quantity } = item;
      if (!sku || typeof total_quantity !== "number") continue;

      const { data } = await adminClient
        .from("products")
        .update({ stock_qty: total_quantity, updated_at: new Date().toISOString() })
        .eq("sku", sku)
        .select("id")
        .maybeSingle();

      if (data) updated++;
    }

    // Step 4: Log to erp_sync_log
    await adminClient.from("erp_sync_log").insert({
      event_type: "stock_sync_pull",
      direction: "modusys_to_portal",
      entity_type: "product",
      status: "success",
      payload: { items_received: items.length, updated },
    });

    // Step 5: Return result
    return new Response(
      JSON.stringify({ updated, timestamp: new Date().toISOString() }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("pull-stock-from-modusys error:", err);

    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("erp_sync_log").insert({
        event_type: "stock_sync_pull",
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

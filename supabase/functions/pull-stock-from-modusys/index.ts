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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { data: isAdmin } = await adminClient.rpc("has_role", {
      uid: user.id,
      r: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call ModuSys push-all-stock function
    const modusysUrl = Deno.env.get("MODUSYS_SUPABASE_URL");
    const integrationSecret = Deno.env.get("INTEGRATION_SECRET");

    if (!modusysUrl || !integrationSecret) {
      throw new Error("Missing MODUSYS_SUPABASE_URL or INTEGRATION_SECRET configuration");
    }

    const stockResponse = await fetch(
      `${modusysUrl}/functions/v1/push-all-stock`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-integration-secret": integrationSecret,
        },
        body: JSON.stringify({}),
      }
    );

    if (!stockResponse.ok) {
      const errText = await stockResponse.text();
      const errorMsg = `ModuSys returned ${stockResponse.status}: ${errText.slice(0, 200)}`;

      await adminClient.from("erp_sync_log").insert({
        event_type: "stock_sync_pull",
        direction: "modusys_to_portal",
        entity_type: "product",
        status: "error",
        error_message: errorMsg,
      });

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ModuSys push-all-stock pushes directly to our sync-stock endpoint.
    // The actual updates happen there. We just need to read the result from
    // the most recent sync-stock log entry to report back to the admin UI.
    const modusysResult = await stockResponse.json();

    // Small delay to let sync-stock finish logging
    await new Promise((r) => setTimeout(r, 1000));

    // Read the latest sync-stock log to get actual results
    const { data: latestSync } = await adminClient
      .from("erp_sync_log")
      .select("payload")
      .eq("event_type", "stock_sync")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const updated = latestSync?.payload?.updated ?? 0;
    const notFound = latestSync?.payload?.not_found ?? 0;
    const itemsReceived = latestSync?.payload?.items?.length ?? 0;

    await adminClient.from("erp_sync_log").insert({
      event_type: "stock_sync_pull",
      direction: "modusys_to_portal",
      entity_type: "product",
      status: "success",
      payload: { items_received: itemsReceived, updated, not_found: notFound },
    });

    return new Response(
      JSON.stringify({ updated, not_found: notFound, items_received: itemsReceived, timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        error_message: err instanceof Error ? err.message : "Unknown error",
      });
    } catch (_) { /* best effort */ }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
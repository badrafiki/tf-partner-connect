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
    const authHeader = req.headers.get("Authorization") ?? "";
    const integrationSecret = req.headers.get("x-integration-secret");
    const expectedSecret = Deno.env.get("INTEGRATION_SECRET");
    const isCronCall = (integrationSecret && integrationSecret === expectedSecret);

    if (!isCronCall) {
      // Normal admin auth check
      if (!authHeader.startsWith("Bearer ")) {
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
      const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = claims.claims.sub as string;

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: isAdmin } = await adminClient.rpc("has_role", {
        uid: userId,
        r: "admin",
      });

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Call ModuSys push-all-products
    const modusysUrl = Deno.env.get("MODUSYS_SUPABASE_URL");
    if (!modusysUrl) {
      return new Response(
        JSON.stringify({ error: "MODUSYS_SUPABASE_URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `${modusysUrl}/functions/v1/push-all-products`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-integration-secret": Deno.env.get("INTEGRATION_SECRET")!,
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      // Log the failure
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("erp_sync_log").insert({
        event_type: "product_sync",
        direction: "modusys_to_portal",
        entity_type: "product",
        status: "error",
        error_message: `ModuSys responded ${response.status}: ${errorText}`,
        payload: { source: "pull-products-from-modusys" },
      });

      return new Response(
        JSON.stringify({
          error: `ModuSys responded ${response.status}: ${errorText}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-integration-secret",
};

interface IncomingProduct {
  modusys_product_id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  family: string | null;
  list_price_usd: number;
  cost_price_usd: number;
  is_active: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Step 1: Validate integration secret
    const secret = req.headers.get("x-integration-secret");
    const expectedSecret = Deno.env.get("INTEGRATION_SECRET");
    if (!secret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Validate body
    const body = await req.json();
    const products: IncomingProduct[] = body?.products;
    if (!Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "products array is required and must be non-empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let upserted = 0;
    let hidden = 0;
    const errors: { sku: string; error: string }[] = [];

    // Step 3: Process each product
    for (const p of products) {
      try {
        if (!p.modusys_product_id || !p.sku || !p.name || p.list_price_usd == null) {
          errors.push({ sku: p.sku ?? "unknown", error: "Missing required fields" });
          continue;
        }

        if (p.is_active) {
          // Upsert active product
          const { error: upsertError } = await adminClient
            .from("products")
            .upsert(
              {
                sku: p.sku,
                name: p.name,
                description: p.description,
                category: p.category,
                family: p.family,
                list_price_usd: p.list_price_usd,
                cost_price_usd: p.cost_price_usd,
                hidden: false,
                modusys_product_id: p.modusys_product_id,
                modusys_synced_at: new Date().toISOString(),
              },
              { onConflict: "modusys_product_id" }
            );

          if (upsertError) {
            errors.push({ sku: p.sku, error: upsertError.message });
          } else {
            upserted++;
          }
        } else {
          // Hide inactive product
          const { data: existing } = await adminClient
            .from("products")
            .select("id")
            .eq("modusys_product_id", p.modusys_product_id)
            .maybeSingle();

          if (existing) {
            const { error: hideError } = await adminClient
              .from("products")
              .update({
                hidden: true,
                modusys_synced_at: new Date().toISOString(),
              })
              .eq("modusys_product_id", p.modusys_product_id);

            if (hideError) {
              errors.push({ sku: p.sku, error: hideError.message });
            } else {
              hidden++;
            }
          }
          // If not found, skip silently
        }
      } catch (itemErr) {
        errors.push({ sku: p.sku ?? "unknown", error: String(itemErr) });
      }
    }

    // Step 5: Log to erp_sync_log
    await adminClient.from("erp_sync_log").insert({
      event_type: "product_sync",
      direction: "modusys_to_portal",
      entity_type: "product",
      status: errors.length === 0 ? "success" : "error",
      error_message: errors.length > 0 ? JSON.stringify(errors) : null,
      payload: {
        upserted,
        hidden,
        errors,
        product_count: products.length,
      },
    });

    // Step 6: Return result
    return new Response(
      JSON.stringify({
        upserted,
        hidden,
        errors,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { wrapEmail, h1, keyValue, dataTable, ctaButton, signoff } from "../_shared/email-wrapper.ts";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Step 1: Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "partner")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: not a partner" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json();
    const { partner_id, line_items, po_reference } = body;

    if (
      !partner_id ||
      !Array.isArray(line_items) ||
      line_items.length === 0
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid request: partner_id and line_items required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate quantities
    for (const item of line_items) {
      if (!item.product_id || !item.quantity || item.quantity < 1 || item.quantity > 999) {
        return new Response(
          JSON.stringify({ error: "Invalid line item: each must have product_id and quantity (1-999)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 2: Fetch partner & verify ownership
    const { data: partner } = await adminClient
      .from("partners")
      .select("id, user_id, discount_percentage, company_name, contact_name, contact_email, assigned_rep, active")
      .eq("id", partner_id)
      .single();

    if (!partner || partner.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: partner mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!partner.active) {
      return new Response(JSON.stringify({ error: "Forbidden: partner account not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Fetch product prices from DB
    const productIds = line_items.map((i: any) => i.product_id);
    const { data: products, error: productsError } = await adminClient
      .from("products")
      .select("id, sku, name, list_price_usd, hidden")
      .in("id", productIds);

    if (productsError || !products) {
      return new Response(JSON.stringify({ error: "Failed to fetch products" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate all products exist and are visible
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of line_items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Product not found: ${item.product_id}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (product.hidden) {
        return new Response(
          JSON.stringify({ error: `Product unavailable: ${product.name}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 4: Calculate totals server-side
    const discountMultiplier = 1 - partner.discount_percentage / 100;
    const enrichedItems = line_items.map((item: any) => {
      const product = productMap.get(item.product_id)!;
      const partnerPrice = product.list_price_usd * discountMultiplier;
      return {
        product_id: item.product_id,
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        list_price_usd: product.list_price_usd,
        partner_price_usd: Math.round(partnerPrice * 100) / 100,
        line_total_list: Math.round(product.list_price_usd * item.quantity * 100) / 100,
        line_total_partner: Math.round(partnerPrice * item.quantity * 100) / 100,
      };
    });

    const total_list_usd = enrichedItems.reduce(
      (s: number, i: any) => s + i.line_total_list,
      0
    );
    const total_partner_usd = enrichedItems.reduce(
      (s: number, i: any) => s + i.line_total_partner,
      0
    );

    // Step 5: Insert enquiry
    const { data: enquiry, error: insertError } = await adminClient
      .from("enquiries")
      .insert({
        partner_id,
        line_items: enrichedItems,
        total_list_usd,
        total_partner_usd,
        status: "submitted",
        notes: po_reference ? `PO Reference: ${po_reference}` : null,
      })
      .select()
      .single();

    if (insertError || !enquiry) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create enquiry" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 6 & 7: Send emails via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const formatUSD = (n: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

      const lineItemsHtml = enrichedItems
        .map(
          (i: any) =>
            `<tr>
              <td style="padding:6px 8px;border:1px solid #ddd;font-family:monospace;font-size:12px">${i.sku}</td>
              <td style="padding:6px 8px;border:1px solid #ddd">${i.name}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${i.quantity}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${formatUSD(i.list_price_usd)}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${formatUSD(i.partner_price_usd)}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${formatUSD(i.line_total_partner)}</td>
            </tr>`
        )
        .join("");

      const tableHtml = `
        <table style="border-collapse:collapse;width:100%;font-size:13px;margin:16px 0">
          <thead>
            <tr style="background:#f4f4f4">
              <th style="padding:8px;border:1px solid #ddd;text-align:left">SKU</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Product</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:center">Qty</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">List</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Partner</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Line Total</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
        </table>`;

      const ref = enquiry.id.slice(0, 8);
      const poLine = po_reference ? `<p><strong>PO Reference:</strong> ${po_reference}</p>` : "";

      // Admin notification email
      const adminHtml = `
        <div style="font-family:Arial,sans-serif;color:#333;max-width:600px">
          <h2 style="color:#1B3A6B">New Enquiry — ${partner.company_name}</h2>
          <p><strong>Reference:</strong> ${ref}</p>
          <p><strong>Partner:</strong> ${partner.company_name} (${partner.contact_name})</p>
          <p><strong>Discount:</strong> ${partner.discount_percentage}%</p>
          ${poLine}
          ${tableHtml}
          <p><strong>List Total:</strong> ${formatUSD(total_list_usd)}</p>
          <p><strong>Partner Total:</strong> ${formatUSD(total_partner_usd)}</p>
          <p style="margin-top:20px"><a href="https://id-preview--de8eed7c-e434-4589-aca0-5dfb303b4ff1.lovable.app/admin/enquiries" style="color:#1B3A6B">View in admin portal →</a></p>
        </div>`;

      // Partner confirmation email
      const partnerHtml = `
        <div style="font-family:Arial,sans-serif;color:#333;max-width:600px">
          <h2 style="color:#1B3A6B">Enquiry Received</h2>
          <p>Dear ${partner.contact_name},</p>
          <p>We've received your enquiry and will respond with a formal quotation within 1–2 business days.</p>
          <p><strong>Enquiry reference:</strong> ${ref}</p>
          ${poLine}
          ${tableHtml}
          <p><strong>Your total:</strong> ${formatUSD(total_partner_usd)}</p>
          <p style="margin-top:20px;color:#666">The TF USA Team</p>
        </div>`;

      const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

      const sendEmail = async (to: string, subject: string, html: string) => {
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          
          if (LOVABLE_API_KEY) {
            // Use connector gateway
            headers["Authorization"] = `Bearer ${LOVABLE_API_KEY}`;
            headers["X-Connection-Api-Key"] = resendApiKey;
            
            await fetch(`${GATEWAY_URL}/emails`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                from: "TF USA Partner Portal <noreply@total-filtration.com>",
                to: [to],
                subject,
                html,
              }),
            });
          } else {
            // Direct Resend API
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                ...headers,
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "TF USA Partner Portal <noreply@total-filtration.com>",
                to: [to],
                subject,
                html,
              }),
            });
          }
        } catch (e) {
          console.error("Email send error:", e);
        }
      };

      // Send both emails (don't block the response)
      await Promise.allSettled([
        sendEmail(
          "partners@total-filtration.com",
          `New Enquiry — ${partner.company_name} — ${ref}`,
          adminHtml
        ),
        sendEmail(
          partner.contact_email,
          `TF USA — Enquiry Received (${ref})`,
          partnerHtml
        ),
      ]);
    }

    // Step 8: Return success
    return new Response(
      JSON.stringify({ enquiry_id: enquiry.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

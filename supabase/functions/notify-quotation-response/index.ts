import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { wrapEmail, h1, keyValue, ctaButton } from "../_shared/email-wrapper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { quotation_id, response, reason } = await req.json();
    if (!quotation_id || !response) {
      return new Response(JSON.stringify({ error: "quotation_id and response required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: quotation } = await supabase
      .from("quotations")
      .select("*")
      .eq("id", quotation_id)
      .single();

    if (!quotation) {
      return new Response(JSON.stringify({ error: "Quotation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: partner } = await supabase
      .from("partners")
      .select("*")
      .eq("id", quotation.partner_id)
      .single();

    const qtRef = "QT-" + quotation.id.slice(0, 8);
    const enqRef = quotation.enquiry_id ? "ENQ-" + quotation.enquiry_id.slice(0, 8) : "N/A";
    const responseLabel = response === "accepted" ? "✅ Accepted" : "❌ Declined";
    const responsePlain = response === "accepted" ? "Accepted" : "Declined";
    const companyName = partner?.company_name || "Unknown";
    const contactName = partner?.contact_name || "Unknown";
    const contactEmail = partner?.contact_email || "Unknown";

    let partnerValue = "N/A";
    if (quotation.enquiry_id) {
      const { data: enq } = await supabase
        .from("enquiries")
        .select("total_partner_usd")
        .eq("id", quotation.enquiry_id)
        .single();
      if (enq?.total_partner_usd) {
        partnerValue = "$" + Number(enq.total_partner_usd).toLocaleString("en-US", { minimumFractionDigits: 2 });
      }
    }

    const body = `
      ${h1(`Quotation ${responsePlain}`)}
      ${keyValue("Quotation", qtRef)}
      ${keyValue("Enquiry", enqRef)}
      ${keyValue("Company", companyName)}
      ${keyValue("Contact", `${contactName} (${contactEmail})`)}
      ${keyValue("Value", partnerValue)}
      ${keyValue("Response", responseLabel)}
      ${reason ? keyValue("Reason", reason) : ""}
      ${keyValue("Timestamp", new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }))}
      ${ctaButton("View in Admin →", "https://partners.total-filtration.com/admin/quotations")}
    `;

    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let url: string;
    if (LOVABLE_API_KEY) {
      headers["Authorization"] = `Bearer ${LOVABLE_API_KEY}`;
      headers["X-Connection-Api-Key"] = resendKey;
      url = `${GATEWAY_URL}/emails`;
    } else {
      headers["Authorization"] = `Bearer ${resendKey}`;
      url = "https://api.resend.com/emails";
    }

    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: "TF USA Portal <notifications@total-filtration.com>",
        to: ["partners@total-filtration.com"],
        subject: `Quotation ${qtRef} ${responsePlain} — ${companyName}`,
        html: wrapEmail(body),
      }),
    });

    // If accepted, fire create-modusys-order (fire and forget)
    if (response === "accepted") {
      fetch(
        `${supabaseUrl}/functions/v1/create-modusys-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ quotation_id }),
        }
      ).catch((err) => console.error("Order creation failed:", err));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

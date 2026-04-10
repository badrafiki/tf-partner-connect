import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { wrapEmail, h1, keyValue, ctaButton, signoff } from "../_shared/email-wrapper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { quotation_id } = await req.json();
    if (!quotation_id) {
      return new Response(JSON.stringify({ error: "quotation_id required" }), {
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

    if (!partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qtRef = "QT-" + quotation.id.slice(0, 8);
    const expiresAt = quotation.expires_at
      ? new Date(quotation.expires_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "Not set";

    const body = `
      ${h1("Quotation Reminder")}
      <p style="font-size:15px;color:#2D2D2D;line-height:1.6;margin:0 0 16px;">Dear ${partner.contact_name},</p>
      <p style="font-size:15px;color:#2D2D2D;line-height:1.6;margin:0 0 16px;">This is a friendly reminder that your quotation <strong style="color:#1B3A6B;">${qtRef}</strong> is awaiting your response.</p>
      <div style="background:#FEF3C7;border-left:3px solid #D97706;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
        <p style="font-size:14px;color:#92400E;margin:0;"><strong>Expires:</strong> ${expiresAt}</p>
      </div>
      <p style="font-size:15px;color:#2D2D2D;line-height:1.6;margin:0 0 16px;">Log in to your partner portal to view and respond to this quotation.</p>
      ${ctaButton("View Quotations →", "https://partners.total-filtration.com/portal/quotations")}
      ${signoff()}
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

    const emailRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: "TF USA <notifications@total-filtration.com>",
        to: [partner.contact_email],
        subject: `Reminder — TF USA Quotation ${qtRef} Awaiting Response`,
        html: wrapEmail(body),
      }),
    });

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

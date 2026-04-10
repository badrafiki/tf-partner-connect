import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { wrapEmail, h1, keyValue, ctaButton, dataTable } from "../_shared/email-wrapper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { application_id } = await req.json();
    if (!application_id) {
      return new Response(JSON.stringify({ error: "application_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: app, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (error || !app) {
      console.error("Failed to fetch application:", error);
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured, skipping email notification");
      return new Response(JSON.stringify({ success: true, email_sent: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = `
      ${h1("New Partner Application")}
      ${keyValue("Company", app.legal_business_name)}
      ${keyValue("Contact", `${app.contact_first_name} ${app.contact_last_name}`)}
      ${keyValue("Email", app.contact_email)}
      ${keyValue("Phone", app.primary_phone || "N/A")}
      ${keyValue("State", app.primary_address_state || app.reg_address_state || "N/A")}
      ${keyValue("Annual Volume", app.annual_volume_estimate || "N/A")}
      ${keyValue("Submitted", new Date(app.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }))}
      ${ctaButton("Review Application →", "https://partners.total-filtration.com/admin/applications")}
    `;

    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let url: string;
    if (LOVABLE_API_KEY) {
      headers["Authorization"] = `Bearer ${LOVABLE_API_KEY}`;
      headers["X-Connection-Api-Key"] = RESEND_API_KEY;
      url = `${GATEWAY_URL}/emails`;
    } else {
      headers["Authorization"] = `Bearer ${RESEND_API_KEY}`;
      url = "https://api.resend.com/emails";
    }

    const emailRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: "TF USA Portal <notifications@total-filtration.com>",
        to: ["partners@total-filtration.com"],
        subject: `New Partner Application — ${app.legal_business_name}`,
        html: wrapEmail(body),
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) console.error("Resend error:", emailData);

    return new Response(JSON.stringify({ success: true, email_sent: emailRes.ok }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in notify-new-application:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

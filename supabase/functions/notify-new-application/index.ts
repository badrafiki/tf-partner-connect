import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const htmlBody = `
      <h2>New Partner Application</h2>
      <table style="border-collapse:collapse; font-family:Arial,sans-serif;">
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Company:</td><td>${app.legal_business_name}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Contact:</td><td>${app.contact_first_name} ${app.contact_last_name}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Email:</td><td>${app.contact_email}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Phone:</td><td>${app.primary_phone || "N/A"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">State:</td><td>${app.primary_address_state || app.reg_address_state || "N/A"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Annual Volume:</td><td>${app.annual_volume_estimate || "N/A"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Submitted:</td><td>${app.submitted_at}</td></tr>
      </table>
      <br/>
      <p><a href="https://partners.total-filtration.com/admin/applications">Review application →</a></p>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TF USA Portal <notifications@total-filtration.com>",
        to: ["partners@total-filtration.com"],
        subject: `New Partner Application — ${app.legal_business_name}`,
        html: htmlBody,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
    }

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

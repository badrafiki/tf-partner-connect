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
      .select("contact_first_name, contact_email")
      .eq("id", application_id)
      .single();

    if (error || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ success: true, email_sent: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const htmlBody = `
      <p>Dear ${app.contact_first_name},</p>
      <p>Thank you for your interest in becoming a TF USA distribution partner.</p>
      <p>After reviewing your application, we are unable to proceed at this time.</p>
      <p>If you have any questions, please contact us at <a href="mailto:partners@total-filtration.com">partners@total-filtration.com</a>.</p>
      <p>The TF USA Team</p>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TF USA Portal <partners@total-filtration.com>",
        to: [app.contact_email],
        subject: "Your TF USA Partner Application",
        html: htmlBody,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) console.error("Resend error:", emailData);

    return new Response(JSON.stringify({ success: true, email_sent: emailRes.ok }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in notify-rejection:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

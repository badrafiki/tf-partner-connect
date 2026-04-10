import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { wrapEmail, h1, signoff } from "../_shared/email-wrapper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { application_id, message } = await req.json();
    if (!application_id || !message) {
      return new Response(JSON.stringify({ error: "application_id and message required" }), {
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

    const body = `
      ${h1("Additional Information Required")}
      <p style="font-size:15px;color:#2D2D2D;line-height:1.6;margin:0 0 16px;">Dear ${app.contact_first_name},</p>
      <p style="font-size:15px;color:#2D2D2D;line-height:1.6;margin:0 0 16px;">Thank you for applying to become a TF USA distribution partner.</p>
      <p style="font-size:15px;color:#2D2D2D;line-height:1.6;margin:0 0 16px;">Our team has reviewed your application and requires some additional information before we can proceed:</p>
      <div style="border-left:3px solid #CC2027;padding:12px 16px;margin:16px 0;background:#F8F9FA;border-radius:0 4px 4px 0;">
        <p style="font-size:14px;color:#2D2D2D;line-height:1.6;margin:0;">${message.replace(/\n/g, "<br/>")}</p>
      </div>
      <p style="font-size:15px;color:#2D2D2D;line-height:1.6;margin:16px 0;">Please reply to this email with the requested information, or contact us at <a href="mailto:partners@total-filtration.com" style="color:#1B3A6B;text-decoration:none;font-weight:600;">partners@total-filtration.com</a>.</p>
      ${signoff()}
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
        from: "TF USA Portal <partners@total-filtration.com>",
        to: [app.contact_email],
        subject: "Your TF USA Partner Application — Additional Information Required",
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
    console.error("Error in notify-info-request:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

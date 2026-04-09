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

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "TF USA <notifications@total-filtration.com>",
        to: [partner.contact_email],
        subject: `Reminder — TF USA Quotation ${qtRef} Awaiting Response`,
        html: `
          <p>Dear ${partner.contact_name},</p>
          <p>This is a friendly reminder that your quotation <strong>${qtRef}</strong> is awaiting your response and expires on <strong>${expiresAt}</strong>.</p>
          <p>Log in to your partner portal to view and respond:</p>
          <p><a href="https://tfusa.lovable.app/portal/quotations">View Quotations</a></p>
          <br>
          <p>The TF USA Team</p>
        `,
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

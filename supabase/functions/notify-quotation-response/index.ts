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

    // Fetch quotation + partner + enquiry
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
    const responseLabel = response === "accepted" ? "Accepted" : "Declined";
    const companyName = partner?.company_name || "Unknown";
    const contactName = partner?.contact_name || "Unknown";
    const contactEmail = partner?.contact_email || "Unknown";

    // Fetch enquiry value
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

    // Send email to admin
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "TF USA Portal <notifications@total-filtration.com>",
        to: ["partners@total-filtration.com"],
        subject: `Quotation ${qtRef} ${responseLabel} — ${companyName}`,
        html: `
          <h2>Quotation ${responseLabel}</h2>
          <p><strong>Quotation:</strong> ${qtRef}</p>
          <p><strong>Enquiry:</strong> ${enqRef}</p>
          <p><strong>Company:</strong> ${companyName}</p>
          <p><strong>Contact:</strong> ${contactName} (${contactEmail})</p>
          <p><strong>Value:</strong> ${partnerValue}</p>
          <p><strong>Response:</strong> ${responseLabel}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p><a href="https://tfusa.lovable.app/admin/quotations">View in admin</a></p>
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

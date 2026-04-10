import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await userClient.rpc("has_role", { uid: user.id, r: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { partner_id, new_email } = await req.json();
    if (!partner_id || !new_email) {
      return new Response(JSON.stringify({ error: "partner_id and new_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(new_email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch partner
    const { data: partner, error: partnerErr } = await adminClient
      .from("partners")
      .select("*")
      .eq("id", partner_id)
      .single();
    if (partnerErr || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!partner.user_id) {
      return new Response(JSON.stringify({ error: "Partner has no linked user account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if new email is already in use
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const emailTaken = existingUsers?.users?.some(
      u => u.email?.toLowerCase() === new_email.toLowerCase() && u.id !== partner.user_id
    );
    if (emailTaken) {
      return new Response(JSON.stringify({ error: "Email already in use by another account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update Supabase Auth email
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      partner.user_id,
      { email: new_email }
    );
    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update portal partners table immediately
    await adminClient
      .from("partners")
      .update({ contact_email: new_email })
      .eq("id", partner_id);

    // If partner is synced to ModuSys, update there too (fire and forget)
    if (partner.modusys_customer_id) {
      try {
        const modusysUrl = Deno.env.get("MODUSYS_SUPABASE_URL");
        const integrationSecret = Deno.env.get("INTEGRATION_SECRET");
        if (modusysUrl && integrationSecret) {
          await fetch(
            `${modusysUrl}/functions/v1/update-customer`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-integration-secret": integrationSecret,
              },
              body: JSON.stringify({
                modusys_customer_id: partner.modusys_customer_id,
                contact_email: new_email,
              }),
            }
          );
        }
      } catch (e) {
        console.error("ModuSys email update failed (non-blocking):", e);
      }
    }

    // Log to erp_sync_log
    await adminClient.from("erp_sync_log").insert({
      event_type: "email_changed",
      direction: "portal_to_modusys",
      entity_type: "partner",
      entity_id: partner_id,
      status: "success",
      payload: {
        old_email: partner.contact_email,
        new_email: new_email,
        partner: partner.company_name,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: `Confirmation email sent to ${new_email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

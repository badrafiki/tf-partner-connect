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
    const { email, partner_id, company_name } = await req.json();
    if (!email || !partner_id) {
      return new Response(JSON.stringify({ error: "email and partner_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let userId: string;

    // Try to invite the user
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/auth/v1/verify?redirect_to=${encodeURIComponent('https://partners.total-filtration.com/reset-password')}`,
    });

    if (inviteError) {
      // User might already exist — try generating a recovery link instead
      if (inviteError.message?.includes("already been registered") || inviteError.message?.includes("already exists")) {
        console.log("User already exists, generating recovery link instead");

        // Look up existing user
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          throw new Error(`Failed to list users: ${listError.message}`);
        }

        const existingUser = existingUsers.users.find((u) => u.email === email);
        if (!existingUser) {
          throw new Error("User reported as existing but not found");
        }

        userId = existingUser.id;

        // Generate a recovery/magic link so they can set their password
        const { error: linkError } = await supabase.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: "https://partners.total-filtration.com/reset-password",
          },
        });

        if (linkError) {
          console.error("Failed to generate recovery link:", linkError);
        }
      } else {
        throw new Error(`Invite failed: ${inviteError.message}`);
      }
    } else {
      userId = inviteData.user.id;
    }

    // Insert role
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "partner" }, { onConflict: "user_id" });

    if (roleError) {
      console.error("Role insert error:", roleError);
      throw new Error(`Failed to set role: ${roleError.message}`);
    }

    // Link partner to user
    const { error: partnerError } = await supabase
      .from("partners")
      .update({ user_id: userId })
      .eq("id", partner_id);

    if (partnerError) {
      console.error("Partner update error:", partnerError);
      throw new Error(`Failed to link partner: ${partnerError.message}`);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in invite-partner:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_GEMS_AMOUNT = 5;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if already claimed
    const { data: profile } = await adminClient
      .from("profiles")
      .select("has_claimed_free_gems")
      .eq("user_id", userId)
      .single();

    if (profile?.has_claimed_free_gems) {
      return new Response(
        JSON.stringify({ error: "Already claimed", code: "ALREADY_CLAIMED" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wipe whatever hidden onboarding gems remain and set balance to exactly 5
    await adminClient
      .from("credits")
      .update({ balance: FREE_GEMS_AMOUNT, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    // Mark as claimed
    await adminClient
      .from("profiles")
      .update({ has_claimed_free_gems: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ success: true, gems_added: FREE_GEMS_AMOUNT, new_balance: FREE_GEMS_AMOUNT }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("claim-free-gems error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to claim gems" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

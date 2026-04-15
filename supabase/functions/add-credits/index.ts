import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IS_DEMO_MODE = (Deno.env.get("IS_DEMO_MODE") ?? "true") === "true";
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const { amount, action } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Test account reset — allowed regardless of demo mode
    if (action === "test_reset") {
      const TEST_EMAIL = "carlsonistrader@gmail.com";
      if (user.email?.toLowerCase() !== TEST_EMAIL) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reset balance to 100 hidden gems
      await adminClient
        .from("credits")
        .update({ balance: 100, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      // Reset onboarding state
      await adminClient
        .from("profiles")
        .update({
          onboarding_complete: false,
          has_claimed_free_gems: false,
          has_used_free_gen: false,
          has_seen_welcome: false,
          has_seen_onboarding: false,
          onboarding_face_regens_used: 0,
          onboarding_angle_regens_used: 0,
          onboarding_body_regens_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true, action: "test_reset" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In production (non-demo), reject direct credit additions.
    // Credits should only be granted via stripe-webhook after payment verification.
    if (!IS_DEMO_MODE) {
      return new Response(JSON.stringify({ error: "Direct credit addition is disabled. Use Stripe checkout." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!amount || typeof amount !== "number" || amount <= 0 || amount > 10000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is still in onboarding — if so, this is their first purchase
    const { data: profile } = await adminClient
      .from("profiles")
      .select("onboarding_complete")
      .eq("user_id", userId)
      .single();

    const wasOnboarding = profile && !profile.onboarding_complete;

    const { data: creditRow } = await adminClient
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    let newBalance: number;
    if (!creditRow) {
      newBalance = amount;
      const { error: insertErr } = await adminClient
        .from("credits")
        .insert({ user_id: userId, balance: newBalance });
      if (insertErr) throw insertErr;
    } else {
      if (wasOnboarding) {
        // First purchase: wipe hidden onboarding gems, start fresh with purchased amount
        newBalance = amount;
      } else {
        newBalance = creditRow.balance + amount;
      }
      const { error: updateErr } = await adminClient
        .from("credits")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (updateErr) throw updateErr;
    }

    // Mark onboarding as complete on first purchase
    if (wasOnboarding) {
      await adminClient
        .from("profiles")
        .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({ success: true, newBalance }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("add-gems error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    let userId: string;

    if (IS_DEMO_MODE) {
      userId = DEMO_USER_ID;
    } else {
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

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claimsData.claims.sub;
    }

    const { amount } = await req.json();
    if (!amount || typeof amount !== "number" || amount <= 0 || amount > 10000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      newBalance = creditRow.balance + amount;
      const { error: updateErr } = await adminClient
        .from("credits")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (updateErr) throw updateErr;
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

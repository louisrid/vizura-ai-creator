import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Top-up credit amounts mapped by price ID env var name
const TOPUP_CREDITS: Record<string, number> = {
  TOPUP_150_PRICE_ID: 150,
  TOPUP_600_PRICE_ID: 600,
  TOPUP_1500_PRICE_ID: 1500,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get or create Stripe customer
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(STRIPE_SECRET_KEY + ":")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: userEmail || "",
          "metadata[user_id]": userId,
        }),
      });
      const customer = await customerRes.json();
      customerId = customer.id;

      await adminClient.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        status: "inactive",
      }, { onConflict: "user_id" });
    }

    const { type, priceId } = await req.json();
    const origin = req.headers.get("origin") || "https://vizura.lovable.app";

    let params: URLSearchParams;

    if (type === "membership") {
      // Membership: recurring subscription
      const membershipPriceId = priceId || Deno.env.get("MEMBERSHIP_PRICE_ID");
      if (!membershipPriceId) throw new Error("MEMBERSHIP_PRICE_ID not configured");

      params = new URLSearchParams({
        "customer": customerId!,
        "mode": "subscription",
        "line_items[0][price]": membershipPriceId,
        "line_items[0][quantity]": "1",
        "success_url": `${origin}/account?checkout=success`,
        "cancel_url": `${origin}/account/membership?checkout=cancel`,
        "metadata[type]": "membership",
        "metadata[user_id]": userId,
        "subscription_data[metadata][user_id]": userId,
        "subscription_data[metadata][type]": "membership",
      });
    } else if (type === "topup") {
      // Top-up: one-time payment
      // priceId here is the env var name like "TOPUP_150_PRICE_ID"
      if (!priceId) throw new Error("priceId required for topup");

      const creditAmount = TOPUP_CREDITS[priceId];
      if (!creditAmount) throw new Error("Invalid topup tier");

      const resolvedPriceId = Deno.env.get(priceId);
      if (!resolvedPriceId) throw new Error(`${priceId} not configured`);

      params = new URLSearchParams({
        "customer": customerId!,
        "mode": "payment",
        "line_items[0][price]": resolvedPriceId,
        "line_items[0][quantity]": "1",
        "success_url": `${origin}/top-ups?checkout=success`,
        "cancel_url": `${origin}/top-ups?checkout=cancel`,
        "metadata[type]": "topup",
        "metadata[user_id]": userId,
        "metadata[credits]": creditAmount.toString(),
      });
    } else {
      throw new Error("Invalid checkout type. Use 'membership' or 'topup'");
    }

    const checkoutRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(STRIPE_SECRET_KEY + ":")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const checkoutSession = await checkoutRes.json();

    if (!checkoutRes.ok) {
      console.error("Stripe checkout error:", checkoutSession);
      throw new Error(`Stripe checkout failed: ${checkoutSession.error?.message}`);
    }

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("checkout error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
